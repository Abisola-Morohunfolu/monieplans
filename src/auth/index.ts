import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

export interface AuthEnv {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  BETTER_AUTH_URL?: string;
}

interface AuthCache {
  auth: {
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
  };
  db: ReturnType<typeof drizzle<typeof schema>>;
}

let cached: AuthCache | null = null;

const trustedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];

export function getAuth(env: AuthEnv): AuthCache {
  if (cached) return cached;

  const db = drizzle(env.DB, { schema });

  const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      // eslint-disable-next-line @typescript-eslint/require-await
      sendVerificationEmail: async ({ user, url }) => {
        if (!env.RESEND_API_KEY) {
          console.error(
            'RESEND_API_KEY is not set — cannot send verification email',
          );
          return;
        }
        void fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MoniePlans <noreply@monieplans.com>',
            to: [user.email],
            subject: 'Verify your email address',
            html: `<p>Welcome to MoniePlans!</p><p>Click the link below to verify your email address:</p><p><a href="${url}" style="color:#8E9C75;font-weight:500;">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
          }),
        })
          .then((res) => {
            if (!res.ok) console.error('Failed to send verification email');
          })
          .catch(console.error);
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
    trustedOrigins,
  });

  cached = { auth, db };
  return cached;
}
