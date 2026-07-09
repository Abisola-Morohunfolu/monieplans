/**
 * Jest stand-in for the `better-auth` ESM entry points, which jest's CJS transform cannot parse.
 * E2E suites override `AuthGuard` with a mock session, so none of these are ever exercised —
 * they only need to satisfy the imports in `auth.instance.ts`, `auth.guard.ts`, and `main.ts`.
 */
export const betterAuth = (_options?: unknown) => ({
  api: { getSession: async (): Promise<null> => null },
  handler: async (): Promise<undefined> => undefined,
});

export const drizzleAdapter = (_db?: unknown, _config?: unknown) => ({});

export const fromNodeHeaders = (headers: unknown) => headers;

export const toNodeHandler =
  (_handler?: unknown) =>
  (_req?: unknown, _res?: unknown): undefined =>
    undefined;
