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
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email invite) |
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
│   │       ├── components/   # Shared UI
│   │       ├── lib/          # API client, i18n, Supabase, React Query
│   │       ├── locales/      # pt.json · en.json
│   │       └── router/       # Route definitions
│   └── api/                  # Fastify REST API (port 4000)
│       └── src/
│           ├── domain/       # Entities · repository interfaces · domain services
│           ├── application/  # Use-cases (one file each)
│           ├── infrastructure/  # DB · HTTP routes · auth middleware
│           └── shared/       # Env · logger · errors
├── packages/
│   ├── shared-types/         # DTOs shared between web and api
│   ├── eslint-config/        # Shared lint rules
│   └── tsconfig/             # Shared TS configs (base · node · react)
├── supabase/
│   ├── migrations/           # Versioned SQL (run in order)
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
- Supabase CLI (`brew install supabase/tap/supabase`)

### 1 — Install dependencies

```bash
pnpm install
```

### 2 — Configure environment

```bash
# apps/api/.env
cp apps/api/.env.example apps/api/.env

# apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local
```

**`apps/api/.env`**
```
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]
JWT_SECRET=[supabase-jwt-secret]
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

**`apps/web/.env.local`**
```
VITE_SUPABASE_URL=https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_API_URL=http://localhost:4000
```

### 3 — Set up the database

```bash
# Push migrations and seed
supabase db push
pnpm db:seed
```

### 4 — Run locally

```bash
pnpm dev          # starts both web (3000) and api (4000) via Turborepo
```

Or individually:

```bash
pnpm --filter @fin-tribe/web dev
pnpm --filter @fin-tribe/api dev
```

---

## Database Migrations

Migrations live in `supabase/migrations/` and are run in order by `supabase db push`.

To create a new migration:

```bash
supabase migration new <description>
# Edit the generated file in supabase/migrations/
supabase db push
```

---

## CSV Import

The Movimentos CSV exported from Google Sheets can be imported via the Transactions module.

Expected columns: `Data, Mês, Tipo, Contabilizado?, Valor, Descrição, Doc. Contabilistico, CONTA`

Amount format: `-€1.234,56` (European locale — parsed automatically).

---

## Architecture Decisions

See [`docs/adr/`](docs/adr/) for the full set of ADRs:

- [001 — Monorepo with Turborepo](docs/adr/001-monorepo-turborepo.md)
- [002 — Clean Architecture in the API](docs/adr/002-clean-architecture-api.md)
- [003 — Supabase Auth + Drizzle ORM](docs/adr/003-supabase-auth-drizzle.md)
- [004 — REST API over tRPC](docs/adr/004-rest-api.md)

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access to all modules, user management |
| `staff` | Enter transactions and meals, read-only elsewhere |
| `accountant` | Read-only + CSV export |

Roles are enforced at two levels: Fastify middleware (`requireRole`) and Supabase Row Level Security policies.

---

## School Year Convention

A school year runs **September 1 → August 31**. The year `2025-26` covers Sep 2025 – Aug 2026. When entering a transaction, the month label (`set.25`, `out.25`, …) is derived automatically from the date.

---

## Licence

Private — Tribo Verde internal use only.
