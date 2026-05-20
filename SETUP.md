# PMNH Jazan Research Portal — Setup Instructions

## Health & Nursing Research Unit
### Prince Mohammed Bin Nasser Hospital, Jazan, Saudi Arabia

---

## Quick Start (Demo Mode)

The application runs in **Demo Mode** out of the box — no database setup required.

```bash
# 1. Navigate to project directory
cd hospital-research-portal

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000
```

### Demo Login Credentials
| Username | Password | Role |
|---|---|---|
| `research-unit PMNH` | `PMNH@Research2024!` | Administrator |
| `dr.fatima.director` | `demo` | Research Director |
| `dr.khalid.surgery` | `demo` | Department Head |
| `sara.coordinator` | `demo` | Research Coordinator |

**Public Visitor Portal:** Visit `http://localhost:3000/visitor` (no login required)

---

## Full Production Setup with Supabase

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your Project URL and API Keys

### 2. Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Setup Database Schema
1. Open Supabase Dashboard → SQL Editor
2. Copy and run the contents of `supabase/schema.sql`
3. This creates all tables, indexes, RLS policies, and seeds departments

### 4. Create Admin User
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → Enter email, set password
3. Copy the user's UUID
4. Run in SQL Editor:
```sql
INSERT INTO profiles (id, username, full_name, email, role, is_active, email_verified)
VALUES ('YOUR-USER-UUID', 'research-unit PMNH', 'Dr. Admin Name', 'admin@pmnh.gov.sa', 'admin', true, true);
```

### 5. Setup Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create bucket named `research-files`
3. Set as private bucket
4. Add RLS policies for authenticated users

### 6. Run Seed Data (Optional)
Run `supabase/seed-demo-data.sql` in SQL Editor for demo data.

---

## Application Structure

```
hospital-research-portal/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, forgot password
│   │   ├── (dashboard)/     # Protected app pages
│   │   │   ├── dashboard/   # Executive dashboard
│   │   │   ├── research/    # Research database
│   │   │   ├── workflow/    # Kanban board
│   │   │   ├── publications/
│   │   │   ├── qr-codes/
│   │   │   ├── departments/
│   │   │   ├── users/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   ├── ai-insights/
│   │   │   ├── activity-logs/
│   │   │   ├── storage/
│   │   │   └── settings/
│   │   └── visitor/         # Public portal (no login)
│   ├── components/
│   │   ├── layout/          # Sidebar, TopBar
│   │   └── dashboard/       # StatCard, Charts
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── auth-store.ts    # Zustand auth state
│   │   ├── demo-data.ts     # Demo/seed data
│   │   └── utils.ts         # Utilities
│   └── types/               # TypeScript types
├── supabase/
│   ├── schema.sql           # Database schema
│   └── seed-demo-data.sql   # Demo data
└── .env.example
```

---

## Pages & Features

| Page | URL | Description |
|---|---|---|
| Login | `/login` | Secure portal login |
| Forgot Password | `/forgot-password` | Email/SMS OTP recovery |
| Dashboard | `/dashboard` | Executive analytics dashboard |
| Research Database | `/research` | All research projects |
| Add Research | `/research/new` | Multi-step research form |
| Research Detail | `/research/[id]` | Full project view |
| Workflow Board | `/workflow` | Kanban + timeline view |
| Publications | `/publications` | Published papers analytics |
| QR Codes | `/qr-codes` | Generate/scan QR codes |
| Departments | `/departments` | Department management |
| Users & Roles | `/users` | User management |
| Reports | `/reports` | Generate & export reports |
| Notifications | `/notifications` | Alert center |
| AI Insights | `/ai-insights` | Smart analytics & predictions |
| Activity Logs | `/activity-logs` | Full audit trail |
| File Storage | `/storage` | Document management |
| Settings | `/settings` | Profile, security, preferences |
| Visitor Portal | `/visitor` | Public read-only portal |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| QR Codes | react-qr-code |
| Backend/Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| File Storage | Supabase Storage |
| Toast Notifications | React Hot Toast |

---

## Security Features

- ✅ Role-based access control (6 roles)
- ✅ Encrypted passwords via Supabase Auth
- ✅ Row Level Security (RLS) policies
- ✅ Session management with auto-timeout
- ✅ Failed login protection
- ✅ Email verification support
- ✅ SMS OTP support (requires Twilio)
- ✅ Activity audit logs
- ✅ Visitor mode restrictions
- ✅ Confidential file access control

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full system access, user management, settings |
| **Research Director** | All research, reports, analytics |
| **Department Head** | Department research, approvals, reports |
| **Research Coordinator** | Add/update research, upload files, reports |
| **Authorized Staff** | Submit research, view own projects |
| **Viewer/Visitor** | Public research only (visitor portal) |

---

## Production Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```
Add environment variables in Vercel dashboard.

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Support

For technical issues or customizations:
- Review the codebase structure above
- Check `src/lib/demo-data.ts` for sample data structure
- Refer to `supabase/schema.sql` for database structure

---

*PMNH Jazan Research Portal — Enterprise Hospital Research Management System*
*© 2026 Prince Mohammed Bin Nasser Hospital, Jazan, Saudi Arabia*
