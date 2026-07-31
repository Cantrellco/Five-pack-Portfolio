import { Block } from '@/components/Block';
import { PhoneFrameGrid } from '@/components/DeviceFrames';
import { SectionHeader } from '@/components/SectionHeader';
import { harvest } from '@/content/projects';

/**
 * The second native app. Lighter than the flagship — no architecture diagram
 * and no decision log — because the interesting thing about it is what it
 * refuses to depend on, not how its processes talk to each other.
 */
export function Harvest() {
  const links: Array<{ href: string; label: string }> = [
    ...(harvest.appStoreUrl ? [{ href: harvest.appStoreUrl, label: 'Open in the App Store' }] : []),
    ...(harvest.repoUrl ? [{ href: harvest.repoUrl, label: 'Read the code on GitHub' }] : []),
  ];

  return (
    <div className="section">
      <SectionHeader
        id="the-harvest-title"
        label="Native app"
        title={harvest.name}
        meta={
          <>
            <span className="block">{harvest.kind}</span>
            <span className="block">{harvest.tagline}</span>
          </>
        }
      >
        <p className="body-copy mt-[var(--sp-md)] text-md leading-[1.5]" data-reveal>
          {harvest.what}
        </p>

        {links.length > 0 ? (
          <p className="mt-[var(--sp-md)] flex flex-wrap gap-[var(--sp-sm)]" data-reveal>
            {links.map((l) => (
              <a key={l.href} className="link-block text-sm" href={l.href} rel="noopener">
                {l.label}
              </a>
            ))}
          </p>
        ) : null}
      </SectionHeader>

      <Block label="What's inside">
        <dl className="border-t border-rule">
          {harvest.features.map((f) => (
            <div key={f.name} className="border-b border-rule py-[var(--sp-sm)]" data-reveal>
              <dt className="display-3">{f.name}</dt>
              <dd className="body-copy mt-[0.35em] text-graphite">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block label="Constraints">
        <ul className="border-t border-rule">
          {harvest.constraints.map((line) => (
            <li key={line} className="border-b border-rule py-[var(--sp-sm)]" data-reveal>
              {line}
            </li>
          ))}
        </ul>
      </Block>

      <Block label="Screens">
        <PhoneFrameGrid shots={harvest.media.screenshots} sizes="(min-width: 768px) 22vw, 44vw" />
      </Block>
    </div>
  );
}
