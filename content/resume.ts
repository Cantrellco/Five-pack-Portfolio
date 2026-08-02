/**
 * The resume.
 *
 * Newest-start-first, same rule `startedAt` documents on the type below.
 * Workout Buddy's build started before Gifford and the freelance work did,
 * but L&E Recycling — the day job that paid for those nights and
 * weekends — is listed last because May 2019 is the oldest start date here,
 * not because it matters least.
 */

export type ResumeRole = {
  id: string;
  /** Displayed verbatim. Use the same casing the rest of the site uses. */
  period: string;
  /** Sorts the timeline newest-first. ISO yyyy-mm; no day needed. */
  startedAt: string;
  org: string;
  title: string;
  /** Optional — omitted rows simply do not render the line. */
  location?: string;
  /** One responsibility or outcome per line. Verbs, not adjectives. */
  bullets: readonly string[];
  /** True until you have replaced the row with something true. */
  placeholder?: boolean;
};

/* Typed as the interface rather than `as const satisfies` on purpose: with
   literal inference every row gets its own exact shape, so a row that omits an
   optional field makes that field unreadable across the union. The array is a
   list of the same thing, and the type should say so. */
export const roles: readonly ResumeRole[] = [
  {
    id: 'gifford-properties',
    period: 'MAR 2026 — PRESENT',
    startedAt: '2026-03',
    org: 'Gifford Properties',
    title: 'Lead Developer',
    bullets: [
      'Lead developer for the company’s web presence, designing and building sites for two of its properties.',
      'Little Town: seven hand-built pages — HTML, CSS and a little JavaScript, no framework — for a children’s play space, ordered to answer a parent’s questions the way a parent actually asks them.',
      'Fusion Coffee: a Next.js site built from the shop’s own moodboard, exported static and installable as a PWA, with ordering handed off to their existing Square flow.',
    ],
  },
  {
    id: 'freelance',
    period: 'MAR 2026 — PRESENT',
    startedAt: '2026-03',
    org: 'Independent',
    title: 'Freelance Developer',
    bullets: [
      'PC Pro Inspections: a static React marketing site for a residential home inspector, with an instant quote calculator, no-backend lead capture, and local SEO built to rank for searches in the next town over.',
      'Faith Outreach: redesigned a church’s website in place on Squarespace 7.1 — the platform its own staff already knew — and delivered it as a project binder: redesign plan, brand kit, page-by-page copy, a build runbook, and a redirect map that kept the congregation’s existing links and search rankings intact.',
    ],
  },
  {
    id: 'workout-buddy',
    period: 'JUL 2025 — PRESENT',
    startedAt: '2025-07',
    org: 'Workout Buddy',
    title: 'Founder & Developer',
    bullets: [
      'Designed, built and shipped a hypertrophy training app for iPhone and Apple Watch — auto-progressing mesocycles against RP volume landmarks, with an AI coach that proposes program changes the app validates before applying them.',
      'Built the native depth end to end: a SwiftUI watchOS app on a real HKWorkoutSession, Live Activities, App Intents for Siri, Shortcuts and Spotlight, home and watch widgets, and two custom Expo native modules bridging them into React Native.',
      'Own the whole product solo on a React Native and Supabase (Postgres, row-level security) stack — roadmap, App Store review, crash triage and the support inbox. Shipped to the App Store in June 2026.',
    ],
  },
  {
    id: 'le-recycling',
    period: 'MAY 2019 — MAR 2026',
    startedAt: '2019-05',
    org: 'L&E Recycling',
    title: 'Warehouse Manager',
    bullets: [
      'Managed day-to-day warehouse operations for nearly seven years — staff, logistics and inventory.',
      'Designed and built a custom inventory management system for the company from scratch, self-taught, alongside full operational duties.',
    ],
  },
];

/**
 * Skills are grouped rather than listed flat, and deliberately have no
 * proficiency meter attached — skill bars are banned by the design rules and
 * they encode a number nobody can verify. A grouped list says the same thing
 * and survives being read by a person who knows the subject.
 *
 * These are drawn from what the rest of the site already demonstrates
 * (Workout Buddy's native depth, the platform project's Postgres work), so
 * they are safe to ship as-is — but prune anything you would not want to be
 * asked about in an interview.
 */
export const skillGroups = [
  {
    label: 'Platform',
    items: ['Swift', 'SwiftUI', 'watchOS', 'App Intents', 'WidgetKit', 'Live Activities'],
  },
  {
    label: 'Data',
    items: ['SwiftData', 'CloudKit', 'HealthKit', 'Postgres', 'Row-level security'],
  },
  {
    label: 'Practice',
    items: ['App Store release', 'Crash triage', 'Accessibility', 'Performance budgets'],
  },
] as const;

/** True while any resume row is still a placeholder. Drives the honest-copy switch. */
export const resumeIsPlaceholder = roles.some((r) => r.placeholder);

/**
 * Label for the client-only print control (`components/PrintButton.tsx`).
 * The `@media print` block in globals.css is the actual typesetting — the
 * button only calls `window.print()`.
 */
export const printLabel = 'Print or save as PDF';
