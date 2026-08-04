# monieplans — Backend API Specification

> **Package:** `monieplans-api` v0.0.1
> **Framework:** NestJS v11 + Drizzle ORM
> **Updated:** 2026-08-04

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Domain Modules](#4-domain-modules)
5. [API Surface](#5-api-surface)
6. [Database](#6-database)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Testing](#8-testing)
9. [Build & Deployment](#9-build--deployment)
10. [Configuration & Environment](#10-configuration--environment)
11. [Directory Structure](#11-directory-structure)

---

## 1. Overview

The monieplans backend is a NestJS REST API server for personal finance management. It serves the React frontend and provides:

- **Budget management** — create, activate, and lock budget periods with weekly allocation splits
- **Expense tracking** — log spending, upload receipts with AI parsing, search/filter history
- **Fixed expense management** — recurring bill templates, per-period item generation
- **Savings goals** — target tracking with budget reservation and feasibility analysis
- **Bank statement import** — CSV upload with auto-categorization and transaction matching
- **Spending analytics** — AI-powered recommendations and audit events
- **User profiles** — preferences (currency, timezone, cycle settings)

Authentication is handled by **better-auth** (email/password, session cookies). There is no separate worker process — everything runs in a single NestJS server.

---

## 2. Technology Stack

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| NestJS | ^11.1.11 | HTTP API framework with DI container |
| TypeScript | ^5.7.3 | Type-safe language |
| Node.js | ≥22 | Runtime |

### Data & Storage

| Technology | Version | Purpose |
|---|---|---|
| Drizzle ORM | ^0.45.2 | ORM (query builder, schema definitions, migrations) |
| Drizzle Kit | ^0.31.10 | Migration generation and execution |
| PostgreSQL (pg) | ^8.22.0 | Primary relational database |
| Docker Compose | — | Local PostgreSQL 16 container |

### Authentication

| Technology | Version | Purpose |
|---|---|---|
| better-auth | ^1.6.20 | Email/password auth with session cookies |

### Validation & Serialization

| Technology | Version | Purpose |
|---|---|---|
| class-validator | ^0.15.1 | DTO validation decorators |
| class-transformer | ^0.5.1 | Request payload transformation |
| @nestjs/mapped-types | ^2.1.1 | PartialType, PickType, OmitType helpers |

### File Processing

| Technology | Version | Purpose |
|---|---|---|
| csv-parser | ^3.2.1 | Bank statement CSV parsing |
| @nestjs/platform-express | ^11.1.11 | File upload via Multer |

### Testing

| Technology | Version | Purpose |
|---|---|---|
| Jest | ^30.0.0 | Unit and e2e test runner |
| ts-jest | ^29.2.5 | TypeScript transformer for Jest |
| Supertest | ^7.0.0 | HTTP integration testing |
| @nestjs/testing | ^11.1.11 | NestJS test utilities |

### Linting & Formatting

| Technology | Version | Purpose |
|---|---|---|
| ESLint | ^9.18.0 | Static analysis |
| Prettier | ^3.4.2 | Code formatting |
| typescript-eslint | ^8.20.0 | TypeScript lint rules |

### Deployment

| Technology | Purpose |
|---|---|
| Render.com | Production hosting (web service + managed PostgreSQL) |
| Docker Compose | Local development PostgreSQL |

---

## 3. Architecture

### High-Level Architecture

```
┌────────────────────────────────────────┐
│          React Frontend                │
│          (localhost:5173)              │
└──────────────┬─────────────────────────┘
               │ HTTP REST
               │ (session cookie)
┌──────────────▼─────────────────────────┐
│        NestJS Server (port 3000)       │
│  ┌──────────────────────────────────┐  │
│  │  better-auth middleware           │  │
│  │  (/api/auth/*)                    │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  AuthGuard (CanActivate)         │  │
│  │  reads session cookie            │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │  Controllers (8 modules)         │  │
│  │  @UseGuards(AuthGuard)           │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │  Services (business logic)       │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │  Repositories (Drizzle queries)  │  │
│  └──────────────┬───────────────────┘  │
│                 │                      │
│  ┌──────────────▼───────────────────┐  │
│  │  ValidationPipe (whitelist,      │  │
│  │  transform) + ExceptionFilter    │  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│         PostgreSQL 16                  │
└────────────────────────────────────────┘
```

### Application Bootstrap (`src/main.ts`)

1. Creates NestJS app from `AppModule`
2. Mounts better-auth handler on `/api/auth` as Express middleware (before NestJS routes)
3. Sets global prefix `/api`
4. Registers `ValidationPipe` (`whitelist: true`, `transform: true`)
5. Registers `AllExceptionsFilter` as global exception handler
6. Enables CORS with credentials from `BETTER_AUTH_URL`
7. Listens on `PORT` (default 3000)

### App Module (`src/app.module.ts`)

| Module | Purpose |
|---|---|
| `ConfigModule` | `@nestjs/config` (`forRoot({ isGlobal: true })`) |
| `DatabaseModule` | `@Global()` — provides Drizzle client everywhere |
| `AuthModule` | Exports `AuthGuard` for route protection |
| `UsersModule` | User profile CRUD |
| `BudgetModule` | Budget periods & weekly allocations |
| `CategoriesModule` | System + user expense categories |
| `ExpensesModule` | Expense entries & receipt uploads |
| `FixedExpensesModule` | Recurring expense templates |
| `GoalsModule` | Savings goals & budget reservations |
| `StatementsModule` | CSV bank statement imports |
| `AnalyticsModule` | Recommendations & audit events |

### Module Pattern

Each domain module follows a consistent structure:

```
src/<module>/
├── <module>.module.ts          # NestJS module definition
├── <module>.controller.ts      # HTTP endpoints, @UseGuards(AuthGuard)
├── <module>.service.ts         # Business logic
├── <module>.repository.ts      # Drizzle database queries
└── dto/
    └── create-<entity>.dto.ts  # class-validator DTOs
```

**Key patterns:**

- **`@Global()` DatabaseModule** — The Drizzle client is available in every module without explicit imports via the global `DRIZZLE` token
- **AuthGuard at controller level** — `@UseGuards(AuthGuard)` applied once per controller class
- **`@CurrentUser()` decorator** — Extracts `req.user` (set by AuthGuard) into controller method params
- **Optional `tx` param** — Repository methods accept an optional transaction instance (`tx ?? this.db`) so services can compose cross-repository transactions
- **DTO validation** — All request bodies validated via `class-validator` + `PartialType` for updates

### Module Imports Matrix

| Module | Imports |
|---|---|
| AnalyticsModule | DatabaseModule |
| BudgetModule | AuthModule, GoalsModule |
| CategoriesModule | AuthModule |
| ExpensesModule | AuthModule |
| FixedExpensesModule | DatabaseModule |
| GoalsModule | *(self-contained)* |
| StatementsModule | DatabaseModule |
| UsersModule | AuthModule |

---

## 4. Domain Modules

### Auth (`src/auth/`)

Provides session-based authentication via better-auth.

| File | Purpose |
|---|---|
| `auth.instance.ts` | Creates standalone better-auth instance with Drizzle adapter and email/password provider |
| `auth.guard.ts` | `CanActivate` — reads session from cookie via `auth.api.getSession()`, throws `UnauthorizedException` if absent, attaches `session.user` to `req.user` |
| `auth.module.ts` | Exports `AuthGuard` globally |

**Auth singleton (`auth.instance.ts`):**
- Creates a separate Drizzle + pg pool (outside NestJS DI, standalone)
- Configures `drizzleAdapter(db, { provider: 'pg' })`
- Enables `emailAndPassword` provider (no email verification required)
- Sets `trustedOrigins` from `BETTER_AUTH_URL`

**better-auth routes** are mounted in `main.ts` as Express middleware on `/api/auth` before NestJS routes, so they bypass the NestJS controller layer entirely.

### Users (`src/users/`)

User profile management (preferences, currency, budget cycle settings).

| Route | Method | Auth |
|---|---|---|
| `/users/me` | GET | Required |
| `/users/me/profile` | GET, PATCH | Required |

**Entity:** `user_profiles` — 1:1 with `user` (better-auth). Fields: `userId`, `fullName`, `preferredCurrency` (default NGN), `timezone`, `budgetCycleAnchorDay`, `defaultBudgetCycleType`, `weekStartDay`.

### Budget (`src/budget/`)

Budget periods with automatic weekly allocation splitting.

| Route | Method | Purpose |
|---|---|---|
| `/budgets` | POST | Create budget period (optional immediate activation) |
| `/budgets` | GET | List all budget periods |
| `/budgets/active` | GET | Get currently active budget |
| `/budgets/:id` | GET | Get budget with weekly allocations |
| `/budgets/:id/activate` | POST | Activate draft budget |
| `/budgets/:id/lock` | POST | Lock active budget |

**Entities:**
- `budget_periods` — period start/end, cycle type, planning mode, income/cap amounts, status (draft/active/locked/archived)
- `weekly_budget_allocations` — per-week splits with planned/actual/remaining amounts, status (upcoming/current/completed)

**Weekly allocation logic:**
- Splits budget period into 7-day weeks (partial weeks at start/end)
- Supports `equal_split` and `calendar_aware` allocation strategies
- Deducts goal reserved amounts before splitting
- Cached `actualSpentAmountCache` and `remainingAmountCache` recalculated on expense change

**Cross-module:** `BudgetModule` imports `GoalsModule` so goal reservations are created during activation.

### Categories (`src/categories/`)

Expense/income/category classification.

| Route | Method | Auth |
|---|---|---|
| `/categories` | GET | Required |

**Entity:** `categories` — 11 system categories seeded via `drizzle/seed.ts` + user-created custom categories. Fields: `code`, `name` (unique per user), `groupName`, `kind` (expense/income/transfer/savings), `isSystem`, `isActive`.

**Seeded system categories:** food, transport, bills, housing, shopping, health, entertainment, education, savings, transfer, uncategorized.

### Expenses (`src/expenses/`)

Expense entry CRUD with receipt upload and soft delete.

| Route | Method | Purpose |
|---|---|---|
| `/expenses` | POST | Create expense entry |
| `/expenses` | GET | List/filter expenses |
| `/expenses/:id` | GET, PATCH, DELETE | Single expense CRUD (DELETE = soft) |
| `/expenses/receipts/upload` | POST | Upload receipt image |
| `/expenses/receipts/:id` | GET | Get receipt status |

**Entities:**
- `expense_entries` — amount, date, description, merchant, category, source type, soft delete (`deletedAt`)
- `expense_entry_receipts` — file storage path, parse status lifecycle, parsed fields from OCR

**Receipt lifecycle:** `uploaded` → `processing` (3s simulated delay) → `parsed` (random merchant + amount from filename) or `failed` → `confirmed` / `deleted`.

**Cache invalidation:** Creating, updating, or deleting an expense triggers weekly allocation cache recalculation.

### Fixed Expenses (`src/fixed-expenses/`)

Recurring bill templates and per-period item generation.

| Route | Method | Purpose |
|---|---|---|
| `/fixed-expenses/templates` | POST | Create template |
| `/fixed-expenses/templates` | GET | List templates |
| `/fixed-expenses/templates/:id` | GET, PATCH, DELETE | Single template CRUD |
| `/fixed-expenses/generate-items/:budgetPeriodId` | POST | Generate period items from templates |

**Entities:**
- `fixed_expense_templates` — name, category, amount, cadence (always `every_period`), default due day, active/archived flags, mandatory/protected flags
- `fixed_expense_items` — per-budget-period instances with origin type (recurring/one-off), inclusion status, due date

### Goals (`src/goals/`)

Savings goals with budget reservation and feasibility analysis.

| Route | Method | Purpose |
|---|---|---|
| `/goals` | POST | Create goal |
| `/goals` | GET | List goals |
| `/goals/:id` | GET, PATCH, DELETE | Single goal CRUD |
| `/goals/reserve/:budgetPeriodId` | POST | Create reservations for active goals |
| `/goals/reservations/:budgetPeriodId` | GET | Get reservations for a budget period |

**Entities:**
- `savings_goals` — name, target amount, current saved, target date, priority rank, status (active/paused/completed/archived), `reserveInBudget` flag
- `goal_budget_reservations` — reserved amount, recommended amount, feasibility (on_track/at_risk/unrealistic), unique on (budgetPeriodId, goalId)

**Reservation flow:**
1. On budget activation: for each active goal with `reserveInBudget = true`
2. Calculate remaining = targetAmount - currentSavedAmount
3. If targetDate: recommendedAmount = remaining / monthsLeft
4. Feasibility: `at_risk` if >25% of budget income, `unrealistic` if >50%
5. Upsert via `onConflictDoUpdate` on (budgetPeriodId, goalId)

### Statements (`src/statements/`)

CSV bank statement upload and auto-categorized transaction matching.

| Route | Method | Purpose |
|---|---|---|
| `/statements/upload` | POST | Upload CSV file |
| `/statements/:id/transactions` | GET | Get parsed transactions |

**Entities:**
- `statement_uploads` — file metadata, upload status (uploaded→processing→processed→failed→deleted), statement period, parse errors
- `transactions` — posted date, description (raw + normalized), amount, direction (debit/credit), merchant, matched category + confidence, user correction flag, exclusion flag, external hash for dedup
- `transaction_category_rules` — user-defined rules for auto-categorization (matchType: merchant/contains_text/exact_text, matchValue, categoryId, priority)

**CSV parsing:** Uses `csv-parser`, supports flexible headers (case-insensitive Amount/Description/Date), runs asynchronously after upload.

### Analytics (`src/analytics/`)

Spending insights, recommendations, and audit trail.

| Route | Method | Purpose |
|---|---|---|
| `/analytics/recommendations` | GET | List recommendations |
| `/analytics/recommendations/:id/status` | PATCH | Accept/dismiss recommendation |
| `/analytics/generate-insights` | POST | Trigger insight generation |

**Entities:**
- `recommendation_snapshots` — type (reduce_category/adjust_goal/risk_alert/recurring_spend_notice), title, body, estimated impact, evidence JSON, status (active/dismissed/accepted/expired)
- `audit_events` — entity type/id, event type, actor (user/system), change summary

---

## 5. API Surface

### Base URL

All endpoints are prefixed with `/api`. The better-auth routes are at `/api/auth/*` (bypassing NestJS controllers).

### Authentication

All application endpoints require authentication via session cookie. The `AuthGuard` reads the session from the cookie set by better-auth and injects `session.user` into `req.user`.

### Validation

All request bodies are validated via `class-validator` decorators on DTOs. The global `ValidationPipe` strips unknown properties (`whitelist: true`) and transforms payloads to DTO class instances (`transform: true`).

### Error Handling

The global `AllExceptionsFilter` catches all unhandled exceptions and returns a standardized JSON response:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Services throw `NotFoundException`, `BadRequestException`, etc. from `@nestjs/common`.

### Complete API Reference

| Method | Route | Auth | Module |
|---|---|---|---|
| `*` | `/api/auth/*` | No | better-auth middleware |
| `GET` | `/api/users/me` | Yes | Users |
| `GET` | `/api/users/me/profile` | Yes | Users |
| `PATCH` | `/api/users/me/profile` | Yes | Users |
| `POST` | `/api/budgets` | Yes | Budget |
| `GET` | `/api/budgets` | Yes | Budget |
| `GET` | `/api/budgets/active` | Yes | Budget |
| `GET` | `/api/budgets/:id` | Yes | Budget |
| `POST` | `/api/budgets/:id/activate` | Yes | Budget |
| `POST` | `/api/budgets/:id/lock` | Yes | Budget |
| `GET` | `/api/categories` | Yes | Categories |
| `POST` | `/api/expenses` | Yes | Expenses |
| `GET` | `/api/expenses` | Yes | Expenses |
| `GET` | `/api/expenses/:id` | Yes | Expenses |
| `PATCH` | `/api/expenses/:id` | Yes | Expenses |
| `DELETE` | `/api/expenses/:id` | Yes | Expenses |
| `POST` | `/api/expenses/receipts/upload` | Yes | Expenses |
| `GET` | `/api/expenses/receipts/:id` | Yes | Expenses |
| `POST` | `/api/fixed-expenses/templates` | Yes | Fixed Expenses |
| `GET` | `/api/fixed-expenses/templates` | Yes | Fixed Expenses |
| `GET` | `/api/fixed-expenses/templates/:id` | Yes | Fixed Expenses |
| `PATCH` | `/api/fixed-expenses/templates/:id` | Yes | Fixed Expenses |
| `DELETE` | `/api/fixed-expenses/templates/:id` | Yes | Fixed Expenses |
| `POST` | `/api/fixed-expenses/generate-items/:budgetPeriodId` | Yes | Fixed Expenses |
| `POST` | `/api/goals` | Yes | Goals |
| `GET` | `/api/goals` | Yes | Goals |
| `GET` | `/api/goals/:id` | Yes | Goals |
| `PATCH` | `/api/goals/:id` | Yes | Goals |
| `DELETE` | `/api/goals/:id` | Yes | Goals |
| `POST` | `/api/goals/reserve/:budgetPeriodId` | Yes | Goals |
| `GET` | `/api/goals/reservations/:budgetPeriodId` | Yes | Goals |
| `POST` | `/api/statements/upload` | Yes | Statements |
| `GET` | `/api/statements/:id/transactions` | Yes | Statements |
| `GET` | `/api/analytics/recommendations` | Yes | Analytics |
| `PATCH` | `/api/analytics/recommendations/:id/status` | Yes | Analytics |
| `POST` | `/api/analytics/generate-insights` | Yes | Analytics |

---

## 6. Database

### Connection

- **Driver:** `pg.Pool` via `drizzle-orm/node-postgres`
- **Connection string:** `DATABASE_URL` env var
- **Provider:** Global `DRIZZLE` token injected into all repositories

### Drizzle Provider (`src/database/database.provider.ts`)

```typescript
const pool = new Pool({ connectionString: configService.getOrThrow('DATABASE_URL') })
export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: () => drizzle(pool, { schema: { ...allSchemas } }),
}
```

### Repository Injection Pattern

```typescript
constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}
```

### Transaction Pattern

Repositories expose a `transaction()` method that delegates to Drizzle's `this.db.transaction()`. Services pass the transaction instance (`tx`) through to repository methods via an optional parameter:

```typescript
// Repository
async create(data, tx?: Tx) {
  const executor = tx ?? this.db
  return executor.insert(table).values(data).returning()
}

// Service
async createBudget(dto) {
  return this.budgetRepo.transaction(async (tx) => {
    const budget = await this.budgetRepo.create(dto, tx)
    await this.goalService.reserveInBudget(budget, tx)
    return budget
  })
}
```

### Soft Deletes

`expense_entries` and `expense_entry_receipts` use a `deletedAt` timestamp column. All list queries filter `isNull(deletedAt)` to exclude deleted rows.

### Migrations

- Generated via `yarn db:generate` (Drizzle Kit)
- Applied via `yarn db:migrate`
- Stored in `drizzle/migrations/`
- Seed data (11 system categories) applied via `yarn db:seed`

### Schema Files (`src/database/schema/`)

| File | Tables |
|---|---|
| `auth.ts` | `user`, `session`, `account`, `verification` |
| `users.ts` | `userProfiles` |
| `budget-periods.ts` | `budgetPeriods` |
| `weekly-allocations.ts` | `weeklyBudgetAllocations` |
| `categories.ts` | `categories` |
| `expense-entries.ts` | `expenseEntries`, `expenseEntryReceipts` |
| `fixed-expenses.ts` | `fixedExpenseTemplates`, `fixedExpenseItems` |
| `goals.ts` | `savingsGoals`, `goalBudgetReservations` |
| `statements.ts` | `statementUploads`, `transactions`, `transactionCategoryRules` |
| `analytics.ts` | `recommendationSnapshots`, `auditEvents` |

---

## 7. Authentication & Authorization

### Flow

1. User signs up/signs in via better-auth client → session cookie set
2. Frontend Axios sends cookie with `withCredentials: true`
3. NestJS `AuthGuard` reads session from cookie via `auth.api.getSession()`
4. Guard attaches `session.user` to `req.user`
5. Controllers access user via `@CurrentUser()` decorator: `(@CurrentUser() user) => user.id`

### Auth Guard (`src/auth/auth.guard.ts`)

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
    if (!session) throw new UnauthorizedException()
    request.user = session.user
    request.session = session.session
    return true
  }
}
```

### Current User Decorator (`src/common/decorators/current-user.decorator.ts`)

```typescript
export const CurrentUser = createParamDecorator((data: string | undefined, ctx) => {
  const { user } = ctx.switchToHttp().getRequest()
  return data ? user?.[data] : user
})
```

### Authorization

There is currently **no role-based authorization**. All authenticated users have equal access to all endpoints. When roles are added, implement a `@Roles()` decorator + `RolesGuard` pattern consistent with NestJS conventions.

### better-auth Instance

The `auth` singleton is created separately from NestJS DI (in `auth.instance.ts`) because better-auth requires its own Drizzle connection. It is mounted as Express middleware in `main.ts` before NestJS routes, so better-auth endpoints (`/api/auth/*`) bypass the NestJS controller layer.

---

## 8. Testing

### Unit Tests

| Command | Purpose |
|---|---|
| `yarn test` | Run unit tests (`src/**/*.spec.ts`) |
| `yarn test:watch` | Run tests in watch mode |
| `yarn test:cov` | Run with coverage |

**Pattern:** Jest + `@nestjs/testing` `Test.createTestingModule`.

**Controller tests** mock the service layer:
```typescript
// Mock AuthGuard
jest.mock('../auth/auth.guard', () => ({
  AuthGuard: { canActivate: jest.fn(() => true) },
}))
// Test module with real controller + mock service
const module = await Test.createTestingModule({
  controllers: [FixedExpensesController],
  providers: [{ provide: FixedExpensesService, useValue: mockService }],
}).compile()
```

**Service tests** mock the repository layer:
```typescript
const module = await Test.createTestingModule({
  providers: [
    FixedExpensesService,
    { provide: FixedExpensesRepository, useValue: mockRepo },
  ],
}).compile()
```

**Mock transaction pattern:**
```typescript
mockRepo.transaction = jest.fn().mockImplementation(async (cb) => cb(mockRepo))
```

### E2E Tests

| Command | Purpose |
|---|---|
| `yarn test:e2e` | Run e2e tests (`test/*.e2e-spec.ts`) via Supertest |

**Pattern:** Full app bootstrap against a seeded test database.

```typescript
const app = (await createApp()).getHttpServer()
const response = await request(app).post('/api/expenses').send(dto)
```

E2E tests use `test/jest-e2e.json` config with module name mappers to stub better-auth ESM imports for CJS compatibility.

### Test Coverage (Current)

| Module | Controller Spec | Service Spec |
|---|---|---|
| Fixed Expenses | Yes (109 lines) | Yes (156 lines) |
| Goals | Yes (137 lines) | Yes (299 lines) |
| Budget | No | No |
| Expenses | No | No |
| Categories | No | No |
| Statements | No | No |
| Analytics | No | No |
| Users | No | No |

---

## 9. Build & Deployment

### Build

```bash
yarn build          # nest build → dist/
yarn start:dev      # Dev server with watch
yarn start:prod     # node dist/main
```

### Lint & Format

```bash
yarn lint           # ESLint + Prettier fix
yarn format         # Prettier only
```

### Local Development

```bash
yarn docker:up      # Start PostgreSQL 16 in Docker
yarn db:setup       # Generate + migrate + seed
yarn start:dev      # Start NestJS server (port 3000)
```

### Database CLI

```bash
yarn db:generate    # Generate Drizzle migrations
yarn db:migrate     # Apply migrations
yarn db:seed        # Seed system categories
yarn db:studio      # Open Drizzle Studio GUI
```

### Production Deployment (Render.com)

Configured via `render.yaml`:
- **Web service:** `monieplans-api` — Node.js runtime, `node dist/main.js`, Oregon, free tier
- **Database:** `monieplans-db` — managed PostgreSQL, free tier
- Build: `npm install && npm run build`
- Environment: `DATABASE_URL`, `BETTER_AUTH_SECRET` (auto-generated)

---

## 10. Configuration & Environment

### Environment Variables (`.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | — | better-auth signing secret (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | `http://localhost:3000` | CORS origin + trusted origin |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment name |

### Docker Compose (`docker-compose.yml`)

```
PostgreSQL 16-alpine
Container: monieplans-postgres
User: user / Password: password / DB: monieplans
Port: 5432:5432
Volume: postgres_data (persistent)
```

---

## 11. Directory Structure

```
src/
├── main.ts                        # Bootstrap: NestJS app + better-auth middleware
├── app.module.ts                  # Root module (11 modules registered)
├── index.ts                       # Placeholder
├── auth/
│   ├── auth.instance.ts           # better-auth singleton (standalone pg + Drizzle)
│   ├── auth.guard.ts              # AuthGuard (CanActivate, reads session cookie)
│   └── auth.module.ts             # Exports AuthGuard
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts        # GET/PATCH /users/me/profile
│   ├── users.service.ts           # Profile create/get/upsert
│   ├── users.repository.ts        # Drizzle queries
│   └── dto/
│       └── update-profile.dto.ts
├── budget/
│   ├── budget.module.ts           # Imports AuthModule, GoalsModule
│   ├── budget.controller.ts       # POST/GET /budgets, activate, lock
│   ├── budget.service.ts          # Create, activate, weekly allocation splits
│   ├── budget.repository.ts       # Drizzle queries + upsert
│   └── dto/
│       └── create-budget.dto.ts
├── categories/
│   ├── categories.module.ts
│   ├── categories.controller.ts   # GET /categories
│   ├── categories.service.ts
│   ├── categories.repository.ts   # System + user category queries
│   └── (no DTOs — read-only)
├── expenses/
│   ├── expenses.module.ts
│   ├── expenses.controller.ts     # CRUD /expenses + receipt upload
│   ├── expenses.service.ts        # Cache recalculation, receipt simulation
│   ├── expenses.repository.ts     # Complex join queries + soft delete
│   └── dto/
│       ├── create-expense.dto.ts
│       ├── list-expenses.dto.ts
│       └── update-expense.dto.ts
├── fixed-expenses/
│   ├── fixed-expenses.module.ts
│   ├── fixed-expenses.controller.ts       # Templates CRUD + generate items
│   ├── fixed-expenses.service.ts
│   ├── fixed-expenses.repository.ts
│   ├── fixed-expenses.controller.spec.ts  # Unit test
│   ├── fixed-expenses.service.spec.ts     # Unit test
│   └── dto/
│       ├── create-fixed-expense-template.dto.ts
│       └── update-fixed-expense-template.dto.ts
├── goals/
│   ├── goals.module.ts
│   ├── goals.controller.ts         # CRUD /goals + reserve/reservations
│   ├── goals.service.ts            # Feasibility analysis, reservation logic
│   ├── goals.repository.ts         # Drizzle queries + onConflictDoUpdate
│   ├── goals.controller.spec.ts
│   ├── goals.service.spec.ts
│   └── dto/
│       ├── create-goal.dto.ts
│       └── update-goal.dto.ts
├── statements/
│   ├── statements.module.ts
│   ├── statements.controller.ts    # POST upload, GET transactions
│   ├── statements.service.ts       # CSV parsing, auto-categorization
│   ├── statements.repository.ts
│   └── dto/
│       └── upload-statement.dto.ts
├── analytics/
│   ├── analytics.module.ts
│   ├── analytics.controller.ts     # Recommendations + insights trigger
│   ├── analytics.service.ts
│   └── analytics.repository.ts
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts   # @CurrentUser() param decorator
│   └── filters/
│       └── http-exception.filter.ts    # Global exception handler
└── database/
    ├── database.module.ts           # @Global() module
    ├── database.provider.ts         # pg.Pool → Drizzle factory
    └── schema/
        ├── index.ts                 # Barrel export of all schemas
        ├── auth.ts                  # user, session, account, verification
        ├── users.ts                 # userProfiles
        ├── budget-periods.ts        # budgetPeriods
        ├── weekly-allocations.ts    # weeklyBudgetAllocations
        ├── categories.ts            # categories
        ├── expense-entries.ts       # expenseEntries, expenseEntryReceipts
        ├── fixed-expenses.ts        # fixedExpenseTemplates, fixedExpenseItems
        ├── goals.ts                 # savingsGoals, goalBudgetReservations
        ├── statements.ts            # statementUploads, transactions, transactionCategoryRules
        └── analytics.ts             # recommendationSnapshots, auditEvents

test/
├── app.e2e-spec.ts                 # Basic app smoke test
├── expenses.e2e-spec.ts            # Comprehensive expenses + receipts e2e
├── jest-e2e.json                   # Jest E2E config (stubs better-auth ESM)
└── mocks/
    └── better-auth.stub.ts         # ESM → CJS compatibility stub

drizzle/
├── migrations/                     # Drizzle Kit SQL migrations
└── seed.ts                         # 11 system category inserts

test-runner.ts                       # Manual full-API integration smoke test
docker-compose.yml                   # Local PostgreSQL container
render.yaml                          # Render.com deployment config
drizzle.config.ts                    # Drizzle Kit configuration
```
