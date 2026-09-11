import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../database/schema';

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
  EMAIL_PROVIDER?: 'cloudflare' | 'resend' | 'auto';
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
      sendVerificationEmail: async ({ user, url, token }) => {
        console.log('[email-verification] sendVerificationEmail called', {
          email: user.email,
          url,
          token,
        });

        const fromEmail = env.EMAIL_FROM ?? 'noreply@monieplans.com';
        const subject = 'Verify your email address';
        const html = `<p>Welcome to MoniePlans!</p><p>Click the link below to verify your email address:</p><p><a href="${url}" style="color:#8E9C75;font-weight:500;">Verify Email</a></p><p>This link expires in 24 hours.</p>`;
        const text = `Welcome to MoniePlans! Click the link below to verify your email address:\n${url}\nThis link expires in 24 hours.`;

        const sendViaCloudflare = async () => {
          if (!env.EMAIL) {
            console.error(
              '[email-verification] Cloudflare EMAIL binding is not configured',
            );
            return false;
          }
          try {
            const result = await env.EMAIL.send({
              from: { email: fromEmail, name: 'MoniePlans' },
              to: user.email,
              subject,
              html,
              text,
            });
            console.log(
              '[email-verification] sent via Cloudflare Email Sending',
              result,
            );
            return true;
          } catch (err) {
            console.error(
              '[email-verification] Cloudflare Email Sending failed',
              err,
            );
            return false;
          }
        };

        const sendViaResend = async () => {
          if (!env.RESEND_API_KEY) {
            console.error(
              '[email-verification] RESEND_API_KEY is not set — cannot send verification email',
            );
            return false;
          }
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `MoniePlans <${fromEmail}>`,
                to: [user.email],
                subject,
                html,
              }),
            });
            const body = await res.text();
            if (!res.ok) {
              console.error(
                '[email-verification] Failed to send verification email via Resend',
                {
                  status: res.status,
                  body,
                },
              );
              return false;
            }
            console.log(
              '[email-verification] Verification email sent via Resend',
              {
                status: res.status,
                body,
              },
            );
            return true;
          } catch (err) {
            console.error(
              '[email-verification] Error sending verification email via Resend',
              err,
            );
            return false;
          }
        };

        const provider = env.EMAIL_PROVIDER ?? 'auto';
        if (provider === 'cloudflare') {
          await sendViaCloudflare();
        } else if (provider === 'resend') {
          await sendViaResend();
        } else {
          if (!(await sendViaCloudflare())) {
            await sendViaResend();
          }
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
