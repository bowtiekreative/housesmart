import type { APIRoute } from 'astro';
import { getCurrentUser, setEmailDigest } from '../../lib/auth-bookmarks';

/** POST /api/preferences — set email digest cadence (none | daily | weekly). */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return redirect('/login', 303);

  const form = await request.formData();
  const digest = String(form.get('email_digest') || 'none');
  if (digest !== 'none' && digest !== 'daily' && digest !== 'weekly') {
    return new Response('Invalid digest value', { status: 400 });
  }
  await setEmailDigest(user.id, digest);
  return redirect('/dashboard/saved?prefs=saved', 303);
};
