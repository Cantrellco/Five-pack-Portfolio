import type { ReactNode } from 'react';

/**
 * The editorial unit this page is built from: a kicker naming the block,
 * content below it. Left-aligned, one column, never centred.
 */
export function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-[var(--sp-xl)]">
      <p className="label kicker" data-reveal>
        {label}
      </p>
      {children}
    </div>
  );
}
