import { SiteFrame } from '@/components/DeviceFrames';
import { SectionHeader } from '@/components/SectionHeader';
import type { ClientSite as ClientSiteContent } from '@/content/projects';

/**
 * One client site, on its own. This used to be a row in a shared list of
 * "client work", which meant two unrelated businesses shared a heading and
 * neither could be linked to directly. Each is now its own section behind its
 * own tab.
 */
export function ClientSite({ site }: { site: ClientSiteContent }) {
  const links: Array<{ href: string; label: string }> = [
    ...(site.url ? [{ href: site.url, label: 'Open the live site' }] : []),
    ...(site.repoUrl ? [{ href: site.repoUrl, label: 'Read the code on GitHub' }] : []),
  ];

  return (
    <div className="section">
      <SectionHeader
        id={`${site.id}-title`}
        label="Client work"
        title={site.name}
        meta={<span className="block">{site.kind}</span>}
      >
        <p className="lede mt-[var(--sp-md)] max-w-[46ch] text-graphite" data-reveal>
          {site.summary}
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

      <div className="mt-[var(--sp-xl)]">
        <p className="label kicker" data-reveal>
          What it does
        </p>
        <ul className="border-t border-rule">
          {site.lines.map((line) => (
            <li key={line} className="border-b border-rule py-[var(--sp-sm)]" data-reveal>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <SiteFrame
        src={site.screenshot.src}
        alt={site.screenshot.alt}
        label={site.name}
        sizes="(min-width: 1024px) 26rem, 90vw"
        mobile={site.screenshotMobile}
      />
    </div>
  );
}
