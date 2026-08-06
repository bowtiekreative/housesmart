/**
 * Bookmark toggle with optimistic UI — the icon flips instantly, then the
 * server call confirms (and rolls back on failure). Logged-out users are
 * sent to /login with a return path.
 */
import { useCallback, useState } from 'react';

interface Props {
  jtbdId: string;
  slug: string;
  title: string;
  matrixNode?: string;
  initialSaved: boolean;
  loggedIn: boolean;
  compact?: boolean;
}

export default function SaveInnovationButton({
  jtbdId,
  slug,
  title,
  matrixNode,
  initialSaved,
  loggedIn,
  compact = false,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;

    const previous = saved;
    setSaved(!previous); // optimistic flip
    setBusy(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jtbd_id: jtbdId, jtbd_slug: slug, jtbd_title: title, matrix_node: matrixNode }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { saved: boolean };
      setSaved(data.saved); // authoritative state from server
    } catch {
      setSaved(previous); // roll back
    } finally {
      setBusy(false);
    }
  }, [busy, saved, loggedIn, jtbdId, slug, title, matrixNode]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved innovations' : 'Save this innovation'}
      className={[
        'inline-flex items-center gap-2 rounded-lg font-semibold transition-all select-none',
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        saved
          ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-200'
          : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-amber-400 hover:text-amber-700',
        busy ? 'opacity-70' : '',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 24 24"
        className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? 'Saved' : 'Save Innovation'}
    </button>
  );
}
