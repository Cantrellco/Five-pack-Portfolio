'use client';

import { useEffect, useRef } from 'react';
import { profile } from '@/content/profile';

/**
 * The bio paragraphs, in their own client component so `About` itself stays
 * server-rendered — this is the one piece of that panel with any
 * interactivity at all: tracking scroll position to know when the
 * bottom-edge fade (`.about-bio` in globals.css) should hide itself.
 *
 * That fade is a CSS `mask-image` with no way to see actual scroll
 * position — a static mask always dims the box's bottom `3rem`, which
 * correctly reads as "there's more below" right up until a reader actually
 * reaches the end, where it then permanently dims the true last line for no
 * reason. `.is-at-bottom` is what turns the mask off at exactly that point;
 * see the CSS for the flip itself.
 *
 * Runs unconditionally rather than only below `lg`: the mask CSS is already
 * scoped to that breakpoint, so toggling this class above it is inert, and
 * checking the breakpoint here just to skip a scroll listener the desktop
 * layout never fires (its `.about-bio` does not scroll) is not worth a
 * second source of truth for the same breakpoint.
 */
export function AboutBio() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sub-pixel rounding between scrollTop/clientHeight/scrollHeight is
    // common (fractional zoom, some font metrics), not a real gap left to
    // close — without this slack the fade could stay stuck on by a
    // fraction of a pixel at the true end.
    const EPSILON = 2;

    const update = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - EPSILON;
      if (el.classList.contains('is-at-bottom') !== atBottom) {
        el.classList.toggle('is-at-bottom', atBottom);
      }
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    // Content that fits without scrolling at all (a tall phone, a wide
    // one wrapping to fewer lines) needs the same check re-run whenever
    // the box's own size changes, not just when it scrolls.
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="body-copy about-bio mt-[var(--sp-sm)]" ref={ref}>
      {profile.aboutBio.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}
