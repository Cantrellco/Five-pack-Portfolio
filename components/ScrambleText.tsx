'use client';

import { useEffect, useRef } from 'react';
import { ease } from '@/lib/ease';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#/·+';
const DURATION_MS = 480;

/**
 * A kicker label's entrance: characters resolve out of a scramble rather
 * than fading up the way the rest of the reveal system does.
 *
 * Deliberately outside `data-reveal`/MotionProvider — its own
 * IntersectionObserver on the element itself, rather than that system's
 * passed/inView/ahead/dormant bookkeeping, is what lets this keep working
 * correctly across the deck's tab and dialog show-and-hide for free: a
 * hidden panel's kicker has no box to intersect, so the browser simply
 * reports it once the panel is actually shown, with nothing here needing to
 * know the deck exists.
 *
 * The real string is what server-renders and what this starts from — no-JS
 * and `prefers-reduced-motion` both see it plain, with nothing in between.
 */
export function ScrambleText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let settled = false;
    const chars = [...text];

    const observer = new IntersectionObserver(
      (entries) => {
        if (settled || !entries.some((entry) => entry.isIntersecting)) return;
        settled = true;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          const revealed = Math.floor(ease(t) * chars.length);
          el.textContent = chars
            .map((ch, i) => (ch === ' ' || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
            .join('');
          if (t < 1) raf = requestAnimationFrame(tick);
          else el.textContent = text;
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text]);

  return <span ref={ref}>{text}</span>;
}
