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
  const month = '2026-09'

  const existing = await request.get(`${API}/api/budgets/${month}`)
  if (existing.ok()) {
    const { id } = (await existing.json()) as { id?: string }
    if (id) return
  }

  // Create the month budget the same way a user would.
  const budgetRes = await request.put(`${API}/api/budgets/${month}`)
  if (!budgetRes.ok()) {
    throw new Error(
      `Budget seed failed: ${budgetRes.status()} ${await budgetRes.text()}`,
    )
  }

  // Log an expense against the month.
  const expenseRes = await request.post(`${API}/api/transactions`, {
    data: {
      type: 'expense',
      amount: 42.5,
      occurredOn: '2026-09-15',
      payee: 'Groceries',
    },
  })
  if (!expenseRes.ok()) {
    throw new Error(
      `Expense seed failed: ${expenseRes.status()} ${await expenseRes.text()}`,
    )
  }

  // Log income.
  const incomeRes = await request.post(`${API}/api/transactions`, {
    data: {
      type: 'income',
      amount: 1000,
      occurredOn: '2026-09-01',
      payee: 'Salary',
    },
  })
  if (!incomeRes.ok()) {
    throw new Error(
      `Income seed failed: ${incomeRes.status()} ${await incomeRes.text()}`,
    )
  }
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
