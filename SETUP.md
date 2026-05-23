# PMNH Jazan Research Portal — Setup

**Health & Nursing Research Unit · Prince Mohammed Bin Nasser Hospital · Jazan**

This document walks through three deployment paths: local demo mode (no backend), local with a live Supabase project, and containerized production via Docker.

For variable-by-variable detail, see [`ENVIRONMENT.md`](./ENVIRONMENT.md).

---

## 1. Quick start — demo mode (no Supabase needed)

```bash
git clone https://github.com/solu17000-source/hospital-research-portal.git
cd hospital-research-portal
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Initial accounts (demo)

The two spec-required accounts are seeded and accept the initial password `ASas123456ASas`. Both have `login_count: 0`, so first sign-in is forced through the `/change-password` flow before the dashboard is reachable.

| Role | Username | Initial password |
|---|---|---|
| **Super Admin** | `sultan.alallah` | `ASas123456ASas` |
| **Admin** | `afnan.bakri` | `ASas123456ASas` |

Anyone can also enter via **Continue as Visitor** on the login page — that sets a `pmnh-visitor` cookie that the middleware uses to gate every protected route.

---

## 2. Full setup — with a real Supabase project

### 2.1 Create the Supabase project

1. Sign in to [supabase.com](https://supabase.com) → **New Project**.
2. Pick a strong DB password (store in your secrets manager — Supabase doesn't show it again).
3. Choose the closest region (Frankfurt or Bahrain for Jazan).
4. Wait for provisioning to finish, then go to **Project Settings → API** and note:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never to the browser)

### 2.2 Apply the schema

```bash
# In Supabase Dashboard → SQL Editor, paste the contents of:
supabase/schema.sql
```

This creates: `departments`, `profiles`, `research_projects`, `qr_codes`, `notifications`, `reports`, `activity_logs`, `system_settings`, the JWT helper functions, and Row-Level Security policies on every sensitive table.

### 2.3 Seed the two initial accounts

1. **Auth → Users → Add user** in the Supabase dashboard, creating two users with the emails from the demo seeds:
   - `admin@pmnh.gov.sa` (Sultan Alallah) — initial password `ASas123456ASas`
   - `bkriafnan@gmail.com` (Afnan Bakri) — initial password `ASas123456ASas`
2. Copy the UUID of each created user, then run in SQL Editor:

```sql
INSERT INTO profiles (id, username, full_name, email, role, is_active, email_verified, login_count)
VALUES
  ('<sultan-uuid>', 'sultan.alallah', 'Sultan Alallah', 'admin@pmnh.gov.sa',  'super_admin', true, true, 0),
  ('<afnan-uuid>',  'afnan.bakri',    'Afnan Bakri',   'bkriafnan@gmail.com','admin',       true, true, 0);
```

`login_count = 0` triggers the forced-change-password flow on first sign-in. The `username` column has a `UNIQUE` constraint, so duplicates are blocked at the database level.

### 2.4 Create the Storage bucket

1. **Storage → New bucket** → name `research-files` → **Private**.
2. Add an RLS policy so authenticated users can upload to their own folder:

```sql
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'research-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 2.5 Wire `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only
NEXT_PUBLIC_DEMO_MODE=false

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Health and Nursing Research Unit"
NEXT_PUBLIC_HOSPITAL_NAME="Prince Mohammed Bin Nasser Hospital"
NEXT_PUBLIC_HOSPITAL_LOCATION="Jazan, Kingdom of Saudi Arabia"

NEXTAUTH_SECRET=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
```

Restart `npm run dev` so Next picks up the new vars.

---

## 3. Docker — production-style local run

```bash
# Build + run
docker compose up -d

# Tail logs
docker compose logs -f portal

# Stop
docker compose down
```

The compose file:
- Builds a multi-stage image with `node:20-alpine` (final image ≈ 180 MB).
- Runs as a non-root user (`nextjs:1001`).
- Reads `NEXT_PUBLIC_*` vars as build args (inlined into the bundle).
- Reads server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, SMTP, Twilio, JWT) at runtime.
- Mounts `/tmp` as tmpfs, drops all Linux capabilities, sets `no-new-privileges` — minimum attack surface.

### Build args you can override

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh... \
NEXT_PUBLIC_DEMO_MODE=false \
docker compose up -d --build
```

---

## 4. CI / CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR:

1. **verify** — `npm ci` → `tsc --noEmit` → `next lint --max-warnings 0` → `next build` (in demo mode, no Supabase needed).
2. **docker** — builds the image and smoke-tests it inside the runner. Only runs on push-to-main or PRs that touched the Dockerfile.

Builds cache via GHA cache so subsequent runs are 2–4× faster.

### Going from CI to deploy

The compose file is the unit of production deployment. Plug it into any host:

| Host | How |
|---|---|
| **Vercel** | Use Vercel's native Next.js adapter — skip Docker entirely. Set env vars in Project Settings. |
| **Self-hosted Ubuntu / RHEL** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`, behind nginx/Caddy with TLS termination + the CSP header. |
| **Azure / AWS / GCP** | Push the image to ACR / ECR / GAR. Deploy to App Service / ECS / Cloud Run. Wire env vars from the platform's secrets store. |

---

## 5. Production checklist before go-live

* [ ] `NEXT_PUBLIC_DEMO_MODE=false` in production
* [ ] Supabase project created, schema applied, RLS verified
* [ ] Both initial admin profiles seeded with `login_count = 0`
* [ ] Storage bucket created with RLS policies
* [ ] `NEXTAUTH_SECRET` and `JWT_SECRET` rotated to 32-byte random values
* [ ] SMTP credentials set if you want password-reset emails to send
* [ ] CSP set at the reverse proxy (Next.config skips it because dev mode requires `unsafe-inline`)
* [ ] HTTPS / TLS terminated at the proxy — the HSTS header we emit assumes HTTPS only
* [ ] Automated DB backups configured in Supabase
* [ ] First-login forced password change tested with each initial account
* [ ] Public/visitor portal verified read-only — try to deep-link `/dashboard` while in visitor mode (should bounce to `/visitor?blocked=1`)

---

## Support

For internal escalation, contact the Research Unit at `research@pmnh.gov.sa`. For platform-level issues, open a GitHub issue against `solu17000-source/hospital-research-portal`.
