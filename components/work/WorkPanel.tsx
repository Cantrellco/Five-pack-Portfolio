'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { WORK_TABS } from '@/content/nav';
import { useWorkDeck } from './WorkDeckContext';

/**
 * Seeded, not `Math.random()` — a fixed seed means every call to `rand()`
 * returns the same sequence on the server and on the client, so the scatter
 * it drives hydrates clean. Real randomness would draw a different one on
 * each and fail the instant they were compared. The constant is arbitrary;
 * what matters is that it never changes.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Must match `--ink` in app/tokens.css. Not read from the token: this string
 * is baked into a static SVG background rather than an element `renderer.ts`
 * can style with CSS, so it hits the same wall that file's own comment
 * describes for the WebGL side — a shader cannot resolve a custom property
 * either, which is why that code reads `--ink` with `getComputedStyle` and
 * hands the browser a literal colour instead of a variable reference. A data
 * URI is evaluated as its own document, with no path back to this page's
 * CSS, so the same literal is the only option here too.
 */
const INK_HEX = '#171512';

/**
 * The base layer: a real, tiled texture rather than more individually
 * animated points — the density `components/field/shaders.ts` gets from
 * 18,067 scattered vertices, one repeating background can approximate for
 * free, at any dialog size, under any amount of text, with a single paint
 * instead of hundreds of elements. Twenty-six dots in a 140px tile, repeated,
 * land in the hundreds across a full dialog — which is what actually reads
 * as "the same density as the rest of the site" scrolled into a paragraph-
 * dense section, where a few dozen individually placed motes thin out to
 * almost nothing between the lines of text.
 */
function buildDustTile(seed: number, size: number, count: number) {
  const rand = mulberry32(seed);
  const dots = Array.from({ length: count }, () => {
    const cx = (rand() * size).toFixed(1);
    const cy = (rand() * size).toFixed(1);
    const r = (0.5 + rand() * 0.9).toFixed(2);
    // Same ink-alpha range as the field's own fragment shader: 0.15-0.35.
    const o = (0.15 + rand() * 0.2).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK_HEX}" fill-opacity="${o}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const DUST_TILE_URL = buildDustTile(4242, 140, 26);

/**
 * The live layer, on top of the tile: ninety points, each drifting and
 * fading on its own loop via CSS `transform`/`opacity` alone, which is what
 * the static tile cannot give this — motion. Together they are the same
 * split the field itself draws: a texture built from density, plus a slow
 * drift over it.
 */
const DUST_COUNT = 90;
const DUST = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: DUST_COUNT }, () => ({
    x: `${(rand() * 100).toFixed(1)}%`,
    y: `${(rand() * 100).toFixed(1)}%`,
    size: `${(1 + rand() * 1.8).toFixed(2)}px`,
    peak: (0.15 + rand() * 0.2).toFixed(2),
    duration: `${(7 + rand() * 9).toFixed(1)}s`,
    delay: `-${(rand() * 14).toFixed(1)}s`,
  }));
})();

/**
 * Dust in the light of the frame, not in the document — this sits outside
 * `.work-dialog-body` and is positioned against the dialog itself, so it
 * holds still as the case study underneath it scrolls, the way motes suspend
 * in a shaft of light regardless of what passes beneath them, and stays as
 * dense over the last paragraph as over the first. No canvas, no JS render
 * loop, nothing this site's one WebGL surface has to share with a second
 * scene — a tiled background and ninety `<span>`s.
 */
function DustMotes() {
  return (
    <div className="work-dust-field" aria-hidden="true" style={{ backgroundImage: DUST_TILE_URL }}>
      {DUST.map((d, i) => (
        <span
          key={i}
          className="work-dust"
          style={
            {
              '--x': d.x,
              '--y': d.y,
              '--size': d.size,
              '--peak': d.peak,
              '--duration': d.duration,
              '--delay': d.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * One project's full case study, as a native `<dialog>`.
 *
 * Unenhanced it is simply `open`: a plain block of content in the document,
 * stacked with the other five, exactly as every panel on this site behaves
 * with scripting off. Enhanced, it starts closed — `open` is never set in
 * markup — and an effect calls `showModal()`/`close()` to match whichever
 * id `WorkDeckContext` says is open, so the dialog is always a rendering of
 * that one piece of state rather than a second copy of it.
 *
 * `showModal()` is what makes this a MODAL dialog rather than merely a
 * shown one: the browser puts it in the top layer over everything else,
 * paints `::backdrop` behind it, traps Tab inside it, and — the detail this
 * relies on rather than reimplementing — returns focus to whatever was
 * focused before the call once the dialog closes, by itself, per spec.
 *
 * The `close` event fires from every path off the dialog — the button
 * below, Escape, a backdrop click — so it is the one place state syncs back
 * to `WorkDeckContext`, rather than three call sites each remembering to.
 */
export function WorkProject({ id, children }: { id: string; children: ReactNode }) {
  const { enhanced, active, close } = useWorkDeck();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const label = WORK_TABS.find((t) => t.id === id)?.label ?? id;
  const isOpen = active === id;

  useEffect(() => {
    if (!enhanced) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [enhanced, isOpen]);

  const onClose = () => {
    // Only the dialog that WAS the open one clears it. Without this guard, a
    // click on tile B closes dialog A's element (the effect above does that
    // directly), A's `close` event fires, and A's handler would then clear
    // the id that B just became — undoing the very navigation that closed it.
    if (active === id) close();
  };

  // The one dismissal `showModal()` does not give for free: a click that
  // lands on the backdrop rather than the dialog's own box. The backdrop is
  // not a child of the dialog, but a click on it still reports the dialog
  // itself as the target, so distance from the dialog's own rect is what
  // tells the two apart.
  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = event.currentTarget;
    const r = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    if (!inside) dialog.close();
  };

  return (
    <dialog
      ref={dialogRef}
      id={id}
      data-work-project={id}
      className="work-dialog"
      aria-label={label}
      onClose={onClose}
      onClick={enhanced ? onBackdropClick : undefined}
      {...(!enhanced ? { open: true } : {})}
    >
      {enhanced && (
        <>
          <DustMotes />
          <button
            type="button"
            className="work-dialog-close"
            aria-label={`Close ${label}`}
            autoFocus
            onClick={() => dialogRef.current?.close()}
          />
        </>
      )}
      <div className="work-dialog-body">{children}</div>
    </dialog>
  );
}
