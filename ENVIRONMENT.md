# Environment variables — reference

Every variable accepted by the platform, what it's for, where it's read, and whether it ships to the browser. Copy `.env.example` → `.env.local` and fill in the values relevant to your deployment.

> **Naming convention.** `NEXT_PUBLIC_*` variables are **inlined into the client bundle** at build time and become visible in the browser. Everything without that prefix stays server-side. Never put a secret behind a `NEXT_PUBLIC_*` name.

---

## Supabase (database, auth, storage)

| Variable | Required | Where read | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | `src/lib/supabase.ts`, `src/lib/supabase-public.ts` | `https://<project-ref>.supabase.co` from the Supabase dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | same | Public anon key. Safe to ship to the browser; RLS gates the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-only routes that need to bypass RLS | **Never** prefix with `NEXT_PUBLIC_`. Used for admin sync jobs, migrations, server-side seeding. |
| `NEXT_PUBLIC_DEMO_MODE` | No | `src/lib/supabase.ts` | Set to `true` to skip Supabase entirely and use in-memory demo data. Defaults to `true` if Supabase URL/key are blank. |

---

## Branding

| Variable | Where read | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Page titles, navbar | Defaults to "Health and Nursing Research Unit". |
| `NEXT_PUBLIC_HOSPITAL_NAME` | Headers, report exports | Defaults to "Prince Mohammed Bin Nasser Hospital". |
| `NEXT_PUBLIC_HOSPITAL_LOCATION` | Subtitles, exports | Defaults to "Jazan, Kingdom of Saudi Arabia". |
| `NEXT_PUBLIC_APP_URL` | OAuth callbacks, email links | Set to the canonical public URL, e.g. `https://research.pmnh.gov.sa`. |

---

## Email delivery (optional)

Configure if you want password-reset emails, account-creation emails, and report delivery to work.

| Variable | Example | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.office365.com` | Hospital relay or transactional provider (SES, SendGrid, Postmark…). |
| `SMTP_PORT` | `587` | 587 for STARTTLS, 465 for implicit TLS. |
| `SMTP_USER` | `noreply@pmnh.gov.sa` | Send-as identity. |
| `SMTP_PASSWORD` | (secret) | Store in your secrets manager — never commit. |
| `SMTP_FROM` | `PMNH Research <noreply@pmnh.gov.sa>` | RFC-5322 from header. |

---

## SMS / OTP (optional)

| Variable | Notes |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS OTP. |
| `TWILIO_AUTH_TOKEN` | Server-only token. |
| `TWILIO_PHONE_NUMBER` | E.164 sender, e.g. `+966500000000`. |

---

## File storage

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_STORAGE_BUCKET` | `research-files` | Supabase Storage bucket name used by the file-uploads page. |
| `MAX_FILE_SIZE_MB` | `50` | Server-enforced ceiling. The browser also enforces 5 MB during inline-preview uploads. |

---

## Security

| Variable | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | Yes (prod) | 32-byte random string — `openssl rand -hex 32`. Used to sign session cookies. |
| `JWT_SECRET` | Yes (prod) | Separate 32-byte secret used by server-side API routes that mint short-lived tokens. |
| `SESSION_TIMEOUT_MINUTES` | `60` | Idle-timeout enforced by middleware. |

---

## Feature flags

| Variable | Default | What it gates |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_AI_FEATURES` | `true` | Shows the AI Insights module + dashboard widgets. |
| `NEXT_PUBLIC_ENABLE_SMS_OTP` | `false` | Adds SMS as a second factor on login. Requires Twilio vars. |
| `NEXT_PUBLIC_ENABLE_EMAIL_NOTIFICATIONS` | `true` | Master toggle for email channel — requires SMTP_* set. |

---

## Operational hints

* **Local dev** — `cp .env.example .env.local` and leave Supabase blank; the app boots straight into demo mode.
* **CI** — set `NEXT_PUBLIC_DEMO_MODE=true` so the build doesn't try to reach Supabase. The GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) already does this.
* **Docker** — `NEXT_PUBLIC_*` vars must be passed as `--build-arg` (they're inlined at build time, not at runtime). Server-only secrets should be passed as `-e` at `docker run` time. See [`docker-compose.yml`](docker-compose.yml).
* **Secrets rotation** — `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `JWT_SECRET`, SMTP password, and Twilio token are all rotation candidates. Rotate at least every 12 months and immediately on personnel change.
