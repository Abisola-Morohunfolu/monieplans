import { describe, it, expect } from 'vitest';
import { app } from '../index';

const env = {
  BETTER_AUTH_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
  DB: undefined as unknown as D1Database,
};

describe('API', () => {
  it('default export has fetch function', () => {
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe('function');
  });

  it('GET / returns service metadata', async () => {
    const res = await app.request('/', {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; version: string };
    expect(body.name).toBe('monieplans-api');
    expect(body.version).toBe('0.1.0');
  });

  it('GET /api/health returns ok', async () => {
    const res = await app.request('/api/health', {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  const protectedRoutes = [
    ['GET', '/api/users/me/profile'],
    ['GET', '/api/categories'],
    ['POST', '/api/categories'],
    ['GET', '/api/budgets/2026-08'],
    ['PUT', '/api/budgets/2026-08/assignments'],
    ['GET', '/api/budgets/2026-08/summary'],
    ['GET', '/api/transactions'],
    ['POST', '/api/transactions'],
  ] as const;

  it.each(protectedRoutes)(
    '%s %s returns 401 without a session',
    async (method, path) => {
      const res = await app.request(path, { method }, env);
      expect(res.status).toBe(401);
    },
  );
});
