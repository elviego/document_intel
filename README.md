# Tribo Verde — Financial Tracker

Financial management platform for Tribo Verde school. Tracks income, expenses, salaries, meals, and budget across school years.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| State | TanStack Query |
| i18n | react-i18next (PT / EN) |
| Backend | Node.js · Fastify · TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL on Railway |
| Auth | Custom JWT (bcryptjs + Resend) |
| Email | Resend |
| Monorepo | Turborepo · pnpm workspaces |
| CI/CD | GitHub Actions → Vercel (web) · Railway (api) |

---

## Repository Structure

```
fin-tribe/
├── apps/
│   ├── web/                  # React frontend (port 3000)
│   │   └── src/
│   │       ├── features/     # One folder per module
│   │       ├── components/   # Shared UI (layout, etc.)
│   │       ├── hooks/        # useAuth and other shared hooks
│   │       ├── lib/          # api-client, auth, i18n, React Query
│   │       ├── locales/      # pt.json · en.json
│   │       └── router/       # Route definitions
│   └── api/                  # Fastify REST API (port 4000)
│       ├── drizzle.config.ts
│       └── src/
│           ├── domain/       # Entities · repository interfaces · domain services
│           ├── application/  # Use-cases: Login, InviteUser, AcceptInvite,
│           │                 #   ImportTransactions, ExportTransactions, CopyBudget…
│           ├── infrastructure/
│           │   ├── db/       # Drizzle schema + client
│           │   ├── email/    # IEmailService + ResendEmailService
│           │   ├── repositories/  # Concrete DB implementations
│           │   └── http/     # Fastify app, routes, auth middleware
│           └── shared/       # Env (Zod) · logger · typed errors
├── packages/
│   ├── shared-types/         # DTOs shared between web and api
│   ├── eslint-config/        # Shared lint rules
│   └── tsconfig/             # Shared TS configs (base · node · react)
├── db/
│   ├── migrations/           # Plain SQL migrations (run with drizzle-kit)
│   └── seed/                 # Category seed · school year seed
├── docs/
│   └── adr/                  # Architecture Decision Records
└── .github/workflows/        # CI (lint/typecheck/test) · Deploy
```

---

## Modules

| Module | Path | Access |
|---|---|---|
| Dashboard | `/dashboard` | All |
| Transactions | `/transactions` | All · write: admin, staff |
| Monthly Summary | `/summary` | All |
| Salaries | `/salaries` | Admin |
| Meals | `/meals` | Admin, staff |
| Budget | `/budget` | All · write: admin |
| Categories | `/categories` | Admin |
| Bank Accounts | `/bank-accounts` | Admin |
| School Years | `/school-years` | Admin |
| Users | `/users` | Admin |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A [Railway](https://railway.app) account (free tier)
- A [Resend](https://resend.com) account (free tier — 3 000 emails/month)
- A [Vercel](https://vercel.com) account (free tier, for web deployment)

### 1 — Clone and install

```bash
git clone <repo-url> fin-tribe
cd fin-tribe
pnpm install
```

### 2 — Provision Railway PostgreSQL

1. Create a new Railway project
2. Add a **PostgreSQL** service
3. Copy the `DATABASE_URL` from the Railway dashboard

### 3 — Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**`apps/api/.env`**
```env
DATABASE_URL=postgresql://postgres:[password]@[host].railway.app:5432/railway
JWT_SECRET=<openssl rand -hex 32>
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@triboverde.pt
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000
```

**`apps/web/.env.local`**
```env
VITE_API_URL=http://localhost:4000
```

### 4 — Run migrations and seed

```bash
# Apply schema to Railway PostgreSQL
pnpm db:migrate

# Seed categories, bank accounts, and school year 2025-26
pnpm db:seed
```

### 5 — Run locally

```bash
pnpm dev          # starts web (3000) and api (4000) in parallel via Turborepo
```

Or individually:
```bash
pnpm --filter @fin-tribe/web dev
pnpm --filter @fin-tribe/api dev
```

---

## Database Migrations

Migrations live in `db/migrations/` and are managed with Drizzle Kit.

```bash
# Generate a new migration from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate
```

---

## Auth Flow

| Step | Endpoint | Actor |
|---|---|---|
| Invite user | `POST /v1/auth/invite` | Admin |
| Accept invite + set password | `POST /v1/auth/accept-invite` | Invited user |
| Login | `POST /v1/auth/login` | Any user |
| Get current user | `GET /v1/auth/me` | Authenticated |

Tokens are JWT, signed with `JWT_SECRET`, valid for 8 hours. The web client stores the token in `localStorage` and sends it as `Authorization: Bearer <token>`.

---

## CSV Import / Export

The Movimentos CSV exported from Google Sheets can be imported via the Transactions module.

Expected columns: `Data, Mês, Tipo, Contabilizado?, Valor, Descrição, Doc. Contabilistico, CONTA`

Amount format: `-€1.234,56` (European locale — parsed automatically).

---

## Architecture Decisions

See [`docs/adr/`](docs/adr/):

- [001 — Monorepo with Turborepo](docs/adr/001-monorepo-turborepo.md)
- [002 — Clean Architecture in the API](docs/adr/002-clean-architecture-api.md)
- [003 — Railway PostgreSQL + Custom JWT Auth](docs/adr/003-railway-custom-auth.md)
- [004 — REST API over tRPC](docs/adr/004-rest-api.md)

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access to all modules, user management |
| `staff` | Enter transactions and meals, read-only elsewhere |
| `accountant` | Read-only + CSV export |

Roles are enforced by the Fastify `requireRole` middleware. Admin-only nav items are hidden in the sidebar for non-admin users.

---

## School Year Convention

A school year runs **September 1 → August 31**. The year `2025-26` covers Sep 2025 – Aug 2026. Month labels (`set.25`, `out.25`, …) are derived automatically from the transaction date.

---

## Licence

Private — Tribo Verde internal use only.
