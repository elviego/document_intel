# ADR 001 — Monorepo with Turborepo + pnpm workspaces

**Status:** Accepted  
**Date:** 2026-04-28

## Context
The project has two deployable apps (web, api) plus shared packages. They need to share TypeScript types without duplication and be built/tested efficiently.

## Decision
Use a pnpm workspace monorepo managed by Turborepo.

## Consequences
- `packages/shared-types` is the single source of truth for DTOs used by both apps.
- `turbo run build` respects the dependency graph and caches unchanged packages.
- Each app is independently deployable; the monorepo is only a development-time concern.
