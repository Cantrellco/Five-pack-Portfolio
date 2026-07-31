'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { WORK_TABS } from '@/content/nav';
import { useWorkDeck } from './WorkDeckContext';

/**
 * Frame-rate independent approach, identical to `renderer.ts`'s own —
 * `rate` is roughly "fraction closed per second", so the pointer here eases
 * with the same weight and inertia the field's own `uPointer` uniform has,
 * rather than snapping straight to the cursor.
 */
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

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
 * The live layer, on top of the tile: ninety points, each wandering on its
 * own loop via CSS `transform` alone, at its own fixed opacity — which is
 * what the static tile cannot give this — motion, of the same kind the field
 * itself has. Not a rise-and-fade: `fieldVert`'s own drift is a two-axis sine
 * wander with no time term in its alpha at all, so these motes hold a
 * constant opacity and only ever wander, same as the shader's points. The
 * shader's own drift is barely a pixel — invisible on any one of its 18,067
 * points, and only reads as motion in aggregate. Ninety motes have no
 * aggregate to hide in, so the wander is sized and paced to be seen on each
 * one alone: bigger and quicker than the field's own, same as the field's
 * point size and density are already scaled up for a mote count two orders
 * smaller than the field's vertex count.
 */
const DUST_COUNT = 90;
const DUST = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: DUST_COUNT }, () => {
    const xFrac = rand();
    const yFrac = rand();
    return {
      xFrac,
      yFrac,
      x: `${(xFrac * 100).toFixed(1)}%`,
      y: `${(yFrac * 100).toFixed(1)}%`,
      size: `${(1 + rand() * 1.8).toFixed(2)}px`,
      peak: (0.15 + rand() * 0.2).toFixed(2),
      dx: `${(7 + rand() * 12).toFixed(2)}px`,
      dy: `${(7 + rand() * 12).toFixed(2)}px`,
      duration: `${(5 + rand() * 6).toFixed(1)}s`,
      delay: `-${(rand() * 11).toFixed(1)}s`,
    };
  });
})();

/**
 * Dust in the light of the frame, not in the document — this sits outside
 * `.work-dialog-body` and is positioned against the dialog itself, so it
 * holds still as the case study underneath it scrolls, the way motes suspend
 * in a shaft of light regardless of what passes beneath them, and stays as
 * dense over the last paragraph as over the first. No canvas, no persistent
 * JS render loop — a tiled background and ninety `<span>` pairs, with the one
 * loop below running only while a dialog is actually open, and only to nudge
 * each mote's rest position away from the pointer, the same way `fieldVert`
 * pushes its own points away from `uPointer`.
 *
 * Each mote is two nested elements rather than one: `transform` is what the
 * CSS wander animation (`work-dust-drift`) already animates on the inner
 * span, so a repel effect stacked onto the SAME property would fight the
 * keyframes for it every frame the animation wins that fight, since a
 * running CSS animation overrides an element's own inline style for any
 * property it targets. Nesting keeps them on separate elements: the outer
 * anchor holds the rest position (`--x`/`--y`) and takes the pointer's push
 * as an inline `transform`; the inner span keeps its own ambient wander
 * untouched. Both transforms are plain 2D translations, so they compose.
 */
function DustMotes({ isOpen }: { isOpen: boolean }) {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const field = fieldRef.current;
    if (!field) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anchorEls = Array.from(field.querySelectorAll<HTMLElement>('.work-dust-anchor'));
    const motes: { el: HTMLElement; x: number; y: number }[] = [];
    for (let i = 0; i < anchorEls.length; i++) {
      const el = anchorEls[i];
      const d = DUST[i];
      if (el && d) motes.push({ el, x: d.xFrac, y: d.yFrac });
    }

    let rect = field.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      rect = field.getBoundingClientRect();
    });
    observer.observe(field);

    // Eased, not snapped straight to the cursor — see `approach` above.
    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let hasPointer = false;

    const onPointerMove = (event: PointerEvent) => {
      targetX = (event.clientX - rect.left) / rect.width;
      targetY = (event.clientY - rect.top) / rect.height;
      hasPointer = true;
    };
    window.addEventListener('pointermove', onPointerMove);

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (hasPointer) {
        pointerX = approach(pointerX, targetX, 1.7, dt);
        pointerY = approach(pointerY, targetY, 1.7, dt);
      }
      // Same shape as `fieldVert`'s own "--- pointer ---" block — aspect-
      // corrected distance, exponential falloff — but not the same constants.
      // That shader's 7.0/0.055 pair is tuned for a canvas spanning the whole
      // scrolling page: "close to the pointer" there still covers most of a
      // viewport out of 18,067 points, so the push reads as widespread. Ported
      // literally onto a ~800px-wide dialog with 90 points, the same falloff
      // only reaches motes within roughly 100px of the cursor — everything
      // else gets a sub-pixel nudge that just looks inert. REPEL_FALLOFF is
      // loosened (not the shape, just the radius) so a couple dozen motes
      // clear their neighborhood as the cursor passes, the same proportion of
      // the field the shader moves, scaled to how few points there are here.
      const REPEL_FALLOFF = 20.0;
      const REPEL_STRENGTH = 0.06;
      const aspect = rect.width / rect.height;
      for (const mote of motes) {
        const dx = (mote.x - pointerX) * aspect;
        const dy = mote.y - pointerY;
        const dist2 = dx * dx + dy * dy;
        const pull = Math.exp(-dist2 * REPEL_FALLOFF) * REPEL_STRENGTH;
        const len = Math.sqrt(dist2) + 1e-5;
        const offsetX = ((dx / len) * pull * rect.width).toFixed(2);
        const offsetY = ((dy / len) * pull * rect.height).toFixed(2);
        mote.el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      observer.disconnect();
      for (const mote of motes) mote.el.style.transform = '';
    };
  }, [isOpen]);

  return (
    <div className="work-dust-field" aria-hidden="true" style={{ backgroundImage: DUST_TILE_URL }} ref={fieldRef}>
      {DUST.map((d, i) => (
        <span key={i} className="work-dust-anchor" style={{ '--x': d.x, '--y': d.y, '--size': d.size } as CSSProperties}>
          <span
            className="work-dust"
            style={
              {
                '--peak': d.peak,
                '--dx': d.dx,
                '--dy': d.dy,
                '--duration': d.duration,
                '--delay': d.delay,
              } as CSSProperties
            }
          />
        </span>
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
          <DustMotes isOpen={isOpen} />
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
