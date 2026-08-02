import type { Metadata } from 'next';
import { notFoundCopy } from '@/content/not-found';

/**
 * The 404. A code, one line, one link — vertically centred on the paper with
 * the field's static frame faint behind it.
 *
 * Entirely server-rendered and entirely static. No `data-reveal` anywhere:
 * that attribute hides an element under the `.js` class until MotionProvider
 * reveals it, and MotionProvider is mounted by the home page, not the layout —
 * on this route the copy would sit invisible until the 2.5s failsafe dropped
 * the gate. A page whose whole job is to be read immediately opts out.
 *
 * The poster is the same asset the home page server-renders as its WebGL-off
 * fallback — one cached request, no canvas, no client component. It is dimmed
 * from the layer div so the ambient scatter reads as texture behind the type
 * rather than as the subject; the opacity is an inline number because it is a
 * judgement about this page, not a token the palette owns.
 */
export const metadata: Metadata = {
  title: notFoundCopy.title,
  // The 404 status already keeps this out of the index; saying so explicitly
  // costs nothing and overrides the layout's blanket `index: true`.
  robots: { index: false, follow: false },
};

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function NotFound() {
  return (
    <>
      <div className="field-layer" aria-hidden="true" style={{ opacity: 0.45 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same call
            FieldMount makes: an inline SVG drawn from the field data;
            next/image would only add a request. */}
        <img
          src={`${base}/field/poster.svg`}
          alt=""
          className="field-poster"
          width={1600}
          height={1000}
          decoding="async"
        />
      </div>

      <div className="page">
        <main
          id="main"
          tabIndex={-1}
          className="flex min-h-[100svh] items-center outline-none"
        >
          <div className="shell section">
            <p className="mono kicker text-graphite">{notFoundCopy.code}</p>

            <h1 className="display-1 max-w-[24ch]">{notFoundCopy.line}</h1>

            <p className="mt-[var(--sp-lg)]">
              {/* A plain anchor, not next/link: there is nothing to prefetch
                  from a dead address, and the link must work before — or
                  without — any bundle. */}
              <a className="link-block" href={`${base}/`}>
                {notFoundCopy.backLabel}
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
