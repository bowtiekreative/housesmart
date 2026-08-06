import type { APIRoute } from 'astro';
import { query } from '../../lib/db';
import { sendMail } from '../../lib/mailer';

/** POST /api/leads — consultation requests from LeadCaptureForm. */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  if (!name || !email) {
    return new Response(JSON.stringify({ error: 'Name and email are required' }), { status: 400 });
  }

  await query(
    `INSERT INTO leads (name, email, phone, project, message, jtbd_slug)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      name,
      email,
      String(form.get('phone') || '') || null,
      String(form.get('project') || '') || null,
      String(form.get('message') || '') || null,
      String(form.get('jtbd_slug') || '') || null,
    ],
  );

  // Notify the partner-ops inbox if configured; lead is already stored either way.
  const notify = process.env.LEADS_NOTIFY_EMAIL;
  if (notify) {
    sendMail({
      to: notify,
      subject: `New HomeSmart lead: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${form.get('phone') || '-'}\nProject: ${form.get('project') || '-'}\nPage: ${form.get('jtbd_slug') || '-'}\n\n${form.get('message') || ''}`,
    }).catch((err) => console.error('Lead notify failed:', err));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
