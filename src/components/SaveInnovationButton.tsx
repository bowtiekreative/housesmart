/**
 * Bookmark toggle with optimistic UI — a hairline pill that flips instantly,
 * then the server call confirms (and rolls back on failure). Saved state is
 * marked by the accent arrow, not a colour flood.
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
      style={{
        font: `600 ${compact ? 13 : 14}px var(--font-sans)`,
        color: 'var(--color-heading)',
        background: 'transparent',
        border: `1px solid ${saved ? 'var(--color-accent)' : 'var(--hairline)'}`,
        borderRadius: 999,
        padding: compact ? '7px 16px' : '10px 22px',
        cursor: 'pointer',
        opacity: busy ? 0.7 : 1,
        transition: 'border-color 200ms var(--ease-out)',
      }}
    >
      {saved ? (
        <>
          Saved <span style={{ color: 'var(--color-accent)' }}>→</span>
        </>
      ) : (
        'Save innovation'
      )}
    </button>
  );
}
