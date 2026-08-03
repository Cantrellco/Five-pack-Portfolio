import { konamiHint } from '@/content/source-note';

/**
 * The one visible clue that `FieldMorphTrigger` exists: a small drawn mark,
 * quiet until hovered, in a corner the desktop layout otherwise leaves
 * empty. Everywhere else the Konami code is mentioned — the view-source
 * note, `/humans.txt` — a reader has to already be looking at source or
 * credits to find it; this is the one invitation in the page itself.
 *
 * The sequence is real text (`.field-morph-hint-code`), not a `title`
 * attribute: it sits in the DOM at `opacity: 0` always, so a screen reader
 * reaches it in normal reading order regardless of hover, and a sighted
 * visitor gets the actual keys to press instead of a bare `?` cursor and a
 * native tooltip that may or may not show up.
 *
 * `tabIndex={0}` — the only element on the page given one outside its
 * natural tab order — is what lets a keyboard user reach and reveal it at
 * all; nothing else nearby is focusable, so Tab would otherwise skip past
 * this corner entirely. `:focus-visible` gets the site's ordinary outline
 * here (no bespoke treatment the way `.tab` needed) since nothing else
 * about this mark claims a competing focus language.
 *
 * Desktop only (`hidden lg:flex`): the code needs a physical keyboard, so a
 * phone reader has nothing to try it with, the same reasoning
 * `FieldMorphTrigger` itself never had to state because it renders no DOM
 * to hide.
 */
export function FieldMorphHint() {
  return (
    <span className="field-morph-hint hidden lg:flex" tabIndex={0}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 7 12 3 15 7" />
        <path d="M9 17 12 21 15 17" />
        <path d="M7 9 3 12 7 15" />
        <path d="M17 9 21 12 17 15" />
      </svg>
      <span className="field-morph-hint-code mono">{konamiHint}</span>
    </span>
  );
}
