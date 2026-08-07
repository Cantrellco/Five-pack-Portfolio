import { CopyValue } from '@/components/CopyValue';
import { CornerPlate } from '@/components/CornerPlate';
import { profile } from '@/content/profile';

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
