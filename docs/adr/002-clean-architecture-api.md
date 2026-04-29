# ADR 002 — Clean Architecture in the API

**Status:** Accepted  
**Date:** 2026-04-28

## Context
Business logic (meal billing, budget copy, salary→transaction sync, CSV import/export) must be testable independently of the web framework and database driver.

## Decision
Apply Clean Architecture with four layers:

| Layer | Rule |
|---|---|
| `domain/` | No imports from outer layers. Pure TypeScript. |
| `application/` | Imports domain only. One use-case per file. |
| `infrastructure/` | Implements domain repository interfaces. |
| `shared/` | Cross-cutting: env, logger, errors. No business logic. |

## Consequences
- Domain services and use-cases are unit-testable with mock repositories.
- Switching from Supabase Postgres to another DB only requires re-implementing the repository layer.
- Fastify is a delivery mechanism; it lives entirely in `infrastructure/http/`.
