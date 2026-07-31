/**
 * The resume.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(owner) — THIS FILE IS A SHELL. FILL IT IN.
 *
 * Every entry below is marked `placeholder: true`. Nothing here is a claim
 * about your history, because nothing here was written from your history — the
 * layout, the typography and the tab are finished, the facts are not.
 *
 * To fill it in: replace the strings, delete `placeholder: true` from each
 * entry you have made real. The site reads that flag and refuses to present
 * unfilled rows as fact — same rule the training data follows via
 * `fieldStats.placeholder` in `lib/generated/field-stats.ts`. An empty
 * `roles` array hides the whole timeline rather than rendering an empty frame.
 * ─────────────────────────────────────────────────────────────────────────────
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
    id: 'role-1',
    period: 'TODO — e.g. JAN 2024 — PRESENT',
    startedAt: '2024-01',
    org: 'TODO — employer or "Independent"',
    title: 'TODO — your title',
    location: 'TODO — city, state, or "Remote"',
    bullets: [
      'TODO — what you owned, stated as a responsibility.',
      'TODO — what you shipped, with the platform or stack named.',
      'TODO — an outcome with a number in it, if you have one.',
    ],
    placeholder: true,
  },
  {
    id: 'role-2',
    period: 'TODO — earlier role',
    startedAt: '2022-01',
    org: 'TODO — employer',
    title: 'TODO — your title',
    bullets: ['TODO — what you did there.'],
    placeholder: true,
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
