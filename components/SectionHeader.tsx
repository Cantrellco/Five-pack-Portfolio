import type { CSSProperties, ReactNode } from 'react';
import { resolveLogo } from '@/lib/media';
import { ScrambleText } from '@/components/ScrambleText';

/**
 * Kicker, then headline, then byline — one column, read top to bottom, the
 * way a magazine opens a feature. `meta` used to sit stranded in a narrow
 * aside next to the title it describes; it now runs directly under it, where
 * the eye already is.
 */
export function SectionHeader({
  id,
  label,
  title,
  logoId,
  meta,
  children,
}: {
  id: string;
  label: string;
  title: string;
  /**
   * A project's own id (`content/nav.ts` `WORK_TABS[].id`) — resolved
   * against `public/media/logos/<logoId>.{svg,png,webp,jpg,jpeg}` via
   * `resolveLogo`. No file dropped in yet means no logo renders and the
   * title falls back to plain text, same "blank hides it, not a broken
   * image" contract every other optional asset on this site follows. Every
   * non-project caller (About, Resume, Contact) leaves this unset.
   */
  logoId?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const logo = logoId ? resolveLogo(logoId) : null;

  return (
    <div>
      <p className="label kicker" data-reveal>
        <ScrambleText text={label} />
      </p>

      <h2 id={id} className="display-1" data-reveal>
        {logo ? (
          <span className="section-title-row">
            {title}
            {/* eslint-disable-next-line @next/next/no-img-element -- a real
                logo arrives at whatever aspect ratio the project actually
                has (a square app icon vs. a client's wide wordmark);
                next/image needs that ratio known up front to avoid
                distorting it, which nothing here can supply before the
                real file exists. Decorative: the title text it follows
                already names the project. */}
            <img
              src={logo.src}
              alt=""
              className="section-title-logo"
              data-tile={logo.tile ? '' : undefined}
              style={{ '--logo-scale': logo.scale } as CSSProperties}
              loading="lazy"
              decoding="async"
            />
          </span>
        ) : (
          title
        )}
      </h2>

      {/* Body face, not mono: meta carries taglines and kind lines — short
          prose — and mono is reserved for data. Callers that pass a genuinely
          data-shaped line (a ship date, a count) still read fine one voice
          up; a sentence in mono never does. */}
      {meta ? (
        <div className="mt-[var(--sp-2xs)] text-sm text-graphite" data-reveal>
          {meta}
        </div>
      ) : null}

      {children}
    </div>
  );
}
