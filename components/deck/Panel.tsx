'use client';

import type { ReactNode } from 'react';
import { PANELS } from '@/content/nav';
import { useDeck } from './DeckContext';

/**
 * One document in the deck.
 *
 * Before enhancement every panel renders as a plain <section> with its id
 * intact — the page is a stack of sections and the masthead links are
 * ordinary anchors. After enhancement the inactive ones take the `hidden`
 * attribute, which removes them from layout AND from the accessibility tree,
 * and the active one becomes a labelled tabpanel.
 *
 * No `tabIndex` on the panel: every panel here contains focusable content, and
 * the ARIA practice is to make a tabpanel focusable only when it does not.
 */
export function Panel({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { enhanced, active } = useDeck();
  const isActive = active === id;
  const label = PANELS.find((p) => p.panel === id)?.label ?? id;

  return (
    <section
      id={id}
      data-panel={id}
      className={className}
      hidden={enhanced && !isActive}
      {...(enhanced ? { role: 'tabpanel' as const, 'aria-label': label } : {})}
    >
      {children}
    </section>
  );
}
