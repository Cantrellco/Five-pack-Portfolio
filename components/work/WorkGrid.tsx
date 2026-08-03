'use client';

import { ScrambleText } from '@/components/ScrambleText';
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
      <p className="label kicker">
        <ScrambleText text="Projects" />
      </p>

      {/* Every other panel opens kicker-then-headline before any content —
          About with the role line, Resume and Contact through `SectionHeader`.
          This one opened on the kicker and went straight into the tile grid,
          which on a phone (where the panels are read one screen at a time)
          made Work the one screen with no headline on it: a visible drop in
          finish, on the screen showing the actual work.

          A plain `h2` rather than `SectionHeader`, and deliberately without
          `data-reveal`: nothing under `components/work/` carries that
          attribute. A revealed element starts at `opacity: 0` and waits on the
          motion bundle, and this panel spends most of its life behind
          `hidden` — an element that is revealed while its panel is hidden has
          no reliable moment to be observed intersecting.

          "Built", not "shipped". Every one of the six was built; the site does
          not have a ship date on record for all six, and this heading is not
          the place to imply one.

          No top margin — `.kicker` already carries the gap above it. The
          bottom margin is the one the grid needs and does not have:
          `.work-grid` sets padding, not margin, so without this the tiles
          would start immediately under the headline's descenders. Matches
          the grid's own `--sp-sm` gap rather than `--sp-md`, so the space
          above the tiles reads the same as the space between them. */}
      <h2 className="display-2 mb-[var(--sp-sm)]">What I have built</h2>

      <div className="work-grid">
        {WORK_TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="work-tile"
            data-tone={tab.tone}
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
            {/* The kind tag, in its own row. There was a second span here — a
                "Flagship" word in the accent, on the Workout Buddy tile alone.
                It is gone: six tiles that all carry the same weight is the
                grid's whole rule, and a word singling one of them out argued
                against it. Which project the case studies lead with is the
                case studies' business, not the index's. The row wrapper stays,
                so the tag keeps its own line and the tiles keep their heights. */}
            <span className="work-tile-tags">
              <span className="work-tile-kind label">{tab.kind}</span>
            </span>
            <span className="work-tile-summary">{tab.summary}</span>
          </a>
        ))}
      </div>
    </>
  );
}
