'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// The renderer lives behind this boundary. Nothing here is requested until
// `enabled` flips, which happens after load and during idle time — so the
// canvas cannot compete with first paint or with becoming interactive.
const FieldCanvas = dynamic(() => import('./FieldCanvas'), { ssr: false });

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
export function FieldMount() {
  const [enabled, setEnabled] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!canRunCanvas()) return;

    let cancelled = false;
    const begin = () => {
      const idle =
        typeof window.requestIdleCallback === 'function'
          ? window.requestIdleCallback
          : (cb: () => void) => window.setTimeout(cb, 200);
      idle(() => {
        if (!cancelled) setEnabled(true);
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
    requestAnimationFrame(() => requestAnimationFrame(() => setLive(true)));
  }, []);

  const onLost = useCallback(() => setLive(false), []);

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
      {enabled ? <FieldCanvas onReady={onReady} onLost={onLost} /> : null}
    </div>
  );
}
