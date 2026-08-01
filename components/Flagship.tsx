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
          <p className="mt-[var(--sp-md)] flex flex-wrap items-center gap-[var(--sp-2xs)]" data-reveal>
            <a className="cta" href={flagship.appStoreUrl} rel="noopener">
              Open in the App Store
            </a>
            {flagship.siteUrl ? (
              <a className="cta-ghost" href={flagship.siteUrl} rel="noopener">
                Visit the site
              </a>
            ) : null}
          </p>

          <div className="body-copy mt-[var(--sp-md)]" data-reveal>
            {flagship.what.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <p className="body-copy mt-[var(--sp-sm)] text-graphite" data-reveal>
            {flagship.role}
          </p>
        </SectionHeader>

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

          <div className="mt-[var(--sp-lg)]" data-reveal>
            <h3 className="display-3">{flagship.refactor.title}</h3>
            <div className="body-copy mt-[var(--sp-xs)]">
              {flagship.refactor.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </Block>

        <Block label="Screens">
          <PhoneFrameGrid shots={flagship.media.screenshots} sizes="(min-width: 768px) 22vw, 44vw" />
          <DemoClip />
        </Block>
      </div>
    </section>
  );
}
