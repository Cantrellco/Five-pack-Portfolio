import { Block } from '@/components/Block';
import { CopyEmail } from '@/components/CopyEmail';
import { CornerPlate } from '@/components/CornerPlate';
import { profile } from '@/content/profile';
import { formatPushDate, type GithubSummary } from '@/lib/github';

export function Contact({ github }: { github: GithubSummary | null }) {
  // Unfilled fields in profile.ts are blank strings; the link is simply absent
  // rather than rendered as a dead anchor.
  const links: Array<{ href: string; label: string }> = [
    { href: profile.github, label: 'GitHub' },
    { href: profile.instagram, label: 'Instagram' },
    ...(profile.linkedin ? [{ href: profile.linkedin, label: 'LinkedIn' }] : []),
    ...(profile.resume ? [{ href: profile.resume, label: 'Résumé (PDF)' }] : []),
  ];
  const topLanguage = github?.languages[0];

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
          <CopyEmail email={profile.email} />
        </p>

        {/* A sentence, so it is set in the body face — mono is the data voice
            (the location line above, dates, stats), and a full sentence in it
            reads as terminal output rather than a person talking. */}
        <p className="mt-[var(--sp-2xs)] text-sm text-graphite" data-reveal>
          {profile.contactNote}
        </p>

        {/* Desktop only: on the phone screen the corner stack below carries
            the same destinations as marks, and the GitHub activity table is
            more depth than a screen sized to one viewport can afford. */}
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

        {/* Live GitHub figures, read at build time and refreshed daily.
            This was `hidden lg:block` — desktop only — while the phone's
            Contact screen, a forced one-viewport screen with a headline, an
            address and one line of note on it, spent the rest of that viewport
            on empty paper. On a tall phone that was 500-600px of nothing sat
            directly under the one screen a reader lands on to decide whether
            to write. The figures are the most checkable thing on the page, so
            that is what the room goes to.

            Still hidden on a SHORT phone, and that is the whole reason this is
            a class rather than a utility: the rule is height-scoped in
            globals.css, so the one-viewport contract holds on an SE while a
            current phone gets the block. See `.contact-activity`. */}
        {github ? (
          <div className="contact-activity">
            <Block label="Activity">
              <dl className="grid grid-cols-1 border-t border-rule sm:grid-cols-3" data-reveal>
                <div className="border-b border-rule py-[var(--sp-sm)] sm:border-b-0 sm:pr-[var(--sp-md)]">
                  <dt className="label">Public repos</dt>
                  <dd className="display-3 mt-[0.3em] text-ink">{github.publicRepos}</dd>
                </div>
                {github.lastPush ? (
                  <div className="border-b border-rule py-[var(--sp-sm)] sm:border-b-0 sm:border-l sm:border-rule sm:px-[var(--sp-md)]">
                    <dt className="label">Last push</dt>
                    <dd className="display-3 mt-[0.3em] text-ink">{formatPushDate(github.lastPush)}</dd>
                  </div>
                ) : null}
                {topLanguage ? (
                  <div className="py-[var(--sp-sm)] sm:border-l sm:border-rule sm:pl-[var(--sp-md)]">
                    <dt className="label">Mostly</dt>
                    <dd className="display-3 mt-[0.3em] text-ink">{topLanguage.name}</dd>
                    <dd className="mt-[0.3em] text-sm text-graphite">
                      {github.languages.map((l) => `${l.name} ${l.share}%`).join(' · ')}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {/* The stat block is read as a claim about what he writes, and
                  on its own it argues against the case studies: Workout Buddy
                  is the largest thing on this site and its repo is private
                  (`flagship.repoUrl` is deliberately blank), so the Swift
                  share here counts none of it. Saying so converts a number
                  that undersells the native work into one a reader can place
                  — and the site's own rule is that a figure never gets to
                  imply something the data does not support. */}
              <p className="mt-[var(--sp-sm)] text-sm text-graphite" data-reveal>
                {profile.activityNote}
              </p>
            </Block>
          </div>
        ) : null}

        <CornerPlate />
      </div>
    </section>
  );
}
