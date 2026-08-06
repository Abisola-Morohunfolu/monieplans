import { z, ZodError } from 'zod';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export function validateJson<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.parse(body);
      c.set('body', result as Record<string, unknown>);
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new HTTPException(400, {
          message: err.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
        });
      }
      throw err;
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const result = schema.parse(query);
      c.set('query', result as Record<string, unknown>);
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new HTTPException(400, {
          message: err.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
        });
      }
      throw err;
    }
  };
}
