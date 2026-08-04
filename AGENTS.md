# monieplans — Agent Instructions

## Project overview

Full-stack personal finance app:
- **Backend:** NestJS v11 (TypeScript), Drizzle ORM, PostgreSQL, better-auth, Yarn 4
- **Frontend:** React v19, Vite v8, TanStack Router + React Query, Tailwind CSS v4, npm
- **Tests:** Jest + Supertest (backend only; no frontend test framework)

## Commands

### Backend (root)

| Command | What it does |
|---|---|
| `yarn start:dev` | NestJS dev server with watch |
| `yarn test` | Unit tests (`src/**/*.spec.ts`) |
| `yarn test:e2e` | E2E tests (`test/*.e2e-spec.ts`) via Supertest |
| `yarn lint` | ESLint + Prettier fix |
| `yarn build` | `nest build` |
| `yarn db:generate` | Drizzle Kit generate migrations |
| `yarn db:migrate` | Drizzle Kit run migrations |
| `yarn db:seed` | Seed system categories |
| `yarn docker:up` | Start PostgreSQL (Docker Compose) |

### Frontend (`frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | Oxlint |
| `npm run preview` | Vite preview build |

Run backend commands from repo root; run frontend commands from `frontend/` directory.

## Code conventions

- **Backend:** NestJS modules with Drizzle repositories. Validation via `class-validator` + `ValidationPipe`. Auth via better-auth (session cookies, `@CurrentUser()` decorator).
- **Frontend:** File-based routing under `src/routes/`. TanStack Router auto-generates `routeTree.gen.ts`. Data fetching via React Query hooks. Styling via Tailwind utility classes — custom theme tokens in `frontend/src/index.css`.
- **TypeScript:** Use existing patterns in each module. Backend targets ES2023/NodeNext; frontend targets ES2023/bundler.
- **Commit style:** Conventional commits (`feat(scope):`, `fix(scope):`).

## Testing

- Backend unit tests: `src/**/*.spec.ts` — Jest + NestJS `Test.createTestingModule`.
- Backend E2E tests: `test/*.e2e-spec.ts` — Supertest against the full app (seeded test DB).
- Frontend: No test framework configured yet. When adding, use Vitest + React Testing Library to match the Vite ecosystem.

## Database

- PostgreSQL 16 (Docker locally, Render managed DB in production).
- Schema: `src/database/schema/` (Drizzle ORM definitions).
- Migrations: `drizzle/migrations/`.
- Seed: `drizzle/seed.ts` (11 system categories).
- Run `yarn docker:up` before any backend work requiring the DB.

## Multi-step work

When a task spans many steps, maintain `.agent/PROGRESS.md`:

```markdown
# Task: <name>
**Started:** <date>
**Status:** in-progress | blocked | complete
## Objective
...
## Completed Steps
- [x] ...
## Remaining Steps
- [ ] ...
## Key Decisions
- ...
## Current State
<file, symbol, test status>
## Resume Instructions
<steps for a cold session>
```

If context is nearly full, stop new work, fully update `.agent/PROGRESS.md`, and tell the user: *Context is nearly full. State is in `.agent/PROGRESS.md`. New session: say **Resume from .agent/PROGRESS.md**.*
