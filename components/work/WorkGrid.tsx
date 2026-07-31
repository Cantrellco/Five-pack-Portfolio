'use client';

import { WORK_TABS } from '@/content/nav';
import { useWorkDeck } from './WorkDeckContext';

/**
 * The Work panel's resting state: all six projects, all on screen, all the
 * time. Nothing is hidden behind a click-to-expand trigger, nothing takes
 * turns being the one large thing among five small ones — every tile is the
 * same size and carries the same weight, because choosing one is no longer
 * a matter of comparing it against its neighbours. It opens its own case
 * study in a dialog above the grid, which is still sitting there, unchanged,
 * once that dialog closes.
 *
 * Every tile is a real `<a href="#slug">` in both states — unenhanced and
 * enhanced alike — so there is exactly one markup to keep correct. With
 * scripting off that anchor jumps straight to the project's own section,
 * `open` in the document like every other panel on this site; with it on,
 * the same click opens that project as a dialog instead, and `aria-haspopup`
 * says so up front rather than leaving a screen reader to discover it only
 * once the dialog has already appeared.
 */
export function WorkGrid() {
  const { enhanced, show } = useWorkDeck();

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!enhanced) return;
    // Modified and non-primary clicks mean "open elsewhere" — leave the
    // browser's own handling of those alone.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    event.preventDefault();
    show(id);
  };

  return (
    <>
      <p className="label kicker">Projects</p>

      <div className="work-grid">
        {WORK_TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="work-tile"
            aria-haspopup={enhanced ? 'dialog' : undefined}
            onClick={(event) => onClick(event, tab.id)}
          >
            <span className="work-tile-name">
              <span className="work-tile-name-label">{tab.label}</span>
              {/* The same word again, in ink, revealed left to right on hover —
                  identical geometry to the layer beneath it, so nothing moves
                  or reflows, only the amount of it that is inked. Hidden from
                  assistive technology: it is the same word, and hearing it
                  twice is noise. Pure CSS :hover, so it works with scripting
                  off too. */}
              <span className="work-tile-name-ink" aria-hidden="true">
                {tab.label}
              </span>
            </span>
            <span className="work-tile-kind label">{tab.kind}</span>
            <span className="work-tile-summary">{tab.summary}</span>
          </a>
        ))}
      </div>
    </>
  );
}
