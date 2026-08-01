import Image from 'next/image';
import { profile } from '@/content/profile';

/**
 * The solids that drift around the portrait, in DOM order.
 *
 * The name is the whole contract: each one maps to `.obj-<name>` in
 * globals.css, which owns its size, position, timing and the file it masks.
 * Adding one here without the matching rule renders an invisible empty span,
 * which is harmless but pointless — add both or neither.
 */
const OBJECTS = [
  'constel',
  'orbit',
  'tetra',
  'spiral',
  'burst',
  'hex',
  'icosa',
  'cube',
  'prism',
  'dodeca',
  'dial',
  'helix',
  'dots',
  'octa',
  'graph',
  'wave',
  'arrow',
  'bracket',
] as const;

/**
 * The identity column: the name, the portrait, and the drawing around it.
 *
 * The portrait is a cutout — real alpha where the paper used to be — so the
 * ink field behind the whole page shows through everywhere the figure is not.
 * This replaces the `mix-blend-mode: darken` trick that stood in for it: a
 * blend mode can only ever approximate a cutout, and it broke the moment the
 * drawing behind the image was darker than the image's own paper.
 *
 * Everything that used to be baked into that raster — the polyhedra, the node
 * graph, the circuit traces — is now four separate vectors in
 * `public/media/objects/`. Separating them is the whole point: a shape welded
 * into a photograph cannot turn, and a trace painted into one cannot carry
 * anything along it. As their own elements they can, and `globals.css` moves
 * them.
 *
 * They are drawn with `mask-image` rather than `<img>` so their colour comes
 * from the token layer instead of the fill baked into the SVG — the design
 * rules say never hardcode a hex in a component, and a generated asset is no
 * exception. It also lets the same file be drawn twice in two different
 * colours, which is what the travelling pulse on the traces needs.
 *
 * The name is the page's one `<h1>` and it lives here rather than in the
 * masthead: this column is the part of the layout that never changes when a
 * tab does, so it is the only place a single most-important heading can sit
 * without a tab click hiding it.
 *
 * Below `lg` there is no left half to fill. The column collapses to the fixed
 * paper strip across the top of the phone layout — the wordmark on one line,
 * with the tab block hanging in the strip's right corner — and the portrait
 * and objects stay off entirely: the About and Contact screens stand their
 * own copy of the engraving on the bottom edge instead (`CornerPlate`).
 */
export function Identity() {
  const { portrait } = profile;

  return (
    <div className="identity">
      {portrait.src ? (
        <figure className="portrait">
          <Image
            src={portrait.src}
            alt={portrait.alt}
            fill
            /**
             * These two numbers are load-bearing, not decoration.
             *
             * `sizes` is what decides which file the browser actually pulls,
             * and — because this image is `priority` — which file gets
             * preloaded. From `lg` up the figure fills half the viewport and
             * is the LCP element, so 52vw is real. Below `lg` this figure is
             * `display: none` (the phone screens paint their own copy via
             * `CornerPlate`, at 44vw), but next/image floors the srcset of
             * any vw-bearing `sizes` at its 384-wide candidate — so the 1px
             * phone entry still preloads the 384w file (~63KB). That is the
             * measured cost of keeping one server render for both layouts,
             * inside budget; it cannot go lower without dropping `priority`,
             * which the desktop LCP needs.
             */
            sizes="(min-width: 64rem) 52vw, 1px"
            quality={60}
            priority
            className="portrait-img"
          />
        </figure>
      ) : null}

      {/* Decoration only, and marked as such. Every fact the readout shows is
          also stated in real prose in the field note, so nothing is lost when
          this is skipped.

          Eighteen solids drifting around the figure. There were circuit traces
          here too — they read as printed on the shirt rather than floating
          behind it, and at any weight that made them legible they crowded the
          one thing this pane exists to show. Geometry alone carries it.

          Each is positioned and timed individually in `globals.css` rather
          than from a loop: they have to miss the face, and where the face is
          depends on the crop, so the placement is a judgement per shape and
          not something a formula gets right. */}
      <div className="objects" aria-hidden="true">
        {OBJECTS.map((name) => (
          <span key={name} className={`obj obj-${name}`} />
        ))}
      </div>

      {/* A wordmark, not a display heading — one line, set small, in the corner
          the asset keeps clear. It is still the page's `<h1>`: the heading that
          names the site does not have to be the biggest type on it, and the
          role line it used to sit above is the About panel's opening line, so
          repeating it here only printed the same sentence twice side by side. */}
      {/* Two lines, but ONE accessible name. The explicit `{' '}` between the
          spans is load-bearing: without it `textContent` concatenates to
          "CodyCantrell" and both the accessible name and the e2e assertion
          read a single run-on word. It costs nothing visually — the spans are
          blocks, so the space collapses at the line break. */}
      <h1 className="identity-name">
        <span>{profile.firstName}</span>{' '}
        <span>{profile.lastName}</span>
      </h1>
    </div>
  );
}
