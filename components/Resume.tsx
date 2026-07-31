import { SectionHeader } from '@/components/SectionHeader';
import { profile } from '@/content/profile';
import { resumeIsPlaceholder, roles, skillGroups } from '@/content/resume';

/**
 * The resume, as a timeline.
 *
 * Rows are period → organisation → title → responsibilities, newest first,
 * separated by hairlines rather than boxed in cards. The period sits in the
 * aside column in mono, which is the same job mono does everywhere else on
 * this site: it carries data, not voice.
 *
 * Nothing here invents a work history. `content/resume.ts` ships with every
 * row flagged `placeholder`, and while any row still carries that flag the
 * section says so in plain text instead of presenting drafts as fact — the
 * same rule the field copy follows about the training data.
 */
export function Resume() {
  return (
    <div className="section">
      <SectionHeader
        id="resume-title"
        label="Resume"
        title="Where I have worked"
        meta={resumeIsPlaceholder ? 'Draft — not yet filled in' : `${roles.length} roles`}
      >
        {resumeIsPlaceholder ? (
          <p className="body-copy mt-[var(--sp-sm)] text-graphite" data-reveal>
            This timeline is a shell. The layout is finished; the history is
            not. Rather than fill it with a plausible-looking career, it stays
            marked as unwritten until the real one goes into{' '}
            <code className="mono">content/resume.ts</code>.
          </p>
        ) : null}
      </SectionHeader>

      <ol className="mt-[var(--sp-xl)]">
        {roles.map((role) => (
          <li key={role.id} className="border-t border-rule py-[var(--sp-lg)]">
            <p className="label kicker" data-reveal>
              {role.period}
              {role.location ? ` · ${role.location}` : ''}
            </p>

            <h3 className="display-3" data-reveal>
              {role.org}
            </h3>
            <p className="mt-[var(--sp-3xs)] text-graphite" data-reveal>
              {role.title}
            </p>

            <ul className="mt-[var(--sp-sm)] max-w-[var(--measure)] space-y-[var(--sp-2xs)]">
              {role.bullets.map((line) => (
                <li key={line} className="flex gap-[var(--sp-xs)]" data-reveal>
                  <span aria-hidden="true" className="mt-[0.62em] h-px w-3 shrink-0 bg-rule" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-[var(--sp-2xl)] border-t border-rule pt-[var(--sp-lg)]">
        <h3 className="label kicker" data-reveal>
          What I work in
        </h3>

        <dl className="grid gap-[var(--sp-md)] sm:grid-cols-3">
          {skillGroups.map((group) => (
            <div key={group.label} data-reveal>
              <dt className="mono text-graphite">{group.label}</dt>
              <dd className="mt-[var(--sp-2xs)]">
                <ul className="space-y-[var(--sp-3xs)]">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>

        {profile.resume ? (
          <p className="mt-[var(--sp-lg)]" data-reveal>
            <a className="cta-ghost" href={profile.resume} rel="noopener">
              Download the PDF
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
