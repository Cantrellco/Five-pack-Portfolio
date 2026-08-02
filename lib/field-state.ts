/**
 * Shared state between the motion layer and the canvas.
 *
 * A plain mutable object, deliberately: the field reads it inside the render
 * loop, so pushing these values through React state would re-render a
 * component tree sixty times a second to change two floats.
 */
/**
 * Which presentation of the field the visitor actually has right now.
 * Written by FieldMount so anything that asks — a subscriber, or DevTools
 * via __inkField — sees this visit truthfully instead of the ideal one.
 */
export type FieldTier = 'static' | 'full' | 'calm';

export const fieldState = {
  /** Normalised pointer, -1..1. Driven by mouse move and by touch drag alike;
   *  eases back to the origin once a touch lifts. */
  pointerX: 0,
  pointerY: 0,
  /** False when the tab is hidden — the render loop parks itself. */
  visible: true,
  /** The presentation this visit ended up with. 'static' until the canvas
   *  reports itself live, which is also the truth of the server render. */
  tier: 'static' as FieldTier,
  /** A counter, not a boolean or a timestamp: the render loop's own frame
   *  clock (`time`, driven by `dt`) is what paces the morph once it starts,
   *  so all a trigger has to do is prove a NEW request arrived since the
   *  loop last checked. Incrementing does that without either side needing
   *  to agree on a clock. */
  morphTrigger: 0,
};

/* The tier gets a store interface as well: the render loop keeps its plain
   mutable reads, and any component that cares can subscribe
   (useSyncExternalStore) instead of polling a mutable object it could never
   be notified about. */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function subscribeFieldPresentation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getFieldTier = (): FieldTier => fieldState.tier;

export function setFieldTier(tier: FieldTier): void {
  if (fieldState.tier === tier) return;
  fieldState.tier = tier;
  emit();
}

/**
 * The Konami-code easter egg's one entry point. A no-op unless the canvas is
 * actually the thing on screen — with the static poster showing (reduced
 * motion, weak hardware, WebGL unavailable, or simply before the canvas has
 * loaded in) there is nothing to morph, and the field's own render loop is
 * the only reader of `morphTrigger`, so a bump nobody is running to see
 * would just sit there and fire the instant the canvas eventually did start.
 */
export function triggerFieldMorph(): void {
  if (fieldState.tier === 'static') return;
  fieldState.morphTrigger += 1;
}

declare global {
  interface Window {
    __inkField?: typeof fieldState;
  }
}

/**
 * Exposed deliberately. Anyone who opens DevTools to see whether the drawing
 * is really wired to anything finds the numbers that drive it.
 */
export function exposeFieldState() {
  if (typeof window !== 'undefined') window.__inkField = fieldState;
}
