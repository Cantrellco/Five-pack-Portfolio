'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ease } from '@/lib/ease';
import { exposeFieldState, fieldState } from '@/lib/field-state';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const REVEAL = '[data-reveal]';
const START = 0.88; // reveal when the element's top passes 88% of the viewport

const settle = (els: HTMLElement[]) => {
  for (const el of els) el.style.willChange = 'auto';
};

/**
 * Smooth scroll and scroll choreography. Renders nothing.
 *
 * Lenis smooths the wheel; it does not hijack. No snapping, no section
 * locking, no preventDefault on touch — the scrollbar behaves exactly as the
 * platform intends, just with inertia.
 */
export function MotionProvider() {
  useGSAP(() => {
    // Tells the head script the reveal driver arrived, so its failsafe stands
    // down. Anything that fails before this line un-hides the page instead.
    document.documentElement.classList.add('reveal-ready');
    exposeFieldState();

    const all = gsap.utils.toArray<HTMLElement>(REVEAL);

    /**
     * From `lg` up the document does not scroll — the right pane does. Which
     * element is doing the scrolling decides which element ScrollTrigger
     * observes, and whether Lenis runs at all.
     *
     * Below `lg` this is null and everything behaves exactly as it did when
     * the page was one long document.
     */
    const paneQuery = window.matchMedia('(min-width: 64rem)');
    const pane = paneQuery.matches
      ? (document.getElementById('deck-scroller') as HTMLElement | null)
      : null;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      document.documentElement.classList.remove('js');
      gsap.set(all, { clearProps: 'opacity,transform,willChange' });
      return;
    }

    // ScrollTrigger has to observe the same element the reader is scrolling.
    if (pane) ScrollTrigger.defaults({ scroller: pane });

    // Split by where things start out, rather than leaving it to ScrollTrigger
    // to work out — a deep-link load must not animate half the document.
    //
    // `dormant` is the deck's doing: an element inside a panel or dialog that
    // is not showing has no box at all. Measuring it would put it in `inView`
    // — top and bottom both zero — and it would play its reveal against
    // hidden content, so switching to that tab would show everything already
    // faded up. Elements with no client rect are left alone here; `onDeckChange`
    // below is what actually reveals them once their panel or dialog arrives.
    const passed: HTMLElement[] = [];
    const inView: HTMLElement[] = [];
    const ahead: HTMLElement[] = [];
    const dormant: HTMLElement[] = [];
    for (const el of all) {
      if (el.getClientRects().length === 0) {
        dormant.push(el);
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0) passed.push(el);
      else if (rect.top < window.innerHeight * START) inView.push(el);
      else ahead.push(el);
    }

    // GSAP warns on empty target lists, and "zero console warnings" is a hard
    // requirement here, so each group is only handed over if it has members.
    if (passed.length) gsap.set(passed, { opacity: 1, y: 0, willChange: 'auto' });

    if (inView.length) {
      gsap.to(inView, {
        opacity: 1,
        y: 0,
        duration: 0.56,
        ease,
        stagger: 0.05,
        onComplete: () => settle(inView),
      });
    }

    if (ahead.length) ScrollTrigger.batch(ahead, {
      start: `top ${START * 100}%`,
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.56,
          ease,
          stagger: 0.05,
          overwrite: true,
          onComplete: () => settle(batch as HTMLElement[]),
        }),
    });

    /**
     * Lenis smooths the window's scroll. When the pane is the scroller there is
     * no window scroll left to smooth, and pointing Lenis at a nested wrapper
     * means it takes over that element's scrolling entirely — which is the
     * scroll-jacking this site refuses to do. So the pane scrolls natively, and
     * Lenis runs only in the single-column layout it was written for.
     */
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    if (!pane) {
      lenis = new Lenis({
        duration: 1.05,
        easing: ease,
        smoothWheel: true,
        // Touch stays native. Smoothing it is where scroll-jacking starts and
        // where mobile scroll performance ends.
        syncTouch: false,
      });

      lenis.on('scroll', () => {
        ScrollTrigger.update();
      });

      tick = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      fieldState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      fieldState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Touch gets its own listeners rather than reusing `onPointer`: Pointer
    // Events fire for touch too, but a `preventDefault`-free, passive-only
    // touch path is what keeps this from ever being able to interfere with
    // native scroll -- the same "touch stays native" rule Lenis follows
    // above (`syncTouch: false`). Nothing here calls `preventDefault`, so a
    // finger dragging across the field also scrolls the page underneath it,
    // exactly as it would with no listener at all.
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      fieldState.pointerX = (t.clientX / window.innerWidth) * 2 - 1;
      fieldState.pointerY = -((t.clientY / window.innerHeight) * 2 - 1);
    };
    // A lifted finger leaves no pointer behind it the way a mouse does --
    // there is nothing left hovering -- so the pull eases back to centre
    // instead of staying pinned at the last touch point indefinitely.
    const onTouchEnd = () => {
      fieldState.pointerX = 0;
      fieldState.pointerY = 0;
    };
    window.addEventListener('touchstart', onTouchMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    const onVisibility = () => {
      fieldState.visible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    // The active tab's underline doubles as a read-progress bar: `.tab`'s own
    // CSS scales it by `--tab-progress` (globals.css), and this is the only
    // thing that ever writes that variable. Wired only when `pane` is the
    // scroller — below `lg` the tab row is `hidden` and there is nothing to
    // drive — and rAF-throttled since `scroll` can fire faster than a frame.
    let progressRaf = 0;
    const updateTabProgress = () => {
      if (!pane) return;
      const max = pane.scrollHeight - pane.clientHeight;
      const progress = max <= 0 ? 1 : Math.min(1, Math.max(0, pane.scrollTop / max));
      document.documentElement.style.setProperty('--tab-progress', String(progress));
    };
    const onPaneScroll = () => {
      if (progressRaf) return;
      progressRaf = requestAnimationFrame(() => {
        progressRaf = 0;
        updateTabProgress();
      });
    };
    if (pane) {
      updateTabProgress();
      pane.addEventListener('scroll', onPaneScroll, { passive: true });
    }

    ScrollTrigger.refresh();

    // A panel swap replaces the document under the scroll layer: the height
    // changes and every trigger's start and end move. Refreshing recomputes
    // all of that in one pass.
    //
    // The panel that just appeared then plays the reveal its elements never
    // got at mount, so each tab reads as a document arriving rather than as
    // one that was already there.
    //
    // Sweeps `all`, not the pre-computed `dormant` list. `dormant` is a
    // snapshot taken once, synchronously, in this same mount effect — and a
    // `<dialog>` that starts unenhanced-open (the no-JS fallback) can still
    // be sitting open at that exact instant, one render before enhancement
    // closes it, which mis-classifies its contents as "ahead" instead of
    // "dormant". `ahead` gets its own ScrollTrigger, but one keyed to a
    // position captured while the dialog was still open — worthless once the
    // dialog actually closes and the element goes to zero size. Re-scanning
    // the full list here costs one pass over a few hundred elements, on an
    // event that fires only on an explicit panel or project change, never on
    // scroll.
    const onDeckChange = () => {
      ScrollTrigger.refresh();
      updateTabProgress();

      const arrived = all.filter(
        (el) => el.getClientRects().length > 0 && Number(gsap.getProperty(el, 'opacity')) < 1,
      );
      if (!arrived.length) return;

      gsap.to(arrived, {
        opacity: 1,
        y: 0,
        duration: 0.56,
        ease,
        stagger: 0.05,
        overwrite: true,
        onComplete: () => settle(arrived),
      });
    };
    window.addEventListener('deck:change', onDeckChange);

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('deck:change', onDeckChange);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pane) pane.removeEventListener('scroll', onPaneScroll);
      if (progressRaf) cancelAnimationFrame(progressRaf);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      ScrollTrigger.defaults({ scroller: undefined });
    };
  }, []);

  return null;
}
