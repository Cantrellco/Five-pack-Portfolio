import { fieldCopy } from '@/lib/field-copy';
import { fieldStats } from '@/lib/generated/field-stats';
import { flagship } from '@/content/projects';

const n = (v: number) => v.toLocaleString('en-US');
const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * The one place the signature explains itself.
 *
 * It sits directly after the flagship section because that is what it is: the
 * output of the app above it, drawn. The figure below reserves the box the
 * canvas resolves into — the page owns the frame and labels the axes in real
 * text, and the drawing only fills it.
 */
export function FieldNote() {
  return (
    <section id="field" className="section rule-top" aria-labelledby="field-title">
      <div className="shell">
        <div className="grid-editorial">
          <p className="label col-aside" data-reveal>
            The drawing
          </p>

          <div className="col-main">
            <h2 id="field-title" className="display-2" data-reveal>
              The field behind this page is {flagship.name}&rsquo;s data
            </h2>

            <p className="lede mt-[var(--sp-sm)] max-w-[46ch] text-graphite" data-reveal>
              {fieldCopy.resolveLede}
            </p>

            <dl
              className="mt-[var(--sp-md)] grid grid-cols-2 gap-y-[var(--sp-sm)] border-t border-rule pt-[var(--sp-sm)] sm:grid-cols-4"
              data-reveal
            >
              {[
                { k: 'Points', v: n(fieldStats.points), note: 'one per rep' },
                { k: 'Sets', v: n(fieldStats.sets), note: `across ${n(fieldStats.sessions)} sessions` },
                { k: 'Months', v: String(fieldStats.months), note: 'continuous log' },
                { k: 'Lifts', v: String(fieldStats.liftNames.length), note: 'tracked separately' },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="label">{s.k}</dt>
                  <dd className="display-3 mt-[0.2em] tabular-nums">{s.v}</dd>
                  <dd className="mono text-graphite">{s.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className="mt-[var(--sp-xl)]" data-reveal>
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-[var(--sp-md)] gap-y-[var(--sp-3xs)] border-b border-rule pb-[var(--sp-2xs)]">
            <span className="label !text-ink">Estimated one-rep max, by week</span>
            <span className="mono text-graphite">
              {fieldStats.minE1rm}–{fieldStats.maxE1rm} {fieldStats.unit}
            </span>
          </figcaption>

          {/* The canvas measures this box and draws the resolved plot inside it.
              The SVG is the same curve for anyone without WebGL, and it stays
              behind the canvas rather than instead of it. */}
          <div id="field-plot" className="relative h-[clamp(180px,32svh,320px)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a build-time
                SVG of the same trend arrays; the optimiser has nothing to add. */}
            <img
              src="/field/trend.svg"
              alt={`Estimated one-rep max for ${fieldStats.liftNames.length} lifts, rising over ${fieldStats.months} months`}
              className="plot-fallback absolute inset-0 h-full w-full"
              width={1000}
              height={300}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="mono flex items-baseline justify-between border-t border-rule pt-[var(--sp-2xs)] text-graphite">
            <span>{monthYear(fieldStats.from)}</span>
            <span>{monthYear(fieldStats.to)}</span>
          </div>

          <ul className="mono mt-[var(--sp-xs)] flex flex-wrap gap-x-[var(--sp-sm)] gap-y-[var(--sp-3xs)] text-graphite">
            {fieldStats.liftNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </figure>

        <div className="grid-editorial">
          <div className="col-main">
            <p className="body-copy mono mt-[var(--sp-md)] !text-xs leading-[1.75] text-graphite" data-reveal>
              Positions are precomputed at build time into a{' '}
              {Math.round((fieldStats.points * 6) / 1024)}KB quantised buffer — six bytes a point — and drawn
              in two calls with no 3D library and no postprocessing. The browser parses no JSON and
              computes no layout. With WebGL unavailable, or reduced motion set, the same numbers render
              as static SVG instead.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
