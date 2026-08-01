import { publicFiles } from '@/lib/generated/static-assets';

/**
 * Build-time check for a file under public/.
 *
 * Screenshots and the demo clip are not in the repo yet. Rather than gate them
 * behind a config flag someone has to remember to flip, the server components
 * check a manifest built from the filesystem: drop `public/media/workout-buddy-1.png`
 * in and it renders on the next build with no code change. Until then the frame
 * renders its reserved box, so adding the real asset cannot shift layout.
 *
 * Checks a build-time manifest rather than calling `existsSync` directly
 * because this runs again on every ISR revalidation, which on Cloudflare
 * Workers executes with no filesystem at all.
 */
export function publicFileExists(path: string): boolean {
  return publicFiles.has(path.startsWith('/') ? path : `/${path}`);
}

const LOGO_EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'] as const;

/**
 * Optical size correction, one entry per mark.
 *
 * These are real brand logos, not a drawn icon set, so they arrive as
 * whatever shape and density their owner made them: two full-bleed app-icon
 * tiles, two circular badges, a tall shield, a wide pastel illustration.
 * Sized to a single shared height they look wrong in six different ways — a
 * solid square reads far heavier than a circle inscribed in the same box,
 * and a 2.16:1 strip reads heavier still.
 *
 * Each number is `sqrt((1 / sqrt(coverage)) / aspect)`, normalised so a solid
 * square tile is 1: equal bounding-box AREA rather than equal height, then
 * damped by how much of that box each mark actually fills (measured off the
 * committed files — alpha coverage runs 0.45 to 1.0 across these six). The
 * square root on coverage is deliberate half-compensation; correcting the
 * full amount overshoots, because a large sparse mark still reads as large.
 * Treat them as a considered starting point that was then checked by eye,
 * not as output to recompute — nudge a value if a replaced file looks off.
 */
type LogoSpec = {
  scale: number;
  /**
   * True only for an app icon, where the filled square IS the mark. iOS never
   * draws one unmasked, so these get the corner radius that makes them read
   * as icons rather than as cropped screenshots. It has to be opt-in: the
   * other four are transparent at the corners but their artwork still runs
   * into them — rounding Little Town cost 583 pixels off the ground shadow
   * at its bottom corners, and PC Pro's shield 175.
   */
  tile?: true;
};

const LOGO: Readonly<Record<string, LogoSpec>> = {
  'workout-buddy': { scale: 1, tile: true }, // full-bleed app icon, coverage 1.00
  'fusion-coffee': { scale: 1, tile: true }, // full-bleed app icon, coverage 1.00
  'the-harvest': { scale: 1.06 }, // circle in a square box, coverage 0.78
  'faith-outreach': { scale: 1.08 }, // circle in a square box, coverage 0.74
  'pc-pro': { scale: 1.28 }, // upright shield, 0.82:1, coverage 0.56
  'little-town': { scale: 0.83 }, // wide illustration, 2.16:1, coverage 0.45
};

/**
 * A project's real logo, if one has been dropped in — same contract as the
 * screenshots above: `public/media/logos/<id>.svg` (or `.png`/`.webp`/`.jpg`/
 * `.jpeg`) and it renders on the next build, no code change. SVG is checked
 * first since a vector mark scales cleanest next to the display serif it
 * sits beside; the raster formats are what an App Store icon or a client's
 * own asset are more likely to actually come in. `null` when none of them
 * exist yet, so the caller can fall back to plain text with no reserved gap.
 *
 * Files are expected trimmed to their own ink, with no baked-in padding: the
 * gap to the title is set once in CSS, so a mark carrying its own margin
 * would sit at a different distance from the text than every other one.
 */
export function resolveLogo(id: string): { src: string; scale: number; tile: boolean } | null {
  for (const ext of LOGO_EXTENSIONS) {
    const path = `/media/logos/${id}.${ext}`;
    if (publicFileExists(path)) {
      const spec = LOGO[id];
      return { src: path, scale: spec?.scale ?? 1, tile: spec?.tile === true };
    }
  }
  return null;
}
