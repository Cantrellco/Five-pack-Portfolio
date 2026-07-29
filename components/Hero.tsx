import { profile } from '@/content/profile';
import { flagship } from '@/content/projects';
import { fieldCopy } from '@/lib/field-copy';

/**
 * A two-column editorial spread: heavy left mass, quiet right column, both
 * bottom-aligned to the same rows. On the twelve-column grid the name and the
 * role line share row one, the calls to action and the field caption share row
 * two — so the right column reads as a caption block rather than as text
 * floating in the margin.
 *
 * Nothing here carries `data-reveal`. The hero is the first paint; there is
 * nothing to reveal it from, and fading it in makes the largest contentful
 * element wait on an animation — which is both a worse first impression and a
 * five-second LCP. Reveals start below the fold.
 */
export function Hero() {
  return (
    <section className="shell" aria-labelledby="hero-name">
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-col justify-center py-[var(--sp-xl)]">
        <div className="grid-editorial items-end">
          <div className="col-span-full md:col-[1/span_7]">
            <p className="label">
              Swift · SwiftUI · watchOS
            </p>
            <h1 id="hero-name" className="display-hero mt-[var(--sp-sm)]">
              <span className="block">{profile.firstName}</span>
              <span className="block">{profile.lastName}</span>
            </h1>
          </div>

          <p
            className="lede col-span-full text-graphite md:col-[8/span_5] md:pb-[0.45em]"
          >
            {profile.roleLine}
          </p>

          <div
            className="col-span-full flex flex-wrap items-center gap-[var(--sp-xs)] md:col-[1/span_7]"
          >
            <a className="cta" href={flagship.appStoreUrl} rel="noopener">
              Open {flagship.name} in the App Store
            </a>
            <a className="cta-ghost" href={profile.github} rel="noopener">
              Open GitHub profile
            </a>
          </div>

          <p
            className="mono col-span-full max-w-[44ch] border-t border-rule pt-[var(--sp-xs)] leading-[1.75] text-graphite md:col-[8/span_5]"
          >
            {fieldCopy.heroCaption}
          </p>
        </div>
      </div>
    </section>
  );
}
