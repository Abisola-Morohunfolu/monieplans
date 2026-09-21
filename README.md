# monieplans

A calm, zero-based "plan your money" app. You decide what your money is for
(give every dollar a job), log transactions as they happen, and watch the plan
vs. reality.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Hono v4 on Cloudflare Workers, Drizzle ORM, better-auth |
| Frontend | React v19, Vite v8, TanStack Router + React Query, Tailwind CSS v4 |
| Database | Cloudflare D1 (SQLite) |
| Tests | Vitest (backend) · Playwright (e2e) |
| Deployment | Cloudflare Workers (API) + Pages (frontend) |

## Project Structure

```
├── src/                     # Backend (Hono, Cloudflare Workers)
│   ├── auth/                # better-auth (session cookies, OAuth, email)
│   ├── database/schema/     # Drizzle ORM schema (D1/SQLite)
│   ├── routes/              # Hono routers (users, categories, budgets, transactions)
│   └── shared/              # Zod schemas, serializers, pagination, utils
├── frontend/                # React SPA (Vite + TanStack Router)
│   └── src/routes/          # File-based routing
├── drizzle/                 # Drizzle Kit migrations
├── scripts/                 # Seed (system categories)
├── e2e/                     # Playwright end-to-end specs
└── diagrams/                # Data model + flow (Mermaid)
```

## Getting Started

### Prerequisites

- Node.js ≥ 22
- Yarn 4 (backend) · npm (frontend)
- A Cloudflare account (for `wrangler dev` / deploy)

### 1. Backend Setup

```bash
yarn install

# Copy env template
cp .env.example .dev.vars

# Apply local D1 migrations + seed system categories
yarn db:migrate:local
yarn db:seed:local

# Start dev server
yarn dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Commands

### Backend (repo root)

| Command | Description |
|---|---|
| `yarn dev` | Workers dev server (`wrangler dev`) |
| `yarn deploy` | Deploy to Cloudflare Workers |
| `yarn test` | Vitest unit tests |
| `yarn test:e2e` | Playwright e2e tests |
| `yarn lint` | ESLint + Prettier fix |
| `yarn typecheck` | TypeScript type check |
| `yarn db:generate` | Generate Drizzle migrations |
| `yarn db:migrate:local` / `:remote` | Apply D1 migrations |
| `yarn db:seed:local` / `:remote` | Seed system categories |
| `yarn db:studio` | Drizzle Kit studio |

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | Oxlint |

## Data model

Money is stored as integer cents. `Available` and totals are computed on read
(`assigned − SUM(transactions)`), never cached. See [`PRD.md`](./PRD.md) and
`diagrams/data-model.mmd` for the full schema.

## Deployment

- **API:** Cloudflare Workers (`monieplans-api`), via `yarn deploy`
  (GitHub Actions `deploy.yml`).
- **Frontend:** Cloudflare Pages (`monieplans.pages.dev`).
