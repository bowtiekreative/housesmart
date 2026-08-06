import type { APIRoute } from 'astro';
import { AuthError, createSession, registerUser } from '../../../lib/auth-bookmarks';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  try {
    const user = await registerUser(email, password);
    await createSession(cookies, user.id);
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Signup failed — try again.';
    return redirect(`/signup?error=${encodeURIComponent(message)}`, 303);
  }
  return redirect(safeNext(form.get('next')), 303);
};

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/saved';
}
