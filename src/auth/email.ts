export interface VerificationEmailParams {
  to: string;
  fromEmail: string;
  url: string;
}

const SUBJECT = 'Verify your email address';

const verificationHtml = (url: string) =>
  `<p>Welcome to MoniePlans!</p><p>Click the link below to verify your email address:</p><p><a href="${url}" style="color:#8E9C75;font-weight:500;">Verify Email</a></p><p>This link expires in 24 hours.</p>`;

const verificationText = (url: string) =>
  `Welcome to MoniePlans! Click the link below to verify your email address:\n${url}\nThis link expires in 24 hours.`;

export async function sendViaCloudflare(
  email: SendEmail,
  params: VerificationEmailParams,
): Promise<void> {
  await email.send({
    from: { email: params.fromEmail, name: 'MoniePlans' },
    to: params.to,
    subject: SUBJECT,
    html: verificationHtml(params.url),
    text: verificationText(params.url),
  });
}

export async function sendViaResend(
  apiKey: string,
  params: VerificationEmailParams,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `MoniePlans <${params.fromEmail}>`,
      to: [params.to],
      subject: SUBJECT,
      html: verificationHtml(params.url),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}
