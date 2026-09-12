export interface AuthEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface AuthEmailParams extends AuthEmailContent {
  to: string;
}

export interface AuthEmailEnv {
  EMAIL?: SendEmail;
  EMAIL_FROM?: string;
  EMAIL_PROVIDER?: 'cloudflare' | 'resend';
  RESEND_API_KEY?: string;
}

const FROM_NAME = 'MoniePlans';
const DEFAULT_FROM_EMAIL = 'noreply@monieplans.com';

export function verificationEmailContent(url: string): AuthEmailContent {
  return {
    subject: 'Verify your email address',
    html: `<p>Welcome to MoniePlans!</p><p>Click the link below to verify your email address:</p><p><a href="${url}" style="color:#8E9C75;font-weight:500;">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
    text: `Welcome to MoniePlans! Click the link below to verify your email address:\n${url}\nThis link expires in 24 hours.`,
  };
}

export function resetPasswordEmailContent(url: string): AuthEmailContent {
  return {
    subject: 'Reset your password',
    html: `<p>We received a request to reset your MoniePlans password.</p><p>Click the link below to set a new password:</p><p><a href="${url}" style="color:#8E9C75;font-weight:500;">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`,
    text: `We received a request to reset your MoniePlans password. Click the link below to set a new password:\n${url}\nIf you didn't request this, you can safely ignore this email. This link expires in 1 hour.`,
  };
}

async function sendViaCloudflare(
  email: SendEmail,
  params: AuthEmailParams,
  fromEmail: string,
): Promise<void> {
  await email.send({
    from: { email: fromEmail, name: FROM_NAME },
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

async function sendViaResend(
  apiKey: string,
  params: AuthEmailParams,
  fromEmail: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

export async function sendAuthEmail(
  env: AuthEmailEnv,
  params: AuthEmailParams,
): Promise<void> {
  const fromEmail = env.EMAIL_FROM ?? DEFAULT_FROM_EMAIL;
  const provider = env.EMAIL_PROVIDER ?? 'resend';

  if (provider === 'cloudflare') {
    if (!env.EMAIL) {
      throw new Error('EMAIL binding is not configured');
    }
    await sendViaCloudflare(env.EMAIL, params, fromEmail);
  } else {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    await sendViaResend(env.RESEND_API_KEY, params, fromEmail);
  }
}
