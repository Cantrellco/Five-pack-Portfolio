import type { ReactNode } from 'react';

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
  meta,
  children,
}: {
  id: string;
  label: string;
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="label kicker" data-reveal>
        {label}
      </p>

      <h2 id={id} className="display-1" data-reveal>
        {title}
      </h2>

      {meta ? (
        <div className="mono mt-[var(--sp-2xs)] text-graphite" data-reveal>
          {meta}
        </div>
      ) : null}

      {children}
    </div>
  );
}
