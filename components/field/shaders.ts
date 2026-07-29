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
uniform float uProgress;   // 0 at the top of the document, 1 at the bottom
uniform float uResolve;    // 0 abstract scatter .. 1 the real progression plot
uniform float uAspect;
uniform float uPixelRatio;
uniform float uDensity;    // 1 full, lower on weak hardware
uniform vec2  uPointer;    // smoothed, 0..1 space
uniform vec2  uR2;         // low-discrepancy constants, from the manifest
uniform vec4  uPlot;       // the figure the page reserves: left, bottom, w, h

varying float vAlpha;

void main() {
  float index     = aMeta.x;
  float volume    = aMeta.y;
  float lift      = aMeta.z;
  float time      = position.x;   // 0..1 across the training history
  float intensity = position.y;   // 0..1 estimated one-rep max

  // --- abstract state -------------------------------------------------------
  // R2, the two-dimensional low-discrepancy sequence. It scatters far more
  // evenly than hash noise — no clumps, no visible lattice — which is what
  // gives a plotter drawing its even tone. Computed from the index alone, so
  // nothing per-point needs storing and the static poster reproduces it exactly.
  vec2 r2 = fract(vec2(index * uR2.x, index * uR2.y));

  // Even scattered, the drawing is still the data: intensity biases height, so
  // heavy sets sit high in the field before any of it resolves.
  vec2 pAbstract = vec2(r2.x, r2.y * 0.65 + intensity * 0.35);

  // --- structured state -----------------------------------------------------
  // The actual chart, drawn inside the figure the document reserves for it —
  // time across, estimated one-rep max up. The page owns the frame and labels
  // its axes in real text; the canvas only fills it.
  vec2 pStruct = vec2(uPlot.x + time * uPlot.z, uPlot.y + intensity * uPlot.w);

  vec2 p = mix(pAbstract, pStruct, uResolve);

  // --- migrate to the margins ----------------------------------------------
  // Full bleed over the hero, then pushed outward so the centre column stays
  // clean behind the text. Raising |x - 0.5| to a shrinking power moves mass
  // toward both edges while keeping the order of points intact.
  float margin = smoothstep(0.015, 0.30, uProgress) * (1.0 - uResolve);
  float c = p.x - 0.5;
  float s = c < 0.0 ? -1.0 : 1.0;  // named s so it cannot shadow the sign builtin
  float mag = pow(clamp(abs(c) * 2.0, 0.0, 1.0), 1.0 - 0.72 * margin);
  p.x = 0.5 + s * mag * 0.5;

  // --- drift ----------------------------------------------------------------
  // A slow, cheap flow. Held still while the plot is legible, and damped to
  // nothing as the footer arrives.
  float stillness = 1.0 - smoothstep(0.86, 1.0, uProgress);
  float t = uTime * 0.055;
  vec2 flow = vec2(
    sin(p.y * 6.1 + t + index * 0.0007),
    cos(p.x * 5.3 - t * 0.83 + index * 0.0011)
  ) * 0.011;
  p += flow * (1.0 - uResolve) * stillness;

  // --- pointer --------------------------------------------------------------
  // Weight and inertia, not a snappy repel: the uniform itself is eased on the
  // CPU, and the falloff here is wide and shallow.
  vec2 pa = vec2(p.x * uAspect, p.y);
  vec2 ma = vec2(uPointer.x * uAspect, uPointer.y);
  vec2 d = pa - ma;
  float dist2 = dot(d, d);
  float pull = exp(-dist2 * 7.0) * 0.055 * (1.0 - uResolve);
  p += normalize(d + vec2(1e-5)) * pull;

  // --- thinning -------------------------------------------------------------
  // Past the hero the field is a companion to the text, not the subject. Drop
  // a deterministic slice of the points rather than fading everything, which
  // keeps the marks that remain crisp instead of grey.
  float lot = fract(index * 0.6180339887);
  float cull = margin * 0.5 + (1.0 - uDensity);
  float alive = step(cull, lot);

  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);

  // Heavier sets draw slightly bigger and darker; the lift index nudges size so
  // the eight bands do not read as one uniform texture.
  float size = (0.85 + volume * 1.5 + mod(lift, 2.0) * 0.12) * uPixelRatio;
  gl_PointSize = size * mix(1.0, 1.55, uResolve) * alive;

  // Scattered, the field is a whisper behind the type. Gathered into the
  // figure it is a chart, and a chart has to be readable.
  float ink = mix(0.15 + volume * 0.2, 0.46 + volume * 0.3, uResolve);
  vAlpha = ink * mix(1.0, 0.62, margin) * alive;
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

/** The per-lift progression curve. Only visible while the field is resolved. */
export const trendVert = /* glsl */ `
precision highp float;

attribute vec3 position; // x: week 0..1, y: estimated one-rep max 0..1

uniform vec4 uPlot;

void main() {
  vec2 p = vec2(uPlot.x + position.x * uPlot.z, uPlot.y + position.y * uPlot.w);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const trendFrag = /* glsl */ `
precision mediump float;

uniform vec3 uInk;
uniform float uResolve;

void main() {
  // One-pixel hairlines — the "thin lines" half of the drawing. Crisp rather
  // than heavy: they read as a plotted curve, not as a highlight.
  gl_FragColor = vec4(uInk, 0.85 * smoothstep(0.3, 1.0, uResolve));
}
`;
