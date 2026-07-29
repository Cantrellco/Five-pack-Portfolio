import { flagship } from '@/content/projects';

/**
 * The architecture, as real text. No image, no canvas — an ordered list of
 * tiers that a screen reader walks top to bottom in the same order the
 * diagram reads, and that costs nothing to download.
 */
export function ArchDiagram() {
  const { tiers, caption } = flagship.architecture;

  return (
    <figure className="mt-[var(--sp-lg)]" data-reveal>
      <ol className="border-t border-rule" aria-label="Workout Buddy architecture, top to bottom">
        {tiers.map((tier) => (
          <li
            key={tier.label}
            className="grid grid-cols-1 gap-[var(--sp-2xs)] border-b border-rule py-[var(--sp-sm)] sm:grid-cols-[13.5rem_1fr] sm:gap-[var(--sp-md)]"
          >
            <div>
              <p className="label !text-ink">{tier.label}</p>
              <p className="mono mt-[0.35em] text-graphite">{tier.note}</p>
            </div>

            <ul className="flex flex-wrap items-start gap-[var(--sp-2xs)] sm:border-l sm:border-rule sm:pl-[var(--sp-md)]">
              {tier.nodes.map((node) => (
                <li
                  key={node}
                  className="border border-rule bg-paper-2 px-[0.7em] py-[0.42em] text-sm leading-tight"
                >
                  {node}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <figcaption className="mono mt-[var(--sp-xs)] max-w-[60ch] text-graphite">{caption}</figcaption>
    </figure>
  );
}
