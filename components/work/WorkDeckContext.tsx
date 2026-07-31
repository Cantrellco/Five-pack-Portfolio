'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { WORK_TABS } from '@/content/nav';
import { useDeck } from '@/components/deck/DeckContext';

type WorkDeckValue = {
  /** Mirrors the outer deck: false on the server and through hydration. */
  enhanced: boolean;
  /** The open project's id, or `null` when the grid is showing and nothing is. */
  active: string | null;
  show: (id: string) => void;
  /** Dismisses whichever project is open. A no-op when nothing is. */
  close: () => void;
};

const WorkDeckCtx = createContext<WorkDeckValue | null>(null);

/* Typed as strings rather than the literal union WORK_TABS infers: everything
   asked about here arrives from the URL, so the question is always "is this
   arbitrary string one of ours". */
const KNOWN: ReadonlySet<string> = new Set<string>(WORK_TABS.map((t) => t.id));

function tabFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace(/^#/, '');
  return KNOWN.has(id) ? id : null;
}

/**
 * State for the grid of projects inside the Work panel.
 *
 * Deliberately not a second copy of the outer deck's enhancement store: this
 * reads `enhanced` from the outer one, so the grid and the outer deck can
 * never disagree about whether the page has been enhanced. Everything else —
 * which project's dialog is open, if any, and the hash that names it — is
 * its own.
 *
 * `active` used to always hold one of the six ids — the grid this replaced a
 * drum, then a row, that always had exactly one project open inline. A grid
 * of tiles has a real rest state neither of those did: nothing chosen yet,
 * every project one click away rather than one already showing. `null` is
 * that state, and it is the state `/#work` itself resolves to now.
 */
export function WorkDeckProvider({ children }: { children: ReactNode }) {
  const { enhanced, active: activePanel } = useDeck();

  /* Same reasoning as the outer deck: reading the hash during the first render
     is safe because while `enhanced` is false every project is visible, so
     `active` cannot change what the server and the client render. */
  const [active, setActive] = useState<string | null>(() => tabFromHash());

  useEffect(() => {
    // Only history traversal reaches this — `show`/`close` use pushState,
    // which by specification does not fire hashchange. So this is the
    // Back/Forward path.
    //
    // An empty hash, or the Work panel's own id, both mean "no project
    // named": the grid, with nothing open.
    const onHashChange = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (raw === '' || raw === 'work') {
        setActive(null);
        return;
      }
      if (KNOWN.has(raw)) setActive(raw);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const show = useCallback(
    (id: string) => {
      if (!KNOWN.has(id)) return;
      // Re-opening the project that is already open is not a navigation and
      // must not leave a history entry behind.
      if (id === active) return;
      setActive(id);
      // pushState rather than assigning location.hash: assigning it would
      // scroll the page to the section, and there is no section to scroll to
      // any more — the dialog is an overlay, not a place in the document.
      window.history.pushState(null, '', `#${id}`);
    },
    [active],
  );

  const close = useCallback(() => {
    if (active === null) return;
    setActive(null);
    window.history.pushState(null, '', '#work');
  }, [active]);

  /**
   * Keep the hash naming the project that is actually open, or `#work` when
   * none is.
   *
   * The outer deck writes `#work` when its own tab is clicked, and it does so
   * with pushState — which fires no hashchange, so this provider never hears
   * about it and goes on holding whichever project was last open. That left
   * one URL describing two different views: `#work` reached by clicking the
   * Work tab showed the grid, while the same `#work` reached by Back could
   * still be naming a project this provider thought was open. replaceState
   * rather than pushState: this corrects the address of the view already
   * showing, not a navigation to a new one, so it must not add a Back entry.
   */
  useEffect(() => {
    if (!enhanced || activePanel !== 'work') return;
    const hash = `#${active ?? 'work'}`;
    if (window.location.hash === hash) return;
    window.history.replaceState(null, '', hash);
  }, [enhanced, activePanel, active]);

  useEffect(() => {
    if (!enhanced) return;
    // A dialog opening replaces nothing in the document flow — the grid
    // underneath it never changes height or scroll position — so this only
    // has to tell the motion layer a project's content just became reachable
    // for the first time, so it can play the reveal that content never got
    // at mount. Nothing here touches scroll.
    window.dispatchEvent(new CustomEvent('deck:change', { detail: { panel: active } }));
  }, [enhanced, active]);

  const value = useMemo(() => ({ enhanced, active, show, close }), [enhanced, active, show, close]);

  return <WorkDeckCtx.Provider value={value}>{children}</WorkDeckCtx.Provider>;
}

export function useWorkDeck(): WorkDeckValue {
  const ctx = useContext(WorkDeckCtx);
  if (!ctx) throw new Error('useWorkDeck must be used inside <WorkDeckProvider>');
  return ctx;
}
