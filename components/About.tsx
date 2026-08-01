import { CornerPlate } from '@/components/CornerPlate';
import { profile } from '@/content/profile';

/**
 * The deck panel wrapping this owns the `about` id — that is what the anchors
 * and the tablist resolve to — so this section carries the heading link only.
 *
 * This is also where the identity column's old caption plate landed: the
 * role line, the stack tag and the two CTAs used to sit on the portrait
 * itself, in a paper box over the engraving. That box was the whole reason
 * the portrait read as a card bolted onto the page rather than as the other
 * half of it. None of that content needed the image to sit on — it reads as
 * prose either way — so the role line moved here and opens the panel, ahead
 * of the heading and bio. Only the name stayed behind, in the identity
 * column's `<h1>`.
 *
 * The stack tag and the two CTAs that used to close the panel are gone: this
 * is a prose panel and they read as a spec sheet stapled to the end of it.
 * Neither is lost — `CornerPlate` carries both links on every panel, `Contact`
 * repeats them alongside the stack tag, and the OG card still uses the tag.
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

        {/* The phone screen's whole top-left: role line as the claim, the
            About heading as the one-line "who".
            The full bio stays a desktop read — this screen is sized to fit
            one viewport with the face and the marks below it, and two long
            paragraphs do not fit that contract. No `data-reveal` for the
            same LCP reason as the desktop role line above. */}
        <div className="lg:hidden">
          <p className="display-2 max-w-[24ch]">{profile.roleLine}</p>
          {/* A real h2, not a p: below `lg` the desktop h2 further down is
              `display: none`, and without this the whole opening screen has
              no level-2 heading for a screen reader to navigate to. Preflight
              resets headings to inherit size and weight, so it renders
              exactly as the supporting line it looks like. No `id` — the
              section's `aria-labelledby` stays pointed at the canonical one. */}
          <h2 className="mt-[var(--sp-sm)] text-graphite">{profile.aboutHeading}</h2>
          {/* The fast bio: one sentence of work, one of what outranks it.
              Same no-`data-reveal` rule as everything else on this first
              screen — nothing here may wait on the motion bundle. */}
          <p className="mt-[var(--sp-sm)] max-w-[36ch] text-sm text-graphite">
            {profile.aboutPhoneLine}
          </p>
        </div>

        <div className="hidden lg:block">
          <h2 id="about-title" className="display-2 mt-[var(--sp-lg)]">
            {profile.aboutHeading}
          </h2>

          <div className="body-copy mt-[var(--sp-md)]">
            {profile.aboutBio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

        </div>

        <CornerPlate />
      </div>
    </section>
  );
}
