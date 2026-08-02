'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { setFieldTier } from '@/lib/field-state';

// The renderer lives behind this boundary. Nothing here is requested until
// `enabled` flips, which happens after load and during idle time — so the
// canvas cannot compete with first paint or with becoming interactive.
const FieldCanvas = dynamic(() => import('./FieldCanvas'), { ssr: false });

/**
 * First visit or not, asked once per page load and memoised at module scope:
 * StrictMode double-runs effects in dev, and the second run must not read
 * the flag the first run just wrote. Reduced-motion visitors never reach
 * this (canRunCanvas already keeps the canvas off), but the check is repeated
 * here so the decision is safe on its own. Storage that throws — private-mode
 * Safari — means no ceremony, which is the right failure: the field simply
 * appears, exactly as it does on every return visit.
 */
const INTRO_KEY = 'field-intro-seen';
let introDecision: boolean | null = null;
function shouldRunIntro(): boolean {
  if (introDecision === null) {
    try {
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.localStorage.getItem(INTRO_KEY) !== null
      ) {
        introDecision = false;
      } else {
        window.localStorage.setItem(INTRO_KEY, '1');
        introDecision = true;
      }
    } catch {
      introDecision = false;
    }
  }
  return introDecision;
}

/* Once per page LOAD, not once per canvas: crossing the 64rem breakpoint
   remounts FieldCanvas via `key`, and a remount that replayed the 2.2s
   ink-down mid-session would blank the field just to redraw it. Latched the
   moment a canvas reports ready and read at render time, so the next mount,
   whatever caused it, arrives with the entrance already spent. */
let introPlayed = false;

/** Every reason not to run a canvas, asked once. */
function canRunCanvas(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  // Two cores is a phone that has better things to do with them.
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0 && cores <= 2) return false;

  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) return false;
    // Release the probe context immediately; browsers cap how many exist.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Chooses between the live field and its static frame, and renders the frame
 * either way.
 *
 * The poster is server-rendered, so it is in the HTML with no JavaScript at
 * all. When the canvas is viable it loads behind the poster and cross-fades in
 * once its data has arrived — there is never a blank rectangle, and if the
 * WebGL context is later lost the poster simply comes back.
 */
/* The calm (phone) profile cuts the point buffer at load time, so it cannot
   be adjusted on a live renderer — crossing 64rem remounts the canvas via
   `key` instead, which re-fetches (from cache) and rebuilds at the right
   density. Phones never fire the change event; it exists for desktop windows
   dragged across the breakpoint, which would otherwise keep the wrong field
   for the rest of the session. An external store rather than state set from
   an effect — same reasoning as DeckContext's `enhanced`. */
const CALM_QUERY = '(max-width: 63.999rem)';
const subscribeCalm = (onChange: () => void) => {
  const mq = window.matchMedia(CALM_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const calmNow = () => window.matchMedia(CALM_QUERY).matches;
const calmOnServer = () => false;

export function FieldMount() {
  const [enabled, setEnabled] = useState(false);
  const [live, setLive] = useState(false);
  const [intro, setIntro] = useState(false);
  const calm = useSyncExternalStore(subscribeCalm, calmNow, calmOnServer);

  useEffect(() => {
    if (!canRunCanvas()) return;

    let cancelled = false;
    const begin = () => {
      const idle =
        typeof window.requestIdleCallback === 'function'
          ? window.requestIdleCallback
          : (cb: () => void) => window.setTimeout(cb, 200);
      idle(() => {
        if (!cancelled) {
          // Decided here, at the same moment the canvas is allowed to exist,
          // so the entrance and the canvas arrive as one thing.
          setIntro(shouldRunIntro());
          setEnabled(true);
        }
      });
    };

    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', begin);
    };
  }, []);

  // Two frames after the data lands the canvas has painted, so the poster can
  // go without a gap.
  const onReady = useCallback(() => {
    // However this canvas arrived, the entrance is spent for this page load —
    // a later breakpoint remount cross-fades in, it does not replay the
    // ceremony. (FieldCanvas snapshots the intro prop at mount, so flipping
    // the flag here cannot disturb the canvas that is drawing it right now.)
    introPlayed = true;
    requestAnimationFrame(() => requestAnimationFrame(() => setLive(true)));
  }, []);

  const onLost = useCallback(() => setLive(false), []);

  // The truth of this visit, published to the field-state store. An effect,
  // not a render-time write: the store must only change after commit, and
  // 'static' — the initial value — is already correct until then.
  useEffect(() => {
    setFieldTier(live ? (calm ? 'calm' : 'full') : 'static');
  }, [live, calm]);

  return (
    <div className="field-layer" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG
          drawn from the same data; next/image would only add a request. */}
      <img
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/field/poster.svg`}
        alt=""
        className="field-poster"
        data-hidden={live}
        width={1600}
        height={1000}
        decoding="async"
      />
      {enabled ? (
        <FieldCanvas
          key={calm ? 'calm' : 'full'}
          calm={calm}
          intro={intro && !introPlayed}
          onReady={onReady}
          onLost={onLost}
        />
      ) : null}
    </div>
  );
}
