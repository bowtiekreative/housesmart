/**
 * Thin SMTP wrapper. If SMTP_HOST isn't configured (local dev), the message —
 * including any magic link — is printed to the server console instead.
 */
import nodemailer from 'nodemailer';

interface MailInput {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(input: MailInput): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`\n--- MAIL (SMTP not configured) ---\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n---\n`);
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'HouseSmart.ca <no-reply@housesmart.ca>',
    ...input,
  });
}
