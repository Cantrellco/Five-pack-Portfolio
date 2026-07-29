import { profile } from '@/content/profile';
import type { GithubSummary } from '@/lib/github';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function Contact({ github }: { github: GithubSummary | null }) {
  // Unfilled fields in profile.ts are blank strings; the link is simply absent
  // rather than rendered as a dead anchor.
  const links: Array<{ href: string; label: string }> = [
    { href: profile.github, label: 'GitHub' },
    ...(profile.linkedin ? [{ href: profile.linkedin, label: 'LinkedIn' }] : []),
    ...(profile.resume ? [{ href: profile.resume, label: 'Résumé (PDF)' }] : []),
  ];

  return (
    <section id="contact" className="section rule-top" aria-labelledby="contact-title">
      <div className="shell">
        <div className="grid-editorial">
          <p className="label col-aside" data-reveal>
            Contact
          </p>

          <div className="col-main">
            <h2 id="contact-title" className="display-2" data-reveal>
              Open to a senior native-mobile role
            </h2>

            <p className="mt-[var(--sp-md)]" data-reveal>
              {/* `anywhere` rather than `break-word`: only the former shrinks
                  the element's min-content width, which is what actually stops
                  a long address forcing a horizontal scrollbar at 320px. */}
              <a
                className="display-2 link font-display [overflow-wrap:anywhere]"
                href={`mailto:${profile.email}`}
              >
                {profile.email}
              </a>
            </p>

            <ul className="mt-[var(--sp-md)] flex flex-wrap gap-x-[var(--sp-md)] gap-y-[var(--sp-2xs)]" data-reveal>
              {links.map((l) => (
                <li key={l.href}>
                  <a className="link-block" href={l.href} rel="noopener">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            {github ? (
              <dl
                className="mono mt-[var(--sp-lg)] flex flex-wrap gap-x-[var(--sp-md)] gap-y-[var(--sp-2xs)] border-t border-rule pt-[var(--sp-sm)] text-graphite"
                data-reveal
              >
                <div>
                  <dt className="inline">Public repos </dt>
                  <dd className="inline text-ink">{github.publicRepos}</dd>
                </div>
                {github.lastPush ? (
                  <div>
                    <dt className="inline">Last push </dt>
                    <dd className="inline text-ink">{formatDate(github.lastPush)}</dd>
                  </div>
                ) : null}
                {github.languages.length ? (
                  <div>
                    <dt className="inline">Mostly </dt>
                    <dd className="inline text-ink">
                      {github.languages.map((l) => `${l.name} ${l.share}%`).join(' · ')}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
