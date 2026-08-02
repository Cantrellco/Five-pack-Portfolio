/**
 * The view-source layer's copy — the note a reader finds at the top of
 * <body> and the single console line. The words live here, per the house
 * rule that components import copy rather than inline it; app/layout.tsx
 * owns how they are emitted (the HTML comment wrapper, the console.info
 * call).
 *
 * CONSTRAINT: `sourceNote` is emitted inside an HTML comment. It must never
 * contain a double hyphen — `--` closes a comment early and would dump the
 * rest of the note into the visible document. Em dashes are fine; `--` in
 * any form is not.
 */
export const sourceNote = `Hello, source reader. The scatter behind this page is raw WebGL: one
  program, two buffers, one draw call per frame, no 3D library. Everything
  you can read is real DOM text — the canvas is aria-hidden decoration, and
  the page works with JavaScript off. There is a Konami code, and it does
  something to the field. Credits: /humans.txt. Security contact:
  /.well-known/security.txt.`;

/** The one line the site says to the console — info-level, and only one. */
export const consoleNote =
  'One WebGL program, one draw call per frame. The rest is HTML — view source, or /humans.txt.';
