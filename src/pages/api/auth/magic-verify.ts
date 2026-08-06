import type { APIRoute } from 'astro';
import { AuthError, createSession, redeemMagicLink } from '../../../lib/auth-bookmarks';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const token = url.searchParams.get('token') || '';
  try {
    const userId = await redeemMagicLink(token);
    await createSession(cookies, userId);
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Login link failed.';
    return redirect(`/login?error=${encodeURIComponent(message)}`, 303);
  }
  return redirect('/dashboard/saved', 303);
};
