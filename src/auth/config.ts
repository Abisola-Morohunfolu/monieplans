import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../database/schema';
import { sendViaCloudflare, sendViaResend } from './email';

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  BETTER_AUTH_URL?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  EMAIL?: SendEmail;
  EMAIL_FROM?: string;
  EMAIL_PROVIDER?: 'cloudflare' | 'resend';
}

export interface AuthInstance {
  handler: (req: Request) => Promise<Response>;
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{
      user: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
        image?: string | null;
      };
      session: { id: string };
    } | null>;
  };
}

export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://monieplans.amorohunfolu.workers.dev',
];

export function createAuth(
  db: DrizzleD1Database<typeof schema>,
  env: AuthEnv,
): AuthInstance {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    logger: { level: env.LOG_LEVEL ?? 'warn' },
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const params = {
          to: user.email,
          fromEmail: env.EMAIL_FROM ?? 'noreply@monieplans.com',
          url,
        };
        const provider = env.EMAIL_PROVIDER ?? 'resend';

        try {
          if (provider === 'cloudflare') {
            if (!env.EMAIL) {
              throw new Error('EMAIL binding is not configured');
            }
            await sendViaCloudflare(env.EMAIL, params);
          } else {
            if (!env.RESEND_API_KEY) {
              throw new Error('RESEND_API_KEY is not set');
            }
            await sendViaResend(env.RESEND_API_KEY, params);
          }
          console.log(
            `[email-verification] verification email sent via ${provider}`,
          );
        } catch (err) {
          console.error(
            `[email-verification] failed to send verification email via ${provider}`,
            err,
          );
        }
      },
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || '',
        clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID || '',
        clientSecret: env.GITHUB_CLIENT_SECRET || '',
      },
    },
    trustedOrigins: allowedOrigins,
    plugins: [dash()],
  });
}
