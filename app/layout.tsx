import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { profile } from '@/content/profile';
import { personJsonLd } from '@/lib/jsonld';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: `${profile.name} — Full-stack engineer & AI developer`,
  description: profile.summary,
  alternates: { canonical: '/' },
  authors: [{ name: profile.name, url: profile.siteUrl }],
  creator: profile.name,
  openGraph: {
    type: 'profile',
    url: '/',
    title: `${profile.name} — Full-stack engineer & AI developer`,
    description: profile.summary,
    siteName: profile.name,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${profile.name} — Full-stack engineer & AI developer`,
    description: profile.summary,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#ebe5d9',
  colorScheme: 'light',
};

/**
 * Adds `.js` to <html> before first paint. Everything that hides itself for a
 * reveal animation is scoped to `.js`, so with scripting off nothing is ever
 * left invisible.
 *
 * The timer is the failsafe for the case in between: scripting on, but the
 * bundle never arrives or throws. MotionProvider sets `reveal-ready` the moment
 * it takes over; if that has not happened within two and a half seconds, the
 * gate is dropped and the page shows its content unanimated. A portfolio that
 * renders blank because a CDN blipped is worse than one that does not animate.
 */
const JS_FLAG = `(function(){var d=document.documentElement;d.classList.add('js');
setTimeout(function(){if(!d.classList.contains('reveal-ready'))d.classList.remove('js')},2500)})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /* The script below adds `.js` to this element before React hydrates, so
       the class list React rendered and the one it finds never match. That is
       the intended behaviour, not a bug to fix by moving the script later —
       moving it later is what causes the flash it exists to prevent. Suppress
       the warning on this element only; it does not apply to any descendant. */
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The three faces that set above-the-fold text, smallest first.
            Leaving Newsreader to be discovered from the stylesheet measured
            0.008 CLS as the h1 swapped out of the serif fallback — 55KB is a
            cheap price for a layout that never moves. The italic is used
            further down the page and is deliberately not preloaded. */}
        <link rel="preload" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/martian-mono.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/instrument-sans.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/newsreader-display.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
        />
      </body>
    </html>
  );
}
