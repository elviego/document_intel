# ADR 004 — REST API over tRPC

**Status:** Accepted  
**Date:** 2026-04-28

## Context
tRPC was considered for end-to-end type safety. The team opted for REST.

## Decision
Use REST with JSON over HTTP. Shared types live in `packages/shared-types` and are manually kept in sync between the web client and API.

## Consequences
- The API is callable by non-TypeScript clients (e.g. the accountant's tooling, future mobile app).
- `packages/shared-types` must be updated when API contracts change. This is a manual step but visible via TypeScript errors in the web app at build time.
- Route versioning (`/v1/`) allows non-breaking additions without coordination.
