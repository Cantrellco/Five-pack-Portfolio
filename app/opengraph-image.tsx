import { ImageResponse } from 'next/og';
import { profile } from '@/content/profile';
import { fieldStats } from '@/lib/generated/field-stats';
import { ogDisplayFontBase64 } from '@/lib/generated/static-assets';
import { ogTrendSvg } from '@/lib/generated/og-trend';

export const alt = `${profile.name} — Full-stack engineer & AI developer`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

/**
 * The link preview: what the forwarded URL renders as.
 *
 * Composed at build time from the same tokens, the same display face, and the
 * same trend curve the page draws — no external service, no separate asset to
 * keep in sync. Satori cannot read woff2, so the display font ships alongside
 * as a pinned TTF instance (see scripts/subset-fonts.py).
 */
export default function OpengraphImage() {
  const display = Buffer.from(ogDisplayFontBase64, 'base64');
  const curve = `data:image/svg+xml;base64,${Buffer.from(ogTrendSvg).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ebe5d9',
          color: '#171512',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#6a6358',
              marginBottom: 26,
            }}
          >
            {profile.stackTag}
          </div>
          <div style={{ fontFamily: 'Display', fontSize: 132, lineHeight: 0.92, letterSpacing: -3 }}>
            {profile.firstName}
          </div>
          <div style={{ fontFamily: 'Display', fontSize: 132, lineHeight: 0.92, letterSpacing: -3 }}>
            {profile.lastName}
          </div>
          <div style={{ fontSize: 34, color: '#6a6358', marginTop: 26 }}>{profile.roleLine}</div>
        </div>

        {/* The progression curve, the same file the page's figure falls back to. */}
        <img src={curve} alt="" width={1056} height={132} style={{ opacity: 0.75 }} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 21,
            color: '#6a6358',
            borderTop: '1px solid #d3cbba',
            paddingTop: 20,
          }}
        >
          <span>Workout Buddy — iOS &amp; watchOS, on the App Store</span>
          {/* Gated on the placeholder flag, which is the whole reason that flag
              exists (see CLAUDE.md: never state a fact about the training data
              that the data does not support). `data/training.json` currently
              ships `"placeholder": true` with `"athlete": "Cody Cantrell"`, so
              the point count is seeded-PRNG output, not a training history —
              and this is the link preview every share renders, which made it
              the single most-seen unsupported claim on the site. When real
              data replaces the placeholder the flag flips and the count comes
              back on its own; until then the slot states what is actually
              true of the artwork. */}
          <span>
            {fieldStats.placeholder
              ? 'Ambient field — one canvas, one draw call'
              : `${fieldStats.points.toLocaleString('en-US')} logged reps, drawn`}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Display', data: display, style: 'normal', weight: 500 }],
    },
  );
}
