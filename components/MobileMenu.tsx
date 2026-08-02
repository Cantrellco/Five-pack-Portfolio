'use client';

import { useEffect, useRef } from 'react';
import { NAV } from '@/content/nav';
import { useDeck } from './deck/DeckContext';

/**
 * The phone layout's section index: a small trigger in the top-right corner
 * that opens a full-screen list, replacing the 2×2 tab block and the header
 * strip that carried it. Desktop never shows this (`.mobile-menu` is
 * `display: none` from `lg` up); the masthead tablist covers those widths.
 *
 * Built on `<details>` so the no-JS story holds by itself: with scripting off
 * the summary still toggles, and the items are ordinary anchors into a page
 * where every panel is stacked and visible. Enhanced, the items become
 * buttons that drive the deck and close the menu behind themselves.
 *
 * One accepted cost on the no-JS path: native `<details>` does not close on
 * a same-page anchor navigation, so after following an item the open list
 * keeps covering the screen until the summary is tapped again. There is no
 * CSS-only close, the summary stays visible (and on top — see the z-index
 * note on `.mobile-menu-button`) to dismiss it, and no content is ever
 * unreachable — a known trade, not an oversight.
 */
export function MobileMenu() {
  const { enhanced, active, show } = useDeck();
  const ref = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enhanced) return;
    const details = ref.current;
    if (!details) return;
    const main = document.getElementById('main');

    // A full-screen open state has to make the page behind it unreachable,
    // not just invisible — otherwise Tab (or a screen reader's virtual
    // cursor) can still wander into content that a sighted reader can no
    // longer see. `inert` is the platform's own answer to that. One `toggle`
    // listener covers all three ways the state can change below (a native
    // click on the summary, Escape, an outside tap) rather than setting it
    // in each handler separately.
    const onToggle = () => {
      if (main) main.inert = details.open;
    };
    details.addEventListener('toggle', onToggle);

    // Closing collapses the content under the focused item, which would
    // silently reset focus to <body> — a keyboard reader would have to Tab
    // back through the whole page. Every programmatic close hands focus to
    // the summary instead, the way a disclosure is supposed to.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      summaryRef.current?.focus();
    };
    // A tap anywhere outside the menu closes it — a full-screen list that
    // stays open over content it no longer relates to is debris. No focus
    // grab here: the reader deliberately put their attention elsewhere.
    const onPointerDown = (event: PointerEvent) => {
      if (!details.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      details.open = false;
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      details.removeEventListener('toggle', onToggle);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      if (main) main.inert = false;
    };
  }, [enhanced]);

  const choose = (panel: string) => {
    show(panel);
    if (ref.current) ref.current.open = false;
    summaryRef.current?.focus();
  };

  return (
    <details ref={ref} className="mobile-menu">
      {/* The visible control is the three-bar glyph alone; "Menu" lives in
          the accessible name so nothing is lost to assistive tech. */}
      <summary ref={summaryRef} className="mobile-menu-button" aria-label="Menu">
        <span className="mobile-menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>
      <nav aria-label="Sections" className="mobile-menu-list">
        {/* Decorative only — the nav's own `aria-label` above already gives
            screen readers the name "Sections"; this is the same visible
            eyebrow every panel opens with (see `.label` in globals.css),
            here so the menu reads as a labelled index rather than a bare
            list of buttons. */}
        <span className="label mobile-menu-kicker" aria-hidden="true">
          Sections
        </span>
        {NAV.map((item) =>
          enhanced ? (
            <button
              key={item.panel}
              type="button"
              className="mobile-menu-item"
              aria-current={item.panel === active ? 'true' : undefined}
              onClick={() => choose(item.panel)}
            >
              {item.label}
            </button>
          ) : (
            <a key={item.panel} href={item.href} className="mobile-menu-item">
              {item.label}
            </a>
          ),
        )}
      </nav>
    </details>
  );
}
