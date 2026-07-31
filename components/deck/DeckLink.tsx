'use client';

import type { ReactNode } from 'react';
import { useDeck } from './DeckContext';

/**
 * An anchor that opens a panel.
 *
 * It stays a real anchor with a real href in every state — middle-click,
 * copy-link and open-in-new-tab all keep working, and with scripting off it
 * is exactly the anchor it appears to be. Enhancement only intercepts the
 * plain left-click, and only once the deck is actually showing one panel at a
 * time; before that, jumping to the section is the correct behaviour and the
 * default is left alone.
 */
export function DeckLink({
  panel,
  className,
  children,
}: {
  panel: string;
  className?: string;
  children: ReactNode;
}) {
  const { enhanced, show } = useDeck();

  return (
    <a
      href={`#${panel}`}
      className={className}
      onClick={(event) => {
        if (!enhanced) return;
        // Leave modified clicks to the browser — they mean "somewhere else".
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        show(panel);
      }}
    >
      {children}
    </a>
  );
}
