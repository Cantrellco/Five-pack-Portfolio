/**
 * Shared state between the scroll layer and the canvas.
 *
 * A plain mutable object, deliberately: the field reads it inside the render
 * loop, so pushing these values through React state would re-render a
 * component tree sixty times a second to change two floats.
 */
export const fieldState = {
  /** 0 at the top of the document, 1 at the bottom. */
  progress: 0,
  /** 0 = abstract scatter, 1 = the real progression curve. Scrubbed across
   *  the field-note section, which is the only place structure appears. */
  resolve: 0,
  /** Normalised pointer, -1..1. Stays at origin on touch devices. */
  pointerX: 0,
  pointerY: 0,
  /** False when the tab is hidden — the render loop parks itself. */
  visible: true,
  /** Eased value actually on the GPU this frame. Written by the canvas. */
  liveResolve: 0,

  /**
   * Where the resolved plot draws, in DOCUMENT space and CSS pixels.
   *
   * The page reserves a figure for the chart and labels its axes in real DOM
   * text; the canvas reads that element's box and draws inside it. Measuring
   * in document space means the per-frame conversion is one scrollY read and
   * no layout is forced in the render loop.
   */
  plot: { left: 0, top: 0, width: 0, height: 0, measured: false },
};

/** Reads the figure's box. Call on resize and after a ScrollTrigger refresh —
 *  never inside the render loop. */
export function measurePlot() {
  const el = document.getElementById('field-plot');
  if (!el) return;
  const r = el.getBoundingClientRect();
  fieldState.plot = {
    left: r.left + window.scrollX,
    top: r.top + window.scrollY,
    width: r.width,
    height: r.height,
    measured: true,
  };
}

declare global {
  interface Window {
    __inkField?: typeof fieldState;
  }
}

/**
 * Exposed deliberately. The end-to-end tests assert that the field responds to
 * scroll, and anyone who opens DevTools to see whether the drawing is really
 * wired to anything finds the four numbers that drive it.
 */
export function exposeFieldState() {
  if (typeof window !== 'undefined') window.__inkField = fieldState;
}
