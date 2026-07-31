/**
 * The section index.
 *
 * Each entry is BOTH a tab and an anchor, and that is deliberate. With
 * scripting on, the masthead renders these as a tablist and the right-hand
 * column shows one panel at a time. With scripting off — or before the bundle
 * lands — the exact same markup is a list of anchors pointing at panels that
 * are all on the page, stacked, visible. Nothing is hidden by the server, so
 * there is no state in which content is unreachable.
 *
 * `href` is the id of the panel, not of a heading inside it. The panel is what
 * gets shown and hidden, so it has to be what the anchor resolves to.
 */
import { flagship, harvest, sites } from '@/content/projects';

export type NavItem = {
  href: string;
  /** The panel id, without the hash. */
  panel: string;
  label: string;
};

export const NAV = [
  { href: '#about', panel: 'about', label: 'About' },
  { href: '#resume', panel: 'resume', label: 'Resume' },
  { href: '#work', panel: 'work', label: 'Work' },
  { href: '#contact', panel: 'contact', label: 'Contact' },
] as const satisfies readonly NavItem[];

/** Every panel the deck knows about. */
export const PANELS: readonly NavItem[] = NAV;

export const DEFAULT_PANEL = NAV[0].panel;

/**
 * The projects, as the second row of tabs inside the Work panel.
 *
 * One tab per project, and a project's tab holds ONLY that project — no
 * shared list, no scrolling past the flagship to discover the rest. The
 * `kind` is the same stack tag the section itself carries, so the tab bar
 * says what a thing is before it is opened.
 */
export type WorkTab = {
  /** Doubles as the section id and the hash, so a tab is deep-linkable. */
  id: string;
  /** The project's own name, in full. */
  label: string;
  kind: string;
  summary: string;
};

export const WORK_TABS = [
  {
    id: 'workout-buddy',
    label: flagship.name,
    kind: flagship.kind,
    summary: 'Logs sets, runs auto-progressing mesocycles, and lets an AI coach propose the next block.',
  },
  {
    id: harvest.id,
    label: harvest.name,
    kind: harvest.kind,
    summary: harvest.tagline,
  },
  ...sites.map((site) => ({
    id: site.id,
    // Full names. The index reads down the column rather than across a row, so
    // there is no width to run out of and no reason to abbreviate a client's
    // name into something they would not recognise.
    label: site.name,
    kind: site.kind,
    summary: site.summary,
  })),
] as const satisfies readonly WorkTab[];

/**
 * Which top-level panel a nested id belongs to.
 *
 * The hash holds exactly one value, and the nested tabs write their own id
 * into it — so landing on `/#fusion-coffee` has to open Work AND select that
 * project. Without this map the top-level deck would not recognise the hash,
 * fall back to the default panel, and the deep link would silently open the
 * wrong page. Derived from WORK_TABS so the two can never drift.
 */
/* A Map, not an object literal. The key here comes straight off the URL, and a
   plain object answers `map['toString']` with an inherited function rather than
   with undefined — which is truthy, so it would sail through the lookup below
   and be set as the active panel. No panel id matches a function, so every
   panel would take `hidden` and `/#toString` would render an empty column; on a
   hashchange React would then call it as a state updater and tear the tree
   down. A Map has no prototype chain to walk, so a hash naming one of
   Object.prototype's members is simply not a panel. */
const PANEL_OF_CHILD: ReadonlyMap<string, string> = new Map(
  WORK_TABS.map((tab) => [tab.id, 'work'] as const),
);

/** The top-level panel a hash names, whether it names one directly or via a
 *  nested tab. Null when the hash is about something other than the deck. */
export function panelForHash(id: string): string | null {
  if (PANELS.some((p) => p.panel === id)) return id;
  return PANEL_OF_CHILD.get(id) ?? null;
}
