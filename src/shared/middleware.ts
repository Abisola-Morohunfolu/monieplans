import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getAuth, type AuthEnv } from '../auth';

export async function authMiddleware(c: Context, next: Next) {
  const { auth } = getAuth(c.env as AuthEnv);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
}
