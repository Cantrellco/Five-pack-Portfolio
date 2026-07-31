import { profile } from '@/content/profile';
import { flagship } from '@/content/projects';

/**
 * The deck panel wrapping this owns the `about` id — that is what the anchors
 * and the tablist resolve to — so this section carries the heading link only.
 *
 * This is also where the identity column's old caption plate landed: the
 * role line, the stack tag and the two CTAs used to sit on the portrait
 * itself, in a paper box over the engraving. That box was the whole reason
 * the portrait read as a card bolted onto the page rather than as the other
 * half of it. None of that content needed the image to sit on — it reads as
 * prose either way — so it moved here. The role line still opens the panel,
 * ahead of the heading and bio; the stack tag and the two CTAs now close it
 * instead, once the bio has made the case they exist to back up. Only the
 * name stayed behind, in the identity column's `<h1>`.
 *
 * Nothing in here carries `data-reveal`, and that is a performance decision
 * rather than a stylistic one. About is the panel the site opens on, so this
 * prose shares the first screen with the name. `data-reveal` starts an element
 * at opacity 0 and waits for the motion bundle, which makes whatever it is
 * attached to paint late — and the largest block of text in the first
 * viewport is exactly what the browser picks as the LCP element.
 *
 * Measured: revealing this block put LCP at 3.7s against a 2.0s budget, with
 * 100% of that time spent in render delay. The hero carried the same note for
 * the same reason before the deck existed. Reveals start below the fold.
 */
export function About() {
  return (
    <section className="section" aria-labelledby="about-title">
      <div className="shell">
        <p className="label kicker">About</p>

        {/* The role line, not a heading — it never was one, back when it sat
            on the portrait. Set at `display-1` it is the single biggest
            thing on the page, which is the point: everything else in this
            panel introduces or supports this one line.

            Hidden below `lg`: the identity column now carries its own copy
            of this exact line (see `Identity.tsx`) so a phone reader sees it
            on the very first screen, before the tab row, rather than only
            after opening this panel. Showing both here would repeat the same
            sentence twice in a row on a phone. */}
        <p className="display-1 max-w-none hidden lg:block">{profile.roleLine}</p>

        <h2 id="about-title" className="display-2 mt-[var(--sp-lg)]">
          {profile.aboutHeading}
        </h2>

        <div className="body-copy mt-[var(--sp-md)] text-md leading-[1.5]">
          {profile.aboutBio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {/* Stack tag and CTAs close the panel now instead of opening it: the
            bio has made the case by this point, so the tag and the links
            read as what backs it up rather than a claim made before any of
            it is shown. */}
        <p className="label mt-[var(--sp-lg)]">{profile.stackTag}</p>

        <div className="mt-[var(--sp-sm)] flex flex-wrap items-center gap-[var(--sp-2xs)]">
          <a className="cta" href={flagship.appStoreUrl} rel="noopener">
            {flagship.name} on the App Store
          </a>
          <a className="cta-ghost" href={profile.github} rel="noopener">
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
