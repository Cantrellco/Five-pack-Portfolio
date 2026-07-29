import { Block } from '@/components/Block';
import { SectionHeader } from '@/components/SectionHeader';
import { secondProject } from '@/content/projects';

export function SecondProject() {
  const links: Array<{ href: string; label: string }> = [
    ...(secondProject.liveUrl ? [{ href: secondProject.liveUrl, label: 'Open the live site' }] : []),
    ...(secondProject.repoUrl ? [{ href: secondProject.repoUrl, label: 'Read the code on GitHub' }] : []),
  ];

  return (
    <section id="platform" className="section rule-top" aria-labelledby="platform-title">
      <div className="shell">
        <SectionHeader
          id="platform-title"
          label="Second project"
          title={secondProject.name}
          meta={<span className="block">{secondProject.kind}</span>}
        >
          <p className="body-copy mt-[var(--sp-md)] text-md leading-[1.5]" data-reveal>
            {secondProject.what}
          </p>

          {links.length > 0 ? (
            <p className="mt-[var(--sp-sm)] flex flex-wrap gap-[var(--sp-sm)]" data-reveal>
              {links.map((l) => (
                <a key={l.href} className="link-block text-sm" href={l.href} rel="noopener">
                  {l.label}
                </a>
              ))}
            </p>
          ) : null}
        </SectionHeader>

        <Block label="How it works">
          <dl className="border-t border-rule">
            {secondProject.notes.map((note) => (
              <div key={note.title} className="border-b border-rule py-[var(--sp-sm)]" data-reveal>
                <dt className="display-3">{note.title}</dt>
                <dd className="body-copy mt-[0.35em] text-graphite">{note.body}</dd>
              </div>
            ))}
          </dl>
        </Block>
      </div>
    </section>
  );
}
