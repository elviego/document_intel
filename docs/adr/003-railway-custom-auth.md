# ADR 003 — Railway PostgreSQL + Custom JWT Auth (replaces Supabase)

**Status:** Accepted  
**Date:** 2026-04-30  
**Supersedes:** ADR 003 — Supabase Auth + Drizzle ORM

## Context

The initial design used Supabase for managed PostgreSQL, authentication (email invite, JWT), and Row Level Security. The decision was made to replace Supabase entirely with Railway (database) and a custom auth implementation in the Fastify API.

## Decision

- **Railway PostgreSQL** — managed Postgres, same free tier footprint, no vendor SDK required in the codebase.
- **Custom JWT auth in Fastify** — `bcryptjs` for password hashing, `@fastify/jwt` for token signing/verification, `resend` for transactional email (invites, password resets).
- **Row Level Security removed** — RLS relied on Supabase's `auth.uid()` function. Authorization is now enforced exclusively by the Fastify `requireRole` middleware in the API layer.
- **`users` table** replaces the dependency on `auth.users`. The table owns email, `password_hash`, `invite_token`, `invite_expires_at`, `is_active`, and `role`.
- **Drizzle Kit** (`drizzle-kit migrate`) replaces the Supabase CLI for running migrations.

## Auth Flow

```
Invite:  Admin POST /v1/auth/invite
          → create user row (is_active=false, invite_token=random)
          → Resend sends email with accept link

Accept:  User POST /v1/auth/accept-invite { token, password }
          → validate token expiry (72h)
          → hash password with bcrypt (cost 12)
          → set is_active=true, clear invite_token

Login:   POST /v1/auth/login { email, password }
          → bcrypt.compare
          → sign JWT { sub, email, role, exp: +8h }
          → client stores token in localStorage

Verify:  Every protected route calls requireAuth → app.jwt.verify(token)
          requireRole checks payload.role against allowed roles
```

## Consequences

- No Supabase SDK in any package. `@supabase/supabase-js` removed from both `apps/web` and `apps/api`.
- The web app authenticates via `POST /v1/auth/login`, stores the JWT in `localStorage`, and sends it as `Authorization: Bearer <token>` on every API request.
- Database migrations are plain SQL files in `db/migrations/`, run with `drizzle-kit migrate` or directly against Railway.
- All authorization logic lives in the API. There is no second enforcement layer at the DB level — test coverage of `requireRole` is therefore important.
