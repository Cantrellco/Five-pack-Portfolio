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
  /** Normalised pointer, -1..1. Driven by mouse move and by touch drag alike;
   *  eases back to the origin once a touch lifts. */
  pointerX: 0,
  pointerY: 0,
  /** False when the tab is hidden — the render loop parks itself. */
  visible: true,
};

declare global {
  interface Window {
    __inkField?: typeof fieldState;
  }
}

/**
 * Exposed deliberately. The end-to-end tests assert that the field responds to
 * scroll, and anyone who opens DevTools to see whether the drawing is really
 * wired to anything finds the numbers that drive it.
 */
export function exposeFieldState() {
  if (typeof window !== 'undefined') window.__inkField = fieldState;
}
