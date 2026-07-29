import type { ReactNode } from 'react';

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
    <div className="grid-editorial">
      <div className="col-aside">
        <p className="label" data-reveal>
          {label}
        </p>
        {meta ? (
          <div className="mono mt-[var(--sp-2xs)] text-graphite" data-reveal>
            {meta}
          </div>
        ) : null}
      </div>

      <div className="col-main">
        <h2 id={id} className="display-1" data-reveal>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
