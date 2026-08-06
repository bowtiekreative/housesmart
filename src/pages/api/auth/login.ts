import type { APIRoute } from 'astro';
import { AuthError, authenticate, createSession, issueMagicLink } from '../../../lib/auth-bookmarks';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const mode = String(form.get('mode') || 'password');

  if (mode === 'magic') {
    try {
      const siteUrl = process.env.SITE_URL || url.origin;
      await issueMagicLink(email, siteUrl);
    } catch {
      // Fall through — same message either way, no account enumeration.
    }
    return redirect('/login?sent=1', 303);
  }

  const password = String(form.get('password') || '');
  try {
    const user = await authenticate(email, password);
    await createSession(cookies, user.id);
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Login failed — try again.';
    return redirect(`/login?error=${encodeURIComponent(message)}`, 303);
  }
  return redirect(safeNext(form.get('next')), 303);
};

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/saved';
}
