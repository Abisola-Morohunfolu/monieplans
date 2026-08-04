# monieplans

Your personal finance copilot. Manage budgets, track expenses, and reach your goals.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS v11, TypeScript, Drizzle ORM, better-auth |
| Frontend | React v19, Vite v8, TanStack Router, React Query, Tailwind CSS v4 |
| Database | PostgreSQL 16 |
| Deployment | Render.com |

## Project Structure

```
├── src/                     # Backend (NestJS)
│   ├── analytics/           # Spending insights & recommendations
│   ├── auth/                # better-auth (session cookies)
│   ├── budget/              # Budget periods, activation, weekly allocations
│   ├── categories/          # System + user categories
│   ├── database/            # Drizzle ORM schema & provider
│   ├── expenses/            # Expense CRUD, receipt uploads & parsing
│   ├── fixed-expenses/      # Recurring fixed expenses
│   ├── goals/               # Savings goals
│   ├── statements/          # CSV bank statement import
│   └── users/               # User profiles
├── frontend/                # React SPA
│   └── src/routes/          # File-based routing (TanStack Router)
├── drizzle/                 # Drizzle Kit migrations & seed
├── test/                    # E2E tests (Jest + Supertest)
└── uploads/                 # Local file storage (receipts, statements)
```

## Getting Started

### Prerequisites

- Node.js ≥ 22
- [Docker](https://www.docker.com/) (for local PostgreSQL)
- Yarn (for backend)

### 1. Backend Setup

```bash
# Install dependencies
yarn install

# Copy env template
cp .env.example .env

# Start PostgreSQL
yarn docker:up

# Run migrations & seed system categories
yarn db:setup

# Start dev server
yarn start:dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Commands

### Backend

| Command | Description |
|---|---|
| `yarn start:dev` | Dev server with watch |
| `yarn build` | Production build |
| `yarn test` | Unit tests |
| `yarn test:e2e` | E2E tests |
| `yarn lint` | ESLint + Prettier |
| `yarn db:generate` | Generate migrations |
| `yarn db:migrate` | Run migrations |
| `yarn db:seed` | Seed system categories |
| `yarn docker:up` | Start PostgreSQL |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Oxlint |

## Deployment

Deployed on [Render.com](https://render.com) (Oregon region, free tier) via `render.yaml`:
- **Web service:** `monieplans-api` — Node.js runtime, `node dist/main.js`
- **Database:** `monieplans-db` — managed PostgreSQL
