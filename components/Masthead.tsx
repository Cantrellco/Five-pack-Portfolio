import { TabBar } from '@/components/deck/TabBar';

/**
 * The section index, and nothing else.
 *
 * The name used to sit here carrying the page's `<h1>`. It has moved into the
 * identity column, which is the other thing on this page that never changes
 * when a tab does — and which is where the name belongs once this bar stops
 * being a bar. What is left is the tablist, held to the content column it
 * controls by the shared `--deck-split`, so nothing here has to change again
 * if the header goes away entirely.
 */
export function Masthead() {
  return (
    <header className="sticky top-0 z-40">
      {/* No row here, no reserved height, nothing spanning the top of the
          page: `<header>` carries no in-flow box of its own, so `.page`'s
          flex column gives `.deck` — and the identity column inside it —
          the full viewport. The tablist is positioned entirely off that
          flow, floating over the content pane it controls. */}
      <div className="masthead-tabs shell">
        {/* Transparent on purpose: the ink field sits behind the whole page,
            and the tabs are meant to float over it like everything else does,
            not sit on a paper plate. The deck-content pane scrolls
            independently underneath this floating bar, so panel text passing
            behind it would ordinarily show through mid-scroll — that risk is
            closed on the other side, by a mask on `.deck-content` itself
            (`globals.css`) that hides its own painted content for the height
            this row occupies, rather than by an opaque fill here. */}
        {/* Right padding carries `--scrollbar-w` on top of the usual gutter,
            matching the inset `scrollbar-gutter: stable` reserves on
            `.deck-content` — so this row centres on the same box the text
            actually occupies rather than the full, unnarrowed column. */}
        <div className="hidden lg:col-start-2 lg:flex lg:justify-center lg:pl-[var(--gutter)] lg:pr-[calc(var(--gutter)+var(--scrollbar-w))] lg:pt-[4.5rem] lg:pb-[var(--sp-sm)]">
          <TabBar className="flex items-center gap-[calc(var(--sp-lg)*1.1)]" />
        </div>
      </div>
    </header>
  );
}
