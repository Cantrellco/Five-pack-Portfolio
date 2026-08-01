import type { CSSProperties } from 'react';
import Image from 'next/image';
import { profile } from '@/content/profile';
import { flagship } from '@/content/projects';

/**
 * The bottom half of the phone-only About and Contact screens: the engraving
 * standing on the bottom-left edge, and the three profile marks — Instagram,
 * GitHub, Workout Buddy — stacked in the bottom-right corner. On desktop only
 * About shows the marks, in a vertical stack pinned to the panel's lower right
 * (`.corner-plate` is otherwise `display: none`); the identity pane and the
 * Contact links list already carry the same facts there.
 *
 * Each mark is the REAL logo traced to an outline — same silhouette, same
 * proportions, nothing redrawn. They are not inline SVG: the traced contours
 * carry far more detail than a hand-drawn glyph, and inlining three of them
 * twice over (About and Contact both mount this) cost more than it was worth.
 * They ship as alpha PNGs under `public/media/marks/` and paint through
 * `mask-image` over a `currentColor` background instead — same technique as
 * the identity column's masked objects, and the reason one rule can hold all
 * three at `--graphite` and tint them to `--signal` on hover. The file
 * supplies shape only; not one colour in it reaches the page.
 *
 * The three sources were normalised to a common stroke weight before export,
 * which is not cosmetic: the marks were drawn at wildly different scales, and
 * left alone Instagram's contour rendered about fifteen times heavier than the
 * other two, which simply vanished at this size.
 *
 * `Flagship`'s header still resolves Workout Buddy's real App Store icon
 * through `resolveLogo` — that panel is the claim about the shipped product,
 * so it shows the artwork the store actually shows, in full colour.
 *
 * A mark with no URL behind it renders as a plain span, not a dead anchor —
 * the same "blank hides the link, not the layout" contract `Contact` follows.
 */

/**
 * Optical size correction, same job as the `scale` table in `lib/media.ts`.
 *
 * Every mask is trimmed to its own ink and letterboxed into one square, which
 * matches their BOXES but not what the eye reads as their size. Measured off
 * the committed files: Instagram fills 100% of that square's height and GitHub
 * 98%, but the mascot only 87%, because it is the one mark wider than it is
 * tall. Worse, its recognisable form is the plate alone — the raised arm and
 * the shoes spend width without adding any mass the eye counts — so at a
 * matched box it reads a size down from two marks that ARE their own box.
 *
 * Not derived from ink coverage, which points the wrong way here: the mascot
 * carries the MOST ink of the three (39% of its box against Instagram's 25%)
 * and still looks smallest. The number is what made the plate read at the same
 * diameter as the octocat's circle, checked against both at final size.
 *
 * It is also coupled to `--mark-size`, so the two move together: when the two
 * glyphs were nudged up a step, this came down from 1.4 to hold the mascot at
 * the size it had already been tuned to. Raising the shared size alone would
 * have dragged the mascot up with it, which was not what was being asked for.
 */
const MARK_SCALE: Readonly<Record<string, number>> = {
  'workout-buddy': 1.3,
};

function Mark({ name }: { name: string }) {
  return (
    <span
      className="corner-mark"
      style={
        {
          '--mark': `url(/media/marks/${name}.png)`,
          '--mark-scale': MARK_SCALE[name] ?? 1,
        } as CSSProperties
      }
    />
  );
}

function CornerLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    /* Not a dead anchor and not invisible either: `role="img"` with a label
       makes the mark a named graphic for assistive tech — announced, never
       offered as a control — until the real URL lands in profile.ts. */
    return (
      <span className="corner-link" role="img" aria-label={label} title={`${label} — link not set yet`}>
        {children}
      </span>
    );
  }
  return (
    <a className="corner-link" href={href} rel="noopener" aria-label={label}>
      {children}
    </a>
  );
}

export function CornerPlate() {
  const { portrait } = profile;

  return (
    <div className="corner-plate">
      {portrait.src ? (
        /* Figure and caption travel together: on the phone the name sits
           directly under the engraving, so the wrapper is what the layout
           sizes and pins to the screen's bottom-left. `aria-hidden` on the
           name — the page's sr-only `<h1>` already announces it, and a
           second "Cody Cantrell" in the tree is noise, not information. */
        <div className="corner-figure">
          <figure className="corner-face">
            <Image
              src={portrait.src}
              alt={portrait.alt}
              fill
              /* Eager, but NOT `priority`. This box is inside the phone's
                 first viewport and, measured at the Lighthouse mobile
                 profile, it IS the LCP element — larger than the role line.
                 Left lazy, the browser only discovered it after layout and
                 the fetch finished ~2.7s in, past the 2.0s budget; eager
                 starts it at parse time instead. `priority` would go further
                 and emit a preload, jumping the queue ahead of the desktop
                 LCP portrait for a file desktop never shows.

                 `8rem`, deliberately under the box's real ~11-12rem: it
                 steers the srcset pick to the same 384-wide file the
                 identity column's phone preload already fetched (384w at
                 DPR 2.625-3, 256w at DPR 2), so the LCP paint costs little
                 to no new bytes instead of a second, 640-wide copy of the
                 same portrait — honest sizes measured LCP at 1979ms of the
                 2000ms budget, one flake from failing CI. The ~1.3x upscale
                 is invisible at engraving line weights on a phone-sized
                 plate. */
              loading="eager"
              /* High, because on the throttled mobile profile this file is
                 in a bandwidth fight with the fonts, the poster and the
                 identity preload — and it is the one the LCP clock is
                 waiting on. */
              fetchPriority="high"
              sizes="(min-width: 64rem) 1px, 8rem"
              quality={60}
              className="corner-face-img"
            />
          </figure>
          <p className="corner-name" aria-hidden="true">
            {profile.name}
          </p>
        </div>
      ) : null}

      <ul className="corner-links">
        <li>
          <CornerLink href={profile.instagram} label="Instagram">
            <Mark name="instagram" />
          </CornerLink>
        </li>
        <li>
          <CornerLink href={profile.github} label="GitHub">
            <Mark name="github" />
          </CornerLink>
        </li>
        <li>
          <CornerLink href={flagship.appStoreUrl} label={`${flagship.name} on the App Store`}>
            <Mark name="workout-buddy" />
          </CornerLink>
        </li>
      </ul>
    </div>
  );
}
