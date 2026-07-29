import { ArchDiagram } from '@/components/ArchDiagram';
import { Block } from '@/components/Block';
import { DemoClip, DeviceFrames } from '@/components/DeviceFrames';
import { SectionHeader } from '@/components/SectionHeader';
import { flagship } from '@/content/projects';

export function Flagship() {
  return (
    <section id="workout-buddy" className="section rule-top" aria-labelledby="workout-buddy-title">
      <div className="shell">
        <SectionHeader
          id="workout-buddy-title"
          label="Flagship"
          title={flagship.name}
          meta={
            <>
              <span className="block">{flagship.kind}</span>
              <span className="block">{flagship.shipped}</span>
            </>
          }
        >
          <p className="mt-[var(--sp-md)]" data-reveal>
            <a className="cta" href={flagship.appStoreUrl} rel="noopener">
              Open in the App Store
            </a>
          </p>

          <div className="body-copy mt-[var(--sp-md)] text-md leading-[1.5]" data-reveal>
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

        <Block label="Architecture" wide>
          <ArchDiagram />
        </Block>

        <Block label="Decisions">
          <ol className="border-t border-rule">
            {flagship.decisions.map((d) => (
              <li key={d.id} className="border-b border-rule py-[var(--sp-md)]" data-reveal>
                <h3 className="display-2">{d.title}</h3>
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
            <h3 className="display-2">{flagship.hardestProblem.title}</h3>
            <div className="body-copy mt-[var(--sp-xs)]">
              {flagship.hardestProblem.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>

          <div className="mt-[var(--sp-lg)]" data-reveal>
            <h3 className="display-2">{flagship.refactor.title}</h3>
            <div className="body-copy mt-[var(--sp-xs)]">
              {flagship.refactor.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </Block>

        <Block label="Screens" wide>
          <DeviceFrames />
          <DemoClip />
        </Block>
      </div>
    </section>
  );
}
