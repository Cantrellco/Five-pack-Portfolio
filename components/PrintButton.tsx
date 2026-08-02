'use client';

import { useSyncExternalStore } from 'react';
import { printLabel } from '@/content/resume';

/* Same "is this the client, post-hydration" signal CopyEmail uses, and for
   the same reasons: flipping a mounted flag from an effect is a cascading
   render the lint rules reject, and this control must not exist at all in
   the server document — a print button with no scripting is a dead button,
   which the no-JS page may never carry. */
const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Prints the page — which, through the `@media print` block in globals.css,
 * is a typeset one-or-two-page resume rather than a screenshot of the site.
 * Renders nothing on the server and through hydration, so the JS-off
 * document simply does not have it. No `data-reveal`: the reveal driver
 * scans on mount, and this button arrives after that pass.
 */
export function PrintButton() {
  const mounted = useSyncExternalStore(NEVER_CHANGES, onClient, onServer);

  if (!mounted) return null;

  return (
    <p className="mt-[var(--sp-lg)]">
      <button
        type="button"
        className="cta-ghost cursor-pointer"
        onClick={() => window.print()}
      >
        {printLabel}
      </button>
    </p>
  );
}
