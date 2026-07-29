import type { ReactNode } from 'react';

/**
 * The editorial unit this page is built from: a label side-set in the margin,
 * content in the main column. Left-aligned, asymmetric, never centred.
 */
export function Block({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid-editorial mt-[var(--sp-xl)]">
      <p className="label col-aside" data-reveal>
        {label}
      </p>
      <div className={wide ? 'col-wide' : 'col-main'}>{children}</div>
    </div>
  );
}
