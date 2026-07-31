'use client';

import { useState, useSyncExternalStore } from 'react';

/* Same "is this the client, post-hydration" signal DeckContext's `enhanced`
   uses, and for the same reason: flipping a mounted flag from an effect is a
   cascading render the lint rules reject. Kept local rather than imported
   from DeckContext because this button has nothing to do with panel
   switching and should not need a DeckProvider ancestor to render. */
const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * A copy-to-clipboard affordance beside the mailto link. Renders nothing on
 * the server and through hydration, so with JS off — or before the bundle
 * lands — there is no button here at all, only the real mailto anchor next
 * to it. Never a dead control.
 */
export function CopyEmail({ email }: { email: string }) {
  const mounted = useSyncExternalStore(NEVER_CHANGES, onClient, onServer);
  const [copied, setCopied] = useState(false);

  if (!mounted) return null;

  return (
    <button
      type="button"
      className="mono text-graphite transition-colors hover:text-ink"
      onClick={() => {
        navigator.clipboard.writeText(email).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
