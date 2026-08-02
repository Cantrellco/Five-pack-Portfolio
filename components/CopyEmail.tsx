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
      /* A real 44x44 touch box. Tailwind's preflight zeroes button padding, so
         this rendered as a bare `.mono` text node — about 40x18 at `--fs-2xs`,
         under every touch-target guideline there is, sitting a `--sp-sm` gap
         from the display-sized mailto link. That is the one control a reader
         who wants to make contact reaches for on a phone.

         `inline-flex` with the label centred rather than padding plus a
         cancelling negative margin: the parent row is `items-baseline`, and a
         flex container takes its baseline from its first item — so the label
         still sits on the email address's baseline exactly as before while the
         box grows symmetrically around it. The button has no fill and no
         border, so a bigger box is invisible; only the tappable area changes. */
      className="mono inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center text-graphite transition-colors hover:text-ink"
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
