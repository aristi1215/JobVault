# AGENTS.md

## Cursor Cloud specific instructions

### Overview

JobVault is a privacy-first job application tracker. The monorepo uses npm workspaces with two main dev services:

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Web (Next.js 16 + React 19) | `npm run dev:web` | 3000 | Uses seeded mock data in-browser; not yet wired to the API |
| API (Node.js HTTP server) | `npm run dev:api` | 4100 | In-memory store, no external DB needed. Uses `tsx watch` for hot reload |

Standard commands for lint, test, and build are in root `package.json`:

- **Lint:** `npm run lint` (runs ESLint on web, `tsc --noEmit` on api)
- **Test:** `npm run test` (runs API parser tests via `tsx`)
- **Build:** `npm run build` (builds web with `next build`, api with `tsc`)

### Gotchas

- The `apps/web/` directory may contain a stale `package-lock.json`. If `npm run build` fails with lightningcss or `@tailwindcss/oxide` native binding errors, delete `package-lock.json` and `node_modules` at both root and `apps/web/`, then run `npm install` from root. This is a known npm workspaces bug with optional native dependencies.
- The API uses a hardcoded `demo-user` userId for local development — no auth setup needed.
- The web frontend currently uses inline seeded state and is not wired to the API. Both services can be tested independently.
- Node.js >= 20 is required (see `engines` in root `package.json`).
