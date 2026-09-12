import { test as setup } from '@playwright/test'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { APIRequestContext } from '@playwright/test'

const API = process.env.E2E_API_URL ?? 'http://localhost:8787'
const EMAIL = 'e2e@monieplans.dev'
const PASSWORD = 'e2e-password-123'
const NAME = 'E2E User'

function findLocalD1Sqlite(): string {
  const dir = join(
    process.cwd(),
    '.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
  )
  const file = readdirSync(dir).find(
    (f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite',
  )
  if (!file) {
    throw new Error(
      `No local D1 sqlite found under ${dir}. Run \`yarn db:migrate:local\` first.`,
    )
  }
  return join(dir, file)
}

function sqlite(command: string): string {
  const db = findLocalD1Sqlite()
  return execSync(`sqlite3 ${JSON.stringify(db)} ${JSON.stringify(command)}`)
    .toString()
    .trim()
}

function markEmailVerified(): void {
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      sqlite(`UPDATE user SET email_verified = 1 WHERE email = '${EMAIL}';`)
      return
    } catch (err) {
      lastError = err
      if (attempt < 4) execSync('sleep 1')
    }
  }
  throw lastError
}

async function seedData(request: APIRequestContext): Promise<void> {
  const budgets = await request.get(`${API}/api/budgets`)
  const existing = (await budgets.json()) as unknown[]
  if (existing.length > 0) return

  // Create + activate the budget the same way a user would.
  const budgetRes = await request.post(`${API}/api/budgets`, {
    data: {
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      presetMonth: '2026-09',
      planningMode: 'spending_cap_based',
      monthlyBudgetCapAmount: 1000,
      activateImmediately: true,
    },
  })
  if (!budgetRes.ok()) {
    throw new Error(
      `Budget seed failed: ${budgetRes.status()} ${await budgetRes.text()}`,
    )
  }

  // Log an expense against the newly-active budget.
  const expenseRes = await request.post(`${API}/api/expenses`, {
    data: { amount: 42.5, expenseDate: '2026-09-15', description: 'Groceries' },
  })
  if (!expenseRes.ok()) {
    throw new Error(
      `Expense seed failed: ${expenseRes.status()} ${await expenseRes.text()}`,
    )
  }

  await request.post(`${API}/api/goals`, {
    data: { name: 'Emergency Fund', targetAmount: 5000 },
  })

  await request.post(`${API}/api/fixed-expenses/templates`, {
    data: { name: 'Rent', amount: 1200 },
  })
}

setup('seed an authenticated session and data', async ({ browser }) => {
  const context = await browser.newContext()
  const request = context.request

  await request
    .post(`${API}/api/auth/sign-up/email`, {
      data: { name: NAME, email: EMAIL, password: PASSWORD },
    })
    .catch(() => {})

  markEmailVerified()

  const signIn = await request.post(`${API}/api/auth/sign-in/email`, {
    data: { email: EMAIL, password: PASSWORD },
  })
  if (!signIn.ok()) {
    throw new Error(
      `Sign-in failed: ${signIn.status()} ${await signIn.text()}`,
    )
  }

  await seedData(request)

  await context.storageState({ path: 'e2e/.auth/user.json' })
  await context.close()
})
