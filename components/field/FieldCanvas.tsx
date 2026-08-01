'use client';

import { useEffect, useRef } from 'react';
import { createFieldRenderer, type FieldRenderer } from './renderer';
import { loadField } from './load';

/**
 * The single persistent canvas. Mounted once, fixed behind the document, never
 * unmounted and never re-created per section — the scroll position is a
 * uniform, not a new scene.
 *
 * React's only jobs here are owning the element and the lifecycle. Everything
 * per-frame lives in the renderer, outside the component tree, so nothing the
 * field does can cause a render.
 */
export default function FieldCanvas({
  calm,
  onReady,
  onLost,
}: {
  /** The phone profile — decided by FieldMount, which remounts this
   *  component (new `key`) when a desktop window crosses the breakpoint. */
  calm: boolean;
  onReady: () => void;
  onLost: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();
    let renderer: FieldRenderer | null = null;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // Below the two-pane breakpoint the field runs calm: a quarter of the
    // points, and the renderer swaps the pointer tug for its own slow wander.
    loadField(controller.signal, calm ? 4 : 1)
      .then((data) => {
        if (controller.signal.aborted) return;
        renderer = createFieldRenderer(canvas, data, calm);
        onReady();
      })
      .catch((error: unknown) => {
        if ((error as Error).name === 'AbortError') return;
        // The poster stays up. Nothing else on the page depends on this.
        console.warn('[field] could not start, staying on the static frame:', error);
        onLost();
      });

    return () => {
      controller.abort();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      renderer?.destroy();
      // A breakpoint crossing remounts this component; the poster covers the
      // gap while the replacement loads, exactly as it does for a lost
      // context. On final unmount the extra call is a no-op.
      onLost();
    };
  }, [calm, onReady, onLost]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
