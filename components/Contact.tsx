import { CopyValue } from '@/components/CopyValue';
import { CornerPlate } from '@/components/CornerPlate';
import { payCopy } from '@/content/pay';
import { profile } from '@/content/profile';

/** True on the server-rendered build (Cloudflare Workers), false on the
 *  GitHub Pages static export, which sets a base path and has no server to
 *  run the payment route. Read at module scope because Next inlines this at
 *  build time — it is a constant per build, not a runtime branch. */
const PAY_LINK_VISIBLE = (process.env.NEXT_PUBLIC_BASE_PATH ?? '') === '';

export function Contact() {
  // Unfilled fields in profile.ts are blank strings; the link is simply absent
  // rather than rendered as a dead anchor.
  const links: Array<{ href: string; label: string }> = [
    { href: profile.github, label: 'GitHub' },
    { href: profile.instagram, label: 'Instagram' },
    ...(profile.linkedin ? [{ href: profile.linkedin, label: 'LinkedIn' }] : []),
    ...(profile.resume ? [{ href: profile.resume, label: 'Résumé (PDF)' }] : []),
  ];

  return (
    <section className="section" aria-labelledby="contact-title">
      <div className="shell">
        <p className="label kicker" data-reveal>
          Contact
        </p>

        <h2 id="contact-title" className="display-1" data-reveal>
          {profile.contactHeadline}
        </h2>

        <p className="label mt-[var(--sp-sm)]" data-reveal>
          {profile.stackTag}
        </p>

        {/* Same fact `lib/jsonld.ts` puts in the Person schema's address —
            that file's own comment requires every claim there to also be
            stated in visible text, and this line is what makes that true. */}
        <div className="mono mt-[var(--sp-2xs)] text-graphite" data-reveal>
          {profile.location}
        </div>

        <p
          className="mt-[var(--sp-lg)] flex flex-wrap items-baseline gap-x-[var(--sp-sm)]"
          data-reveal
        >
          {/* `anywhere` rather than `break-word`: only the former shrinks
              the element's min-content width, which is what actually stops
              a long address forcing a horizontal scrollbar at 320px. */}
          <a
            className="display-2 link font-display [overflow-wrap:anywhere]"
            href={`mailto:${profile.email}`}
          >
            {profile.email}
          </a>
          <CopyValue value={profile.email} />
        </p>

        <p
          className="mt-[var(--sp-xs)] flex flex-wrap items-baseline gap-x-[var(--sp-sm)]"
          data-reveal
        >
          <a className="display-3 link font-display" href={`tel:+1${profile.phone.replace(/\D/g, '')}`}>
            {profile.phone}
          </a>
          <CopyValue value={profile.phone} />
        </p>

        {/* A sentence, so it is set in the body face — mono is the data voice
            (the location line above, dates, stats), and a full sentence in it
            reads as terminal output rather than a person talking. */}
        <p className="mt-[var(--sp-sm)] text-sm text-graphite" data-reveal>
          {profile.contactNote}
        </p>

        {/* The way to /pay. A plain anchor rather than next/link: that route
            is for the small number of readers who arrived already knowing
            they owed something, and prefetching it for everyone else would
            be paying to warm a page almost nobody opens. It sits below the contact note rather than in the
            profile-links row above, which is desktop-only; a client paying an
            invoice from their phone is the likelier case, not the rarer one.

            Absent from the GitHub Pages export. /pay is a dynamic route that
            posts to route handlers, so `npm run build:pages` deliberately
            excludes it (see `pageExtensions` in next.config.ts) — and a link
            to a page that build does not contain is just a 404 with good
            intentions. A non-empty base path is exactly the signal that this
            is that build. */}
        {PAY_LINK_VISIBLE ? (
          <p className="mt-[var(--sp-md)] text-sm" data-reveal>
            <a className="link-block" href="/pay">
              {payCopy.contactLinkLabel}
            </a>
          </p>
        ) : null}

        {/* Desktop only: on the phone screen the corner stack below carries
            the same destinations as marks. */}
        <ul
          className="mt-[var(--sp-lg)] hidden flex-wrap gap-x-[var(--sp-md)] gap-y-[var(--sp-2xs)] lg:flex"
          data-reveal
        >
          {links.map((l) => (
            <li key={l.href}>
              <a className="link-block" href={l.href} rel="noopener">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <CornerPlate />
      </div>
    </section>
  );
}
