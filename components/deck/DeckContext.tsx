'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { DEFAULT_PANEL, PANELS, panelForHash } from '@/content/nav';

type DeckValue = {
  /**
   * False on the server and throughout hydration, true on the render after it.
   * Everything that hides a panel is gated on this, so the HTML that ships —
   * and the HTML React reconciles against — has every panel present and
   * visible. That is both the no-JS story and the reason there is no
   * hydration mismatch: the two renders are identical by construction.
   */
  enhanced: boolean;
  active: string;
  show: (panel: string) => void;
};

const DeckCtx = createContext<DeckValue | null>(null);

const KNOWN = new Set(PANELS.map((p) => p.panel));

/* Resolves through the nested tabs as well as the top-level ones: the Work
   panel's projects each own the hash while they are showing, so `#fusion-coffee`
   has to be understood here as "the Work panel" or the deep link opens About. */
function panelFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  return panelForHash(window.location.hash.replace(/^#/, ''));
}

/* An external store whose value is simply "is this the client". Subscribing is
   a no-op because the answer never changes again once it is true. This is the
   supported way to render one thing during hydration and another after it —
   the alternative, flipping a flag from an effect, is a cascading render and
   the lint rules reject it. */
const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function DeckProvider({ children }: { children: ReactNode }) {
  const enhanced = useSyncExternalStore(NEVER_CHANGES, onClient, onServer);

  /* Landing on /#resume must open the resume. Reading the hash here rather
     than in an effect is safe precisely because `active` cannot affect the
     first render: while `enhanced` is false every panel is visible regardless
     of which one is active. */
  const [active, setActive] = useState<string>(() => panelFromHash() ?? DEFAULT_PANEL);

  useEffect(() => {
    // The floating tab row in the masthead centres itself over `#deck-scroller`
    // using a shared grid track, but that track match breaks the moment the
    // pane actually grows a scrollbar: the scrollbar eats into the pane's own
    // content width without the masthead row narrowing to match, so the row
    // centres on a wider box than the text is actually using. `--scrollbar-w`
    // closes that gap — see `.masthead-tabs > div` in globals.css.
    //
    // `scrollbar-gutter: stable` on `.deck-content` keeps this width constant
    // across panels of different heights, so one measurement per viewport
    // holds; resize is the only thing that can change it afterwards.
    const measureScrollbar = () => {
      const pane = document.getElementById('deck-scroller');
      if (!pane) return;
      const width = pane.offsetWidth - pane.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-w', `${width}px`);
    };
    measureScrollbar();
    window.addEventListener('resize', measureScrollbar);
    return () => window.removeEventListener('resize', measureScrollbar);
  }, []);

  useEffect(() => {
    // Back and forward move between panels, because each panel change wrote a
    // history entry. Without this the browser buttons would silently do nothing.
    //
    // Three cases, and the empty one is the case that matters: the first entry
    // in the history for this page has no hash at all, so going Back from the
    // first panel change lands on `''`. Treating that as "no panel named" and
    // leaving the state alone closes every panel and shows an empty column.
    // An empty hash means the default panel. A hash naming something that is
    // not a panel — `#main`, say — is not about the deck, so it changes nothing.
    const onHashChange = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (raw === '') {
        setActive(DEFAULT_PANEL);
        return;
      }
      const panel = panelForHash(raw);
      if (panel) setActive(panel);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const show = useCallback(
    (panel: string) => {
      if (!KNOWN.has(panel)) return;
      // Selecting the panel that is already showing is not a navigation. It
      // used to push a history entry anyway, so clicking the current tab twice
      // left a duplicate that the next Back press silently consumed — Back
      // looked broken. The guard reads `active` from the closure rather than a
      // state updater, because pushState is a side effect and an updater can
      // be invoked more than once for one call.
      if (panel === active) return;
      setActive(panel);
      // pushState rather than assigning location.hash: assigning it makes the
      // browser scroll to the element, and the panel is the whole column — the
      // jump lands mid-content. The deck handles the scroll itself instead.
      window.history.pushState(null, '', `#${panel}`);
    },
    [active],
  );

  // False until the effect below has run once. Distinguishes the initial
  // enhance-mount — which must land at the true page top, see the comment
  // inside — from every navigation after it.
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!enhanced) return;

    // Swapping a panel replaces the document under the scroll layer: the height
    // changes, every trigger's start and end move, and the figure the canvas
    // draws into either appears or vanishes. A custom event rather than a
    // direct import keeps the motion layer the only thing that knows GSAP
    // exists — the deck stays a plain state machine.
    window.dispatchEvent(new CustomEvent('deck:change', { detail: { panel: active } }));

    // A new document starts at its top. Without this, arriving at a short panel
    // from a long one leaves the reader scrolled past everything on it.
    //
    // Whichever element is actually scrolling: the right pane owns the
    // scrollbar in the two-column layout, and the window owns it below that.
    const pane = document.getElementById('deck-scroller');
    if (pane && pane.scrollHeight > pane.clientHeight) pane.scrollTop = 0;

    // Below `lg` there is no separate pane — `pane` above is the single
    // scrolling document's own content column, sitting under a portrait and
    // a tab row it does not own. Resetting the window to (0, 0) on every tab
    // click, the way the two-pane layout wants, scrolls a phone reader back
    // past both of those every single time. Once the identity column has
    // already been shown once this jumps straight to the content column's
    // own top instead — which still clears the sticky masthead, via the
    // same `scroll-margin-top` every anchor target on the page already
    // carries (`[id]`, above).
    //
    // The very first run is deliberately exempted: it is what cancels the
    // browser's native jump-to-anchor for a deep link (`/#resume` would
    // otherwise auto-scroll straight to the resume panel before React ever
    // runs) and shows the identity column the same way a fresh load does.
    const narrow = !window.matchMedia('(min-width: 64rem)').matches;
    if (narrow && hasNavigated.current && pane) {
      pane.scrollIntoView({ block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    hasNavigated.current = true;
  }, [enhanced, active]);

  const value = useMemo(() => ({ enhanced, active, show }), [enhanced, active, show]);

  return <DeckCtx.Provider value={value}>{children}</DeckCtx.Provider>;
}

export function useDeck(): DeckValue {
  const ctx = useContext(DeckCtx);
  if (!ctx) throw new Error('useDeck must be used inside <DeckProvider>');
  return ctx;
}
