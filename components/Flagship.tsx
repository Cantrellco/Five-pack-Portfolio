import { ArchDiagram } from '@/components/ArchDiagram';
import { Block } from '@/components/Block';
import { DemoClip, PhoneFrameGrid } from '@/components/DeviceFrames';
import { SectionHeader } from '@/components/SectionHeader';
import { flagship } from '@/content/projects';

/**
 * No id and no top rule on the section: the project tab that wraps this owns
 * the id the hash names, and the tab bar above it already draws the line.
 */
export function Flagship() {
  const links: Array<{ href: string; label: string }> = [
    ...(flagship.appStoreUrl ? [{ href: flagship.appStoreUrl, label: 'Open in the App Store' }] : []),
    ...(flagship.siteUrl ? [{ href: flagship.siteUrl, label: 'Visit the site' }] : []),
    ...(flagship.repoUrl ? [{ href: flagship.repoUrl, label: 'Read the code on GitHub' }] : []),
  ];

  return (
    <section className="section" aria-labelledby="workout-buddy-title">
      <div className="shell">
        <SectionHeader
          id="workout-buddy-title"
          label="Flagship"
          title={flagship.name}
          logoId="workout-buddy"
          meta={
            <>
              <span className="block">{flagship.kind}</span>
              <span className="block">{flagship.shipped}</span>
            </>
          }
        >
          {links.length > 0 ? (
            <p className="mt-[var(--sp-md)] flex flex-wrap gap-[var(--sp-sm)]" data-reveal>
              {links.map((l) => (
                <a key={l.href} className="link-block text-sm" href={l.href} rel="noopener">
                  {l.label}
                </a>
              ))}
            </p>
          ) : null}

          <div className="body-copy mt-[var(--sp-md)]" data-reveal>
            {flagship.what.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <p className="body-copy mt-[var(--sp-sm)] text-graphite" data-reveal>
            {flagship.role}
          </p>

          {/* The one citable engineering number on this page, stated where a
              skim will actually meet it. It is the headline of the `tests`
              decision below, not a second claim: that entry explains how the
              number is possible (a root Package.swift, no simulator), this
              line is the number itself. Mono because it is data. */}
          <p className="mono mt-[var(--sp-sm)] text-graphite" data-reveal>
            {flagship.testStat}
          </p>
        </SectionHeader>

        {/* Screens open the case study rather than close it. This is a shipped,
            App Store-live product and the screenshots are the only proof of
            that which survives a skim — behind "Native depth", "Architecture",
            "Decisions" and "Honestly" they were four text sections deep, which
            is three more than a first read gives them. The prose that explains
            HOW it is built still follows in the same order it always did; only
            the evidence moved ahead of it. */}
        <Block label="Screens">
          <PhoneFrameGrid shots={flagship.media.screenshots} sizes="(min-width: 768px) 22vw, 44vw" />
          <DemoClip />
        </Block>

        <Block label="Native depth">
          <dl className="grid grid-cols-1 border-t border-rule sm:grid-cols-2" data-reveal>
            {flagship.nativeDepth.map((item) => (
              <div key={item.name} className="border-b border-rule py-[var(--sp-sm)] sm:pr-[var(--sp-md)]">
                <dt className="display-3">{item.name}</dt>
                <dd className="mt-[0.3em] text-sm text-graphite">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block label="Architecture">
          <ArchDiagram />
        </Block>

        <Block label="Decisions">
          <ol className="border-t border-rule">
            {flagship.decisions.map((d) => (
              <li key={d.id} className="border-b border-rule py-[var(--sp-md)]" data-reveal>
                <h3 className="display-3">{d.title}</h3>
                <p className="body-copy mt-[var(--sp-xs)]">{d.choice}</p>
                <p className="body-copy mt-[var(--sp-xs)] border-l-2 border-signal pl-[var(--sp-xs)] text-graphite">
                  <span className="label !text-signal mb-[0.35em] block">Tradeoff</span>
                  {d.tradeoff}
                </p>
              </li>
            ))}
          </ol>
        </Block>

        <Block label="Honestly">
          <div data-reveal>
            <h3 className="display-3">{flagship.hardestProblem.title}</h3>
            <div className="body-copy mt-[var(--sp-xs)]">
              {flagship.hardestProblem.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </Block>
      </div>
    </section>
  );
}
