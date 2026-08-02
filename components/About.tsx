import { CornerPlate } from '@/components/CornerPlate';
import { NowLine } from '@/components/NowLine';
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
        {/* The kicker is the section's real heading, not decoration over one.
            There used to be a `display-2` h2 between the role line and the
            bio; it carried the `about-title` id this section is labelled by.
            With that line gone the id lives here, which also means the phone
            and desktop layouts share one h2 instead of rendering the same
            string twice. Preflight resets headings to inherit size and
            weight, so `label kicker` renders it exactly as before. */}
        <h2 id="about-title" className="label kicker">
          About
        </h2>

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

        {/* The phone screen's role line only now — the bio below is shared
            with desktop instead of a separate phone-sized trim. No
            `data-reveal` for the same LCP reason as the desktop role line
            above. */}
        <div className="lg:hidden">
          <p className="display-2 max-w-[24ch]">{profile.roleLine}</p>
        </div>

        {/* `sp-sm`, not `sp-lg`: this block used to open with an h2 that owned
            the gap under the role line, and `sp-lg` was sized to sit above
            that heading's own line-height. The heading and its line-height
            are both gone now — this is the only gap between the role line
            and the bio, so it takes the tighter value the missing heading no
            longer needs.

            No `hidden lg:block` any more: the phone screen used to carry its
            own shorter trim of this copy, sized to a fixed one-viewport
            budget. It now renders the same paragraphs as desktop. The
            `about-bio` class is what keeps the portrait pinned to the floor
            below `lg` despite that: it scrolls internally inside the fixed
            frame instead of pushing the frame (and the portrait with it)
            past one viewport — see globals.css. Desktop ignores the class;
            the panel there already has room. */}
        <div className="body-copy about-bio mt-[var(--sp-sm)]">
          {profile.aboutBio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {/* The dated "now" line, read from KV. Renders nothing at all when
            the binding, the value, or a fresh date is missing — which is the
            case in next dev, CI and e2e — so it never disturbs this panel's
            first-screen contract there. See components/NowLine.tsx. */}
        <NowLine />

        <CornerPlate />
      </div>
    </section>
  );
}
