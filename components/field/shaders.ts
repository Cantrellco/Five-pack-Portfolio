/**
 * The ink field, written by hand.
 *
 * Art direction is pen plotter, not particle system: fine dark marks on warm
 * paper, tone built from density. Nothing glows, nothing blooms, and the
 * blending is ordinary alpha — additive blending on a light background only
 * ever washes out to grey.
 *
 * Positions bypass three's projection entirely and are written straight to clip
 * space. There is no camera to configure and no matrix multiply per vertex; the
 * field is a full-bleed 0..1 canvas and the shader owns the mapping.
 */

export const fieldVert = /* glsl */ `
precision highp float;

// Declared explicitly: three.js used to inject the position attribute for us.
// The renderer is written directly against WebGL now, so every attribute is
// named here. (No backticks in this file — it is one big template literal.)
attribute vec3 position; // x: time 0..1, y: intensity 0..1, z: unused
attribute vec3 aMeta;    // x: vertex index, y: set volume 0..1, z: lift index

uniform float uTime;
uniform float uAspect;
uniform float uPixelRatio;
uniform float uDensity;    // 1 full, lower on weak hardware
uniform vec2  uPointer;    // smoothed, 0..1 space
uniform vec2  uR2;         // low-discrepancy constants, from the manifest
uniform float uCalm;       // 1 below the two-pane breakpoint: phone profile

varying float vAlpha;

void main() {
  float index     = aMeta.x;
  float volume    = aMeta.y;
  float lift      = aMeta.z;
  float intensity = position.y;   // 0..1 estimated one-rep max

  // R2, the two-dimensional low-discrepancy sequence. It scatters far more
  // evenly than hash noise — no clumps, no visible lattice — which is what
  // gives a plotter drawing its even tone. Computed from the index alone, so
  // nothing per-point needs storing and the static poster reproduces it exactly.
  vec2 r2 = fract(vec2(index * uR2.x, index * uR2.y));

  // Even scattered, the drawing is still the data: intensity biases height, so
  // heavy sets sit high in the field.
  vec2 p = vec2(r2.x, r2.y * 0.65 + intensity * 0.35);

  // --- drift ----------------------------------------------------------------
  // A slow, cheap flow. Ambient, not tied to scroll -- runs the same whether
  // the page has moved or not. The calm profile halves both the speed and the
  // amplitude: on a phone the field is a ground, not a spectacle.
  float t = uTime * mix(0.055, 0.028, uCalm);
  vec2 flow = vec2(
    sin(p.y * 6.1 + t + index * 0.0007),
    cos(p.x * 5.3 - t * 0.83 + index * 0.0011)
  ) * mix(0.011, 0.006, uCalm);
  p += flow;

  // --- pointer --------------------------------------------------------------
  // Weight and inertia, not a snappy repel: the uniform itself is eased on the
  // CPU, and the falloff here is wide and shallow. Off entirely in the calm
  // profile -- on a touch screen the only pointer is the finger that is also
  // scrolling, and a field that shifts under every scroll reads as noise.
  vec2 pa = vec2(p.x * uAspect, p.y);
  vec2 ma = vec2(uPointer.x * uAspect, uPointer.y);
  vec2 d = pa - ma;
  float dist2 = dot(d, d);
  float pull = exp(-dist2 * 7.0) * 0.055 * (1.0 - uCalm);
  p += normalize(d + vec2(1e-5)) * pull;

  // --- the wandering lens (calm profile only) -------------------------------
  // The phone's stand-in for the pointer: a slow lens that roams the canvas
  // on its own, gently parting the marks as it passes. Two incommensurate
  // frequencies keep its path from ever visibly repeating; computed from
  // uTime alone, so it costs no state and no events.
  vec2 lens = vec2(0.5 + 0.32 * sin(uTime * 0.047), 0.5 + 0.27 * cos(uTime * 0.036));
  vec2 la = vec2(lens.x * uAspect, lens.y);
  vec2 dl = pa - la;
  float lensPull = exp(-dot(dl, dl) * 5.0) * 0.03 * uCalm;
  p += normalize(dl + vec2(1e-5)) * lensPull;

  // --- adaptive thinning ------------------------------------------------------
  // Drop a deterministic slice of the points rather than fading everything,
  // which keeps the marks that remain crisp instead of grey. Density-only --
  // full field at full quality, thinned only when frame times slip.
  float lot = fract(index * 0.6180339887);
  float cull = clamp(1.0 - uDensity, 0.0, 0.82);
  float alive = step(cull, lot);

  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);

  // Heavier sets draw slightly bigger and darker; the lift index nudges size so
  // the eight bands do not read as one uniform texture. The calm profile ships
  // a quarter of the points and takes only a small size bump in return -- the
  // point of thinning is a quieter field, not the same tone in fewer marks.
  float size = (0.85 + volume * 1.5 + mod(lift, 2.0) * 0.12) * uPixelRatio;
  gl_PointSize = size * (1.0 + uCalm * 0.2) * alive;

  float ink = 0.15 + volume * 0.2;
  vAlpha = ink * alive;
}
`;

export const fieldFrag = /* glsl */ `
precision mediump float;

uniform vec3 uInk;
varying float vAlpha;

void main() {
  // A round mark with a soft edge. No glow, no halo — a pen touching paper.
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  float mask = 1.0 - smoothstep(0.16, 0.25, r);
  if (mask <= 0.0) discard;
  gl_FragColor = vec4(uInk, vAlpha * mask);
}
`;
