'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ease } from '@/lib/ease';
import { exposeFieldState, fieldState, measurePlot } from '@/lib/field-state';

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

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      fieldState.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      document.documentElement.classList.remove('js');
      gsap.set(all, { clearProps: 'opacity,transform,willChange' });
      readProgress();
      measurePlot();
      window.addEventListener('scroll', readProgress, { passive: true });
      window.addEventListener('resize', measurePlot);
      return () => {
        window.removeEventListener('scroll', readProgress);
        window.removeEventListener('resize', measurePlot);
      };
    }

    // Split by where things start out, rather than leaving it to ScrollTrigger
    // to work out — a deep-link load must not animate half the document.
    const passed: HTMLElement[] = [];
    const inView: HTMLElement[] = [];
    const ahead: HTMLElement[] = [];
    for (const el of all) {
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

    const lenis = new Lenis({
      duration: 1.05,
      easing: ease,
      smoothWheel: true,
      // Touch stays native. Smoothing it is where scroll-jacking starts and
      // where mobile scroll performance ends.
      syncTouch: false,
    });

    lenis.on('scroll', () => {
      ScrollTrigger.update();
      readProgress();
    });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // The one moment the field resolves into legible structure, scrubbed
    // across the section that explains it, then dissolved again.
    // Anchored to the figure, not to the section: the plot is fully resolved
    // exactly while the box it draws into is on screen, and dissolves as that
    // box leaves. Gathering and scattering stay tied to the thing being framed.
    const resolveTrigger = ScrollTrigger.create({
      trigger: '#field-plot',
      start: 'top 96%',
      end: 'bottom 4%',
      onUpdate: (self) => {
        const p = self.progress;
        fieldState.resolve = p < 0.3 ? p / 0.3 : p > 0.78 ? Math.max(0, (1 - p) / 0.22) : 1;
      },
    });

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      fieldState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      fieldState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const onVisibility = () => {
      fieldState.visible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    readProgress();
    ScrollTrigger.refresh();

    // The canvas draws into a box the document owns, so that box has to be
    // re-measured whenever layout can have moved: on resize, on every
    // ScrollTrigger refresh, and once the webfonts have settled.
    measurePlot();
    window.addEventListener('resize', measurePlot);
    ScrollTrigger.addEventListener('refresh', measurePlot);
    void document.fonts?.ready.then(measurePlot);

    return () => {
      window.removeEventListener('resize', measurePlot);
      ScrollTrigger.removeEventListener('refresh', measurePlot);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      resolveTrigger.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
