/**
 * Precomputes the ink field from data/training.json.
 *
 *   node scripts/build-field-data.mjs        (runs automatically on `prebuild`)
 *
 * Writes three artefacts into public/field/:
 *
 *   field-v1.bin      Quantised point buffer. 6 bytes per point, three
 *                     Uint16s: [time, intensity, packed]. The browser parses
 *                     no JSON and computes no positions — it uploads this
 *                     straight into a BufferGeometry.
 *   manifest.json     Counts, ranges, lift names, and the two R2 constants.
 *                     The shader and the poster both read their scatter
 *                     constants from here, so the static fallback and the
 *                     live canvas cannot drift.
 *   poster.svg        The static frame, drawn from the same points with the
 *                     same layout maths. Shown when WebGL is unavailable,
 *                     reduced motion is set, or JavaScript is off.
 *
 * Nothing here is random. Every point is one logged rep.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/field');

/**
 * R2 — the two-dimensional low-discrepancy sequence. `fract(i * A1)` and
 * `fract(i * A2)` give a far more even scatter than hash noise, which is what
 * a plotter drawing wants: no clumps, no visible grid. Derived from the plastic
 * number, so both the shader and the poster get identical positions from an
 * index alone and no per-point scatter needs to be stored.
 */
const PLASTIC = 1.324717957244746;
const R2_A1 = 1 / PLASTIC; //  0.7548776662466927
const R2_A2 = 1 / (PLASTIC * PLASTIC); //  0.5698402909980532

/** Points shipped. Above this the buffer is evenly sampled — and said so. */
const MAX_POINTS = 24000;

/** Points drawn into the static poster. Enough to match the canvas's tone
 *  without the SVG outgrowing the buffer it stands in for. */
const POSTER_POINTS = 6000;

const data = JSON.parse(readFileSync(resolve(ROOT, 'data/training.json'), 'utf8'));
const liftIndex = new Map(data.lifts.map((l, i) => [l.id, i]));
if (data.lifts.length > 16) throw new Error('packed field allows 16 lifts (4 bits)');

/** Epley. Puts a heavy triple and a light set of ten on one comparable axis. */
const e1rm = (weight, reps) => weight * (1 + reps / 30);

const dayMs = 86400000;
const t0 = Date.parse(data.sessions[0].date);
const t1 = Date.parse(data.sessions[data.sessions.length - 1].date);
const span = t1 - t0;

// ---------------------------------------------------------------- pass one
// Expand every logged set into its reps and measure the ranges.

const reps = [];
let minRm = Infinity;
let maxRm = -Infinity;
let maxVolume = 0;
let totalVolume = 0;

for (const session of data.sessions) {
  const time = (Date.parse(session.date) - t0) / span;
  for (const entry of session.entries) {
    const lift = liftIndex.get(entry.lift);
    if (lift === undefined) throw new Error(`unknown lift: ${entry.lift}`);
    for (const set of entry.logged) {
      const rm = e1rm(set.weight, set.reps);
      const volume = set.weight * set.reps;
      if (rm < minRm) minRm = rm;
      if (rm > maxRm) maxRm = rm;
      if (volume > maxVolume) maxVolume = volume;
      totalVolume += volume;
      for (let r = 0; r < set.reps; r += 1) {
        reps.push({ time, rm, volume, lift, rep: r });
      }
    }
  }
}

// ---------------------------------------------------------------- pass two
// Even sampling if the history is denser than the budget. Fractional stride
// so the thinning is uniform across the whole timeline, not just the tail.

const total = reps.length;
let sampled = reps;
let stride = 1;
if (total > MAX_POINTS) {
  stride = total / MAX_POINTS;
  sampled = [];
  for (let i = 0; i < MAX_POINTS; i += 1) sampled.push(reps[Math.floor(i * stride)]);
  console.log(
    `field: sampled ${MAX_POINTS} of ${total} reps (every ${stride.toFixed(2)}) to stay inside the transfer budget`,
  );
} else {
  console.log(`field: shipping all ${total} reps, no sampling`);
}

// ---------------------------------------------------------------- quantise
// [time, intensity, packed] — 6 bytes per point.
//   packed = lift (4 bits) | volume (6 bits) | rep index within set (6 bits)

const U16 = 65535;
const buffer = new Uint16Array(sampled.length * 3);
const rmRange = maxRm - minRm;

sampled.forEach((p, i) => {
  const intensity = (p.rm - minRm) / rmRange;
  const volume = Math.min(63, Math.round((p.volume / maxVolume) * 63));
  const rep = Math.min(63, p.rep);
  buffer[i * 3] = Math.round(p.time * U16);
  buffer[i * 3 + 1] = Math.round(intensity * U16);
  buffer[i * 3 + 2] = ((p.lift & 0xf) << 12) | ((volume & 0x3f) << 6) | (rep & 0x3f);
});

// ------------------------------------------------------------------- trend
// Weekly best e1RM per lift. The actual progression curve, not a decorative
// spline — drawn into trend.svg for the link-preview image.

const weeks = Math.ceil(span / dayMs / 7);
const best = data.lifts.map(() => new Array(weeks).fill(0));

for (const session of data.sessions) {
  const week = Math.min(weeks - 1, Math.floor((Date.parse(session.date) - t0) / dayMs / 7));
  for (const entry of session.entries) {
    const lift = liftIndex.get(entry.lift);
    for (const set of entry.logged) {
      const rm = e1rm(set.weight, set.reps);
      if (rm > best[lift][week]) best[lift][week] = rm;
    }
  }
}

const trend = data.lifts.map((lift, i) => ({
  id: lift.id,
  name: lift.name,
  // [x, y] in 0..1, gaps (deloads off, weeks not trained) dropped rather than
  // interpolated — the curve should not invent weeks that did not happen.
  points: best[i]
    .map((rm, w) => (rm > 0 ? [+(w / (weeks - 1)).toFixed(4), +((rm - minRm) / rmRange).toFixed(4)] : null))
    .filter(Boolean),
}));

// ---------------------------------------------------------------- manifest

const manifest = {
  version: 1,
  buffer: '/field/field-v1.bin',
  count: sampled.length,
  stride: 3,
  bytesPerPoint: 6,
  r2: [R2_A1, R2_A2],
  placeholderData: data.placeholder === true,
  range: {
    from: data.sessions[0].date,
    to: data.sessions[data.sessions.length - 1].date,
    minE1rm: +minRm.toFixed(1),
    maxE1rm: +maxRm.toFixed(1),
    unit: data.unit,
  },
  totals: {
    sessions: data.sessions.length,
    sets: data.sessions.reduce((n, s) => n + s.entries.reduce((m, e) => m + e.logged.length, 0), 0),
    reps: total,
    // Rounded to the nearest thousand — the exact figure implies a precision
    // that a training log does not have.
    volumeLb: Math.round(totalVolume / 1000) * 1000,
    months: Math.round(span / dayMs / 30.44),
  },
  sampling: { shipped: sampled.length, of: total, stride: +stride.toFixed(3) },
  lifts: data.lifts.map((l, i) => ({ ...l, index: i })),
};

// ------------------------------------------------------------------ poster
// Same points, same R2 scatter, same vertical bias as the shader's hero state.
// Emitted as one <path> of relative moves: spatially sorted so the deltas stay
// small, which is what keeps a 3,600-point drawing down to a few KB gzipped.

const VB_W = 1600;
const VB_H = 1000;
const posterStride = Math.max(1, Math.floor(sampled.length / POSTER_POINTS));

const posterPoints = [];
for (let i = 0; i < sampled.length; i += posterStride) {
  const intensity = buffer[i * 3 + 1] / U16;
  const packed = buffer[i * 3 + 2];
  const volume = ((packed >> 6) & 0x3f) / 63;

  // Keep in sync with hero-state placement in field.vert.glsl.
  const rx = (i * R2_A1) % 1;
  const ry = (i * R2_A2) % 1;
  const x = rx;
  const y = ry * 0.65 + intensity * 0.35;

  posterPoints.push({
    x: Math.round(x * VB_W),
    y: Math.round((1 - y) * VB_H),
    v: volume,
  });
}

posterPoints.sort((a, b) => {
  const band = Math.floor(a.y / 24) - Math.floor(b.y / 24);
  return band !== 0 ? band : a.x - b.x;
});

let px = 0;
let py = 0;
let d = '';
for (const p of posterPoints) {
  d += `m${p.x - px} ${p.y - py}h.5`;
  // The h command leaves the pen half a unit to the right of the mark, and the
  // next move is relative to where the pen actually is. Forgetting this drifts
  // the whole drawing left by half a unit per point.
  px = p.x + 0.5;
  py = p.y;
}

const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice" role="presentation">
<title>Two years of logged training sets, drawn as an ink field</title>
<path d="M0 0${d}" fill="none" stroke="#171512" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.34"/>
</svg>
`;

// -------------------------------------------------------------- trend.svg
// The per-lift progression curve, stretched to fill its box
// (preserveAspectRatio="none"). Embedded in the link-preview image
// (app/opengraph-image.tsx) — the canvas itself never draws this.

const TW = 1000;
const TH = 300;
const polylines = trend
  .map((lift) => {
    const d = lift.points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * TW).toFixed(1)} ${((1 - y) * TH).toFixed(1)}`)
      .join('');
    return `<path d="${d}"/>`;
  })
  .join('');

const trendSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="none" role="img" aria-label="Estimated one-rep max per lift, rising over ${manifest.totals.months} months">
<g fill="none" stroke="#171512" stroke-width="1.25" stroke-opacity="0.62" stroke-linejoin="round" vector-effect="non-scaling-stroke">${polylines}</g>
</svg>
`;

// ------------------------------------------------------------------- write

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'field-v1.bin'), Buffer.from(buffer.buffer));
writeFileSync(resolve(OUT, 'manifest.json'), `${JSON.stringify(manifest)}\n`);
writeFileSync(resolve(OUT, 'poster.svg'), poster);

// trend.svg has exactly one reader (app/opengraph-image.tsx), which renders
// on the Cloudflare Workers runtime — no filesystem, so it cannot `readFile`
// a public/ asset at request time. Emitted as a string constant instead of a
// public file so there is nothing to read.
mkdirSync(resolve(ROOT, 'lib/generated'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'lib/generated/og-trend.ts'),
  `// GENERATED by scripts/build-field-data.mjs — do not edit.\n` +
    `export const ogTrendSvg = ${JSON.stringify(trendSvg)};\n`,
);

// The handful of figures the page states in prose, emitted as a typed module
// so the copy cannot drift from the data it describes. Deliberately excludes
// the trend arrays — those belong to the canvas and stay out of the bundle.
mkdirSync(resolve(ROOT, 'lib/generated'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'lib/generated/field-stats.ts'),
  `// GENERATED by scripts/build-field-data.mjs — do not edit.\n` +
    `export const fieldStats = ${JSON.stringify(
      {
        ...manifest.totals,
        ...manifest.range,
        points: manifest.count,
        placeholder: manifest.placeholderData,
        liftNames: data.lifts.map((l) => l.name),
      },
      null,
      2,
    )} as const;\n`,
);

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
console.log(
  [
    `field-v1.bin   ${kb(buffer.byteLength)}  (${sampled.length} points)`,
    `manifest.json  ${kb(Buffer.byteLength(JSON.stringify(manifest)))}`,
    `poster.svg     ${kb(Buffer.byteLength(poster))}  (${posterPoints.length} points)`,
  ].join('\n'),
);
