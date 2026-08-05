# monieplans — Agent Instructions

## Project overview

Full-stack personal finance app:
- **Backend:** Hono v4 on Cloudflare Workers, Drizzle ORM, D1 (SQLite), better-auth, Yarn 4
- **Frontend:** React v19, Vite v8, TanStack Router + React Query, Tailwind CSS v4, npm
- **Tests:** Vitest
- **CI/CD:** GitHub Actions → Cloudflare Workers + Pages

## Commands

### Backend (root)

| Command | What it does |
|---|---|
| `yarn dev` | Start Workers dev server (wrangler dev) |
| `yarn deploy` | Deploy to Cloudflare Workers |
| `yarn test` | Run Vitest tests |
| `yarn test:watch` | Vitest in watch mode |
| `yarn lint` | ESLint + Prettier fix |
| `yarn format` | Prettier format |
| `yarn typecheck` | TypeScript type check |
| `yarn db:generate` | Drizzle Kit generate migrations |
| `yarn db:migrate:local` | Apply D1 migrations locally (run after db:generate) |
| `yarn db:migrate:remote` | Apply D1 migrations on Cloudflare |
| `yarn db:seed:local` | Seed system categories (local D1) |
| `yarn db:seed:remote` | Seed system categories (remote D1) |
| `yarn db:studio` | Drizzle Kit studio |

### Frontend (`frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | Oxlint |
| `npm run preview` | Vite preview build |

Run backend commands from repo root; run frontend commands from `frontend/` directory.

## Code conventions

- **Backend:** Hono routers in `src/routes/`, Drizzle ORM with D1, Zod validation, better-auth middleware.
- **Frontend:** File-based routing under `src/routes/`. TanStack Router auto-generates `routeTree.gen.ts`. Styling via Tailwind utility classes.
- **TypeScript:** ES2023/bundler module resolution. Shared utilities in `src/shared/`.
- **Currency:** All amounts stored as integer cents in D1. Converted to/from display amounts at the API boundary.
- **Commit style:** Conventional commits (`feat(scope):`, `fix(scope):`).

## Testing

- Backend: Vitest. Tests in `src/**/*.test.ts`. Run via `yarn test`.
- Frontend: No test framework configured yet.

## Database

- D1 (Cloudflare's managed SQLite). Local dev via Miniflare (embedded in wrangler dev).
- Schema: `src/database/schema/` (Drizzle ORM definitions for sqlite-core).
- Migrations: `drizzle/migrations/` (SQL).
- Seed: 11 system categories via `scripts/seed.sql` or `db:seed:local`.

## Multi-step work

When a task spans many steps, maintain `.agent/PROGRESS.md`.
