import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../database/schema';
import {
  sendAuthEmail,
  verificationEmailContent,
  resetPasswordEmailContent,
} from './email';

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  BETTER_AUTH_URL?: string;
  APP_ORIGIN?: string;
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
  'https://monieplans.pages.dev',
  'https://monieplans.amorohunfolu.workers.dev',
];

function appOrigin(env: AuthEnv): string {
  return env.APP_ORIGIN ?? 'http://localhost:5173';
}

async function sendAuthEmailSafely(
  env: AuthEnv,
  params: { to: string; subject: string; html: string; text: string },
  label: string,
): Promise<void> {
  const provider = env.EMAIL_PROVIDER ?? 'resend';
  try {
    await sendAuthEmail(env, params);
    console.log(`[${label}] email sent via ${provider}`);
  } catch (err) {
    console.error(`[${label}] failed to send email via ${provider}`, err);
  }
}

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
      sendResetPassword: async ({ user, token }) => {
        await sendAuthEmailSafely(
          env,
          {
            to: user.email,
            ...resetPasswordEmailContent(
              `${appOrigin(env)}/reset-password?token=${token}`,
            ),
          },
          'reset-password',
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, token }) => {
        await sendAuthEmailSafely(
          env,
          {
            to: user.email,
            ...verificationEmailContent(
              `${appOrigin(env)}/verify-email?token=${token}`,
            ),
          },
          'email-verification',
        );
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
