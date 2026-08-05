import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getAuth } from '../auth';

export async function authMiddleware(c: Context, next: Next) {
  const { auth } = getAuth(c.env.DB as never as D1Database);
  const session = await (auth as { api: { getSession: (opts: { headers: Headers }) => Promise<{ user: { id: string; email: string; name: string }; session: { id: string } } | null> } }).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
}
