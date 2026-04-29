# ADR 003 — Supabase Auth + Drizzle ORM

**Status:** Accepted  
**Date:** 2026-04-28

## Context
We need managed authentication (email invite flow, JWT), a hosted Postgres database, and type-safe queries.

## Decision
- **Supabase Auth** for authentication: handles email invites, JWTs, and password resets without custom code.
- **Supabase Postgres** as the database: managed, free tier covers this workload.
- **Drizzle ORM** for queries: migration-first, generates TypeScript types from the schema file, produces readable SQL.
- Row Level Security policies enforce role permissions at the database level as a second layer of defence.

## Consequences
- The Node API verifies Supabase JWTs using the shared JWT secret. It does not call Supabase Auth endpoints for every request.
- Drizzle `schema.ts` must stay in sync with SQL migrations. The migration is the source of truth; Drizzle reflects it.
- RLS is a safety net. The API's `requireRole` middleware is the primary enforcement point.
