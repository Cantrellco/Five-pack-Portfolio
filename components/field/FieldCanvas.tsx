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
  onReady,
  onLost,
}: {
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

    loadField(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        renderer = createFieldRenderer(canvas, data);
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
    };
  }, [onReady, onLost]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
