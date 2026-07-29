export type FieldData = {
  count: number;
  /** vec3 per point: (time 0..1, intensity 0..1, 0) */
  positions: Float32Array;
  /** vec3 per point: (index, volume 0..1, lift index) */
  meta: Float32Array;
  /** Line segment pairs for the per-lift progression curve. */
  trend: Float32Array;
  r2: [number, number];
};

type Manifest = {
  buffer: string;
  count: number;
  r2: [number, number];
  trend: Array<{ id: string; points: Array<[number, number]> }>;
};

const U16 = 65535;

/**
 * Fetches the precomputed field and unpacks it into GPU-ready typed arrays.
 *
 * The wire format is six bytes a point — two quantised coordinates and one
 * packed word — so there is no JSON to parse and no layout to compute here.
 * All this does is widen integers into floats.
 */
export async function loadField(signal: AbortSignal): Promise<FieldData> {
  const manifestRes = await fetch('/field/manifest.json', { signal });
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest: Manifest = await manifestRes.json();

  const bufferRes = await fetch(manifest.buffer, { signal });
  if (!bufferRes.ok) throw new Error(`buffer ${bufferRes.status}`);
  const raw = new Uint16Array(await bufferRes.arrayBuffer());

  const count = manifest.count;
  if (raw.length < count * 3) throw new Error('field buffer is short');

  const positions = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const o = i * 3;
    positions[o] = raw[o]! / U16;
    positions[o + 1] = raw[o + 1]! / U16;
    positions[o + 2] = 0;

    const packed = raw[o + 2]!;
    meta[o] = i;
    meta[o + 1] = ((packed >> 6) & 0x3f) / 63;
    meta[o + 2] = (packed >> 12) & 0xf;
  }

  // Polylines to line-segment pairs, which is what LineSegments wants and what
  // keeps every lift's curve in one draw call.
  const segments: number[] = [];
  for (const lift of manifest.trend) {
    for (let i = 1; i < lift.points.length; i += 1) {
      const a = lift.points[i - 1]!;
      const b = lift.points[i]!;
      segments.push(a[0], a[1], 0, b[0], b[1], 0);
    }
  }

  return {
    count,
    positions,
    meta,
    trend: new Float32Array(segments),
    r2: manifest.r2,
  };
}
