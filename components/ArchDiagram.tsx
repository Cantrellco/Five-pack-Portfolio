import { flagship } from '@/content/projects';

/**
 * The architecture, as real text. No image, no canvas — an ordered list of
 * tiers that a screen reader walks top to bottom in the same order the
 * diagram reads, and that costs nothing to download.
 */
export function ArchDiagram() {
  const { tiers, caption } = flagship.architecture;

  return (
    /* A container query, not a media query. This diagram is one of the few
       things on the page whose available width has almost nothing to do with
       the viewport: from `lg` up it sits in the right pane, which is a third of
       the window, so a `sm:` rule measured against the viewport put two columns
       where there was only room for one. `@container` makes the rule below ask
       the figure how wide IT is. */
    <figure className="@container mt-[var(--sp-lg)]" data-reveal>
      <ol className="border-t border-rule" aria-label="Workout Buddy architecture, top to bottom">
        {tiers.map((tier) => (
          <li
            key={tier.label}
            /* Two columns only once the figure itself is wide enough to hold
               them, and `minmax(0, …)` so neither refuses to shrink. A flat
               `13.5rem` first column left about 100px for the nodes in the
               right pane and pushed the widest one out through its side. */
            className="grid grid-cols-1 gap-[var(--sp-2xs)] border-b border-rule py-[var(--sp-sm)] @md:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] @md:gap-[var(--sp-md)]"
          >
            <div>
              <p className="label !text-ink">{tier.label}</p>
              <p className="mono mt-[0.35em] text-graphite">{tier.note}</p>
            </div>

            {/* `min-w-0`: a grid item defaults to `min-width: auto` and so
                refuses to shrink below its widest chip, which put 5px of the
                longest node past the edge and left the content pane
                horizontally scrollable. With the floor at 0 the chip text
                wraps instead. */}
            <ul className="flex min-w-0 flex-wrap items-start gap-[var(--sp-2xs)] sm:border-l sm:border-rule sm:pl-[var(--sp-md)]">
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
