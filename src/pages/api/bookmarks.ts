import type { APIRoute } from 'astro';
import { getBookmarks, getCurrentUser, toggleBookmark } from '../../lib/auth-bookmarks';

/** GET /api/bookmarks — the logged-in user's saved list. */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return json({ error: 'Not logged in' }, 401);
  return json({ bookmarks: await getBookmarks(user.id) });
};

/** POST /api/bookmarks — toggle; returns { saved: boolean }. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return json({ error: 'Not logged in' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const jtbd_id = String(body.jtbd_id || '');
  const jtbd_slug = String(body.jtbd_slug || '');
  const jtbd_title = String(body.jtbd_title || '');
  if (!jtbd_id || !jtbd_slug || !jtbd_title) {
    return json({ error: 'jtbd_id, jtbd_slug and jtbd_title are required' }, 400);
  }
  const saved = await toggleBookmark(user.id, {
    jtbd_id,
    jtbd_slug,
    jtbd_title,
    matrix_node: body.matrix_node ? String(body.matrix_node) : undefined,
  });
  return json({ saved });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
