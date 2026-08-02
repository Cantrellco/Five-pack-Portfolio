import { PrintButton } from '@/components/PrintButton';
import { SectionHeader } from '@/components/SectionHeader';
import { profile } from '@/content/profile';
import { resumeIsPlaceholder, roles, skillGroups } from '@/content/resume';

/**
 * The resume, as a timeline.
 *
 * Rows are period → organisation → title → responsibilities, newest first,
 * separated by hairlines rather than boxed in cards. The period opens each
 * row in mono, which is the same job mono does everywhere else on this
 * site: it carries data — dates, counts — not voice.
 *
 * Nothing here invents a work history. `content/resume.ts` ships with every
 * row flagged `placeholder`, and while any row still carries that flag the
 * section says so in plain text instead of presenting drafts as fact — the
 * same rule the field copy follows about the training data.
 */

/**
 * Several bullets are written as "Project name: what it was" — a lead-in and
 * its explanation. Rendered as one flat span the lead-in is invisible, so the
 * whole timeline reads as a wall of graphite with no way to scan it for the
 * names. This splits that pattern so the name can carry ink weight while the
 * explanation stays graphite.
 *
 * Deliberately conservative about what counts. The colon has to appear inside
 * the first `MAX_LEAD` characters and have text on both sides — a colon that
 * turns up mid-sentence ("the fix was this: ...") is prose, not a lead-in, and
 * splitting on it would emphasise a fragment. Anything that does not match is
 * returned whole and renders exactly as it always did.
 */
const MAX_LEAD = 40;

function splitBullet(line: string): { lead: string; rest: string } | null {
  const at = line.indexOf(':');
  if (at < 1 || at > MAX_LEAD) return null;
  const rest = line.slice(at + 1).trim();
  if (!rest) return null;
  return { lead: line.slice(0, at), rest };
}

export function Resume() {
  return (
    <div className="section">
      <SectionHeader
        id="resume-title"
        label="Resume"
        title="Where I have worked"
        meta={resumeIsPlaceholder ? 'Draft — not yet filled in' : undefined}
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

      <ol className="mt-[var(--sp-lg)]">
        {roles.map((role) => (
          <li key={role.id} className="border-t border-rule py-[var(--sp-lg)]">
            {/* A date range is data, so it takes the mono voice — `.label`
                is the sans-caps eyebrow for structural names, and a date in
                it would put the two voices exactly backwards. */}
            <p className="mono kicker text-graphite" data-reveal>
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
              {role.bullets.map((line) => {
                const parts = splitBullet(line);
                return (
                  <li key={line} className="flex gap-[var(--sp-xs)]" data-reveal>
                    <span aria-hidden="true" className="mt-[0.62em] h-px w-3 shrink-0 bg-rule" />
                    {/* One text node either way — the lead-in is a `<span>`
                        inside the same sentence, not a heading, so the line
                        still reads and is announced as one continuous string. */}
                    <span className={parts ? 'text-graphite' : undefined}>
                      {parts ? (
                        <>
                          <span className="font-medium text-ink">{parts.lead}</span>
                          {` — ${parts.rest}`}
                        </>
                      ) : (
                        line
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-[var(--sp-2xl)] border-t border-rule pt-[var(--sp-lg)]">
        <h3 className="label kicker" data-reveal>
          What I work in
        </h3>

        {/* Three columns side by side read as one table of the stack rather
            than as three stacked lists — but only where three columns of type
            actually fit. This used to be `grid-cols-3` at every width, on the
            claim that "the phone drops a type step and tightens the gap so all
            three fit 320px". It does not: `sm:` is 640px, wider than any phone,
            so neither responsive step here ever fired on the device the note
            was written for. What a phone actually got was three ~85-90px lanes,
            where `Row-level security`, `App Store release` and `Live
            Activities` each wrap onto two or three lines — the ragged ladder
            the one-line-per-item layout exists to avoid.

            So: stacked below `sm`, the table above it. And with a full-width
            column to sit in, the items no longer need the smaller step they
            were shrunk to in order to fit those lanes. */}
        <dl className="grid grid-cols-1 gap-[var(--sp-sm)] sm:grid-cols-3 sm:gap-[var(--sp-md)]">
          {skillGroups.map((group) => (
            <div key={group.label} data-reveal>
              <dt className="label">{group.label}</dt>
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

        {/* Client-only, absent from the no-JS document entirely — and from
            the printed page itself, where the print block hides every
            button. What it prints is typeset by globals.css, not saved from
            a hosted file, so it works while `profile.resume` is unset. */}
        <PrintButton />
      </div>
    </div>
  );
}
