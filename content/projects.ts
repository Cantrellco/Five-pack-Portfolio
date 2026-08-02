/**
 * Project content.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH
 * The Workout Buddy and The Harvest sections below were rewritten from those
 * projects' own READMEs, not drafted from a feature list. Where a claim could
 * not be grounded in a README it was cut rather than guessed — an engineer who
 * likes this site will ask about these in an interview, so they have to be
 * exactly right. Anything still marked TODO(owner) is yours to confirm.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TechDecision = {
  id: string;
  /** The decision, stated as a decision. */
  title: string;
  /** What was actually chosen. */
  choice: string;
  /** What it cost. Every real decision costs something. */
  tradeoff: string;
};

export type ArchTier = {
  label: string;
  note: string;
  nodes: readonly string[];
};

export const flagship = {
  name: 'Workout Buddy',
  kind: 'iOS · watchOS',
  appStoreUrl: 'https://apps.apple.com/app/id6771810116',
  siteUrl: 'https://work-out-buddy.com',

  /** The repo is private, so no link. Blank renders nothing rather than a 404. */
  repoUrl: '',

  shipped: 'Shipped to the App Store in June 2026',

  /** Two sentences. What it is, who it is for. */
  what: [
    'Workout Buddy is a hypertrophy training app for iPhone and Apple Watch. You log sets, it runs auto-progressing mesocycles against RP volume landmarks, and an AI coach proposes program changes that the app validates before it applies them — for lifters who want real programming without building a spreadsheet.',
  ],

  role: 'I designed it, built it, shipped it, and I am the only person who maintains it. Roadmap, App Store review, crash triage, support email.',

  /**
   * The number the `tests` decision below earns, hoisted to the top of the
   * case study so a skim meets it. Must stay in sync with that entry's
   * `choice` string — this is the same fact stated twice on purpose (headline
   * and explanation), never two separate claims that could drift apart.
   */
  testStat: '93 native Swift tests · about 4 seconds · no simulator',

  /** Native depth. The part a web developer could not have built. */
  nativeDepth: [
    {
      name: 'watchOS app',
      detail:
        'SwiftUI, driven by a pure workout state machine, with a real HKWorkoutSession — pause, resume, heart rate, calories — that round-trips into phone history. Starts standalone.',
    },
    {
      name: 'Live Activities',
      detail:
        'Lock Screen and Dynamic Island, with an interactive Log set button that works while the app is suspended — and says so when a set needs typed numbers first.',
    },
    {
      name: 'App Intents',
      detail:
        'Ask Buddy and Start Workout, surfaced in Siri, Shortcuts and Spotlight, plus an iOS 18 Control Center and Action-button control.',
    },
    {
      name: 'Widgets',
      detail:
        'Home and Lock Screen steps widgets that refresh themselves from the pedometer while the app is closed, and a watch complication that deep-links in.',
    },
    {
      name: 'HealthKit',
      detail:
        'Workouts, heart rate, bodyweight and steps — phone workouts write back to Apple Health with cross-device dedupe against the watch’s own save.',
    },
    {
      name: 'Native bridges',
      detail:
        'Two custom Expo modules I wrote: ActivityKit over an App Group queue and a Darwin notification, and WatchConnectivity.',
    },
  ],

  architecture: {
    caption:
      'A React Native app with native Swift where native is the only way to do it. Everything above the store is a surface; everything below it is state.',
    tiers: [
      {
        label: 'Surfaces',
        note: 'Four processes, four memory budgets',
        nodes: ['iPhone app (Expo / RN)', 'Watch app (SwiftUI)', 'Widgets', 'Live Activity'],
      },
      {
        label: 'Commands',
        note: 'One entry point for every surface',
        nodes: ['App Intents', 'Siri / Shortcuts / Control Center'],
      },
      {
        label: 'Domain',
        note: 'Pure, tested, no UI framework',
        nodes: ['Auto-progression engine', 'Workout state machine (Swift)', 'Offline write queue'],
      },
      {
        label: 'State',
        note: 'Local first, server second',
        nodes: ['zustand + AsyncStorage', 'Supabase (Postgres + RLS)'],
      },
      {
        label: 'Integrations',
        note: 'Optional — denial degrades, never blocks',
        nodes: ['HealthKit', 'Anthropic proxy', 'RevenueCat'],
      },
    ] as const satisfies readonly ArchTier[],
  },

  decisions: [
    {
      id: 'suspended',
      title: 'The Lock Screen can log a set while the app is suspended',
      choice:
        'The interactive Log set button writes into an App Group queue and raises a Darwin notification instead of waking the JS runtime — the app drains the queue next time it runs, so the tap survives whether anything is alive to receive it.',
      tradeoff:
        'Two writers now touch the same workout, so the drain order has to be designed, not assumed — the payoff is a button that works even when the app is gone.',
    },
    {
      id: 'coach',
      title: 'The AI coach proposes; the app decides',
      choice:
        'The chat coach never writes to the program directly — it returns a proposed change, the app validates it against its own rules, and only then applies it, through a server-side proxy with a hard per-user dollar budget.',
      tradeoff:
        'Every AI-suggested change has to be reachable by hand too, but the validation layer means a rejected proposal never becomes a corrupted mesocycle.',
    },
    {
      id: 'tests',
      title: 'The native code is testable without a simulator',
      choice:
        'A root Package.swift compiles the pure Swift — the watch state machine and its friends — on macOS, where `swift test` runs 93 native tests in about four seconds.',
      tradeoff:
        'The logic has to stay genuinely free of UIKit and WatchKit — in exchange, CI checks the hardest part of the app in seconds.',
    },
  ] as const satisfies readonly TechDecision[],

  hardestProblem: {
    title: 'The hardest problem',
    // TODO(owner): this is the shape of the problem as the architecture implies
    // it. If the real war story differs, replace it — do not leave a version
    // that is merely plausible.
    body: [
      'Keeping one workout consistent across four processes that share no memory — phone, watch, widget and Live Activity can each believe they know the current set, and the Log set button can fire when the app is not running at all. The fix was to stop treating the app as the owner: surfaces append into an App Group queue, and a drain step folds them into state in a defined order.',
    ],
  },

  media: {
    // Drop the real files at these paths — no code change needed.
    // Frames reserve their exact aspect ratio, so adding them cannot shift layout.
    screenshots: [
      { src: '/media/workout-buddy-1.png', alt: 'Workout Buddy — today’s Push session, logging a set with the rest timer running', label: 'Today' },
      { src: '/media/workout-buddy-2.png', alt: 'Workout Buddy — Buddy, the AI coach, proposing a change to the Push day', label: 'Coach' },
      { src: '/media/workout-buddy-3.png', alt: 'Workout Buddy — the Programs list with an active Push/Pull/Legs mesocycle', label: 'Programs' },
      { src: '/media/workout-buddy-4.png', alt: 'Workout Buddy — the Profile screen, with training streaks and step tracking', label: 'Profile' },
    ],
    demo: {
      src: '/media/workout-buddy-demo.mp4',
      poster: '/media/workout-buddy-demo-poster.jpg',
      caption: 'Starting a session, logging a set, and the rest timer on the Lock Screen.',
    },
  },
} as const;

/**
 * The second native app. Written from its README: pure SwiftUI, no third-party
 * dependencies at all, and the entire Bible bundled rather than fetched.
 */
export const harvest = {
  id: 'the-harvest',
  name: 'The Harvest',
  kind: 'iOS · SwiftUI',
  tagline: 'A Bible app centered on Jesus.',
  repoUrl: 'https://github.com/Cantrellco/the-harvest',
  // TODO(owner): add the App Store URL once it ships. Blank hides the link.
  appStoreUrl: '',

  what: 'A native iOS Bible app built around reading, writing and listening rather than streaks and badges. Two full public-domain translations ship inside the binary, so it works with the network off.',

  features: [
    {
      name: 'The whole Bible, offline',
      detail:
        'KJV and the World English Bible bundled — all 66 books, 31,100+ verses. Reference and full-text search, and a six-colour highlight palette where each colour carries a meaning.',
    },
    {
      name: 'Notes as a writing room',
      detail:
        'A parchment surface with serif ink and gentle prompts, verse attachments, and Reflection, Sermon and Prayer as distinct kinds.',
    },
    {
      name: 'Sermons that take their own notes',
      detail:
        'Add a podcast URL or import audio, then on-device transcription pulls out key points and every scripture mentioned as tappable chips that open the reader. Works with no backend — a connected one just makes the summary richer.',
    },
    {
      name: 'Ask, with the app as context',
      detail:
        'An assistant that activates once you connect your own backend. It already knows the passage you are in, your notes and your plan, and answers with verse chips that jump straight into the reader.',
    },
  ],

  constraints: [
    'No third-party dependencies — Apple frameworks and bundled public-domain scripture only.',
    'iOS 18 deployment target, iPhone-first and running on iPad, with Liquid Glass surfaces on iOS 26 and a graceful material fallback below it.',
    'Design carries the intent: warm near-black canvas, antique gold and parchment, procedural light backgrounds, arch motifs.',
  ],

  media: {
    // Same contract as flagship.media: drop the files in, no code change.
    screenshots: [
      { src: '/media/the-harvest-1.png', alt: 'The Harvest — the Home screen, with the verse of the day and today’s reading', label: 'Home' },
      { src: '/media/the-harvest-2.png', alt: 'The Harvest — the KJV reader, open to 1 John 4', label: 'Reader' },
      { src: '/media/the-harvest-3.png', alt: 'The Harvest — Notes, filterable by Reflection, Sermon and Prayer', label: 'Notes' },
      { src: '/media/the-harvest-4.png', alt: 'The Harvest — Sermons, ready to transcribe an added sermon', label: 'Sermons' },
    ],
  },
} as const;

/**
 * Web work. Each one is its own tab and its own section — no shared list, so
 * every site can be linked to directly.
 *
 * A blank `url` or `repoUrl` renders no link rather than a dead one.
 */
export type ClientSite = {
  id: string;
  name: string;
  kind: string;
  summary: string;
  url: string;
  repoUrl: string;
  lines: readonly string[];
  /** Same contract as flagship.media: drop the file in, no code change. */
  screenshot: { src: string; alt: string };
  /**
   * The same page's mobile view, shown in a phone frame next to the desktop
   * one. Optional — a site with no live URL yet (see Fusion Coffee) has
   * nothing to screenshot, so it simply doesn't render one.
   */
  screenshotMobile?: { src: string; alt: string; label: string };
};

export const sites = [
  {
    id: 'little-town',
    name: 'Little Town',
    kind: 'Client · Web',
    summary: 'A play-town site for small children in Fairfield, Illinois.',
    url: 'https://cantrellco.github.io/Little-Town/',
    repoUrl: 'https://github.com/Cantrellco/Little-Town',
    lines: [
      'Seven hand-built pages — visit, memberships, pricing, parties, the story — written to answer a parent’s questions in the order a parent actually asks them.',
      'Hand-written HTML, CSS and a little JavaScript. No framework and no build step — a brochure doesn’t need a toolchain.',
      'Cross-sells the coffee shop next door, which is the other site on this page.',
    ],
    screenshot: { src: '/media/little-town-1.jpg', alt: 'Little Town — the home page' },
    screenshotMobile: {
      src: '/media/little-town-mobile-1.jpg',
      alt: 'Little Town — the home page, on mobile',
      label: 'Mobile',
    },
  },
  {
    id: 'fusion-coffee',
    name: 'Fusion Coffee',
    kind: 'Client · Web',
    summary: 'Coffee shop site for a coffee shop in downtown Fairfield, Illinois.',
    url: 'https://cantrellco.github.io/Fusion-Coffee/',
    repoUrl: 'https://github.com/Cantrellco/Fusion-Coffee',
    lines: [
      'Built from the shop’s own moodboard — warm, editorial and photography-forward — with their neon logo kept as the brand mark.',
      'Next.js App Router exported as a fully static site, and installable as a PWA from the web manifest and icon set.',
      'Shop content — address, hours, menu, socials — lives in a single site file, so it changes in one place.',
      'Ordering hands off to the Square flow the shop already runs.',
    ],
    screenshot: { src: '/media/fusion-coffee-1.jpg', alt: 'Fusion Coffee — the home page' },
    screenshotMobile: {
      src: '/media/fusion-coffee-mobile-1.jpg',
      alt: 'Fusion Coffee — the home page, on mobile',
      label: 'Mobile',
    },
  },
  {
    id: 'pc-pro',
    name: 'PC Pro Inspections',
    kind: 'Client · Web',
    summary: 'Marketing site for a local home inspector.',
    url: 'https://pcproinspections.com',
    repoUrl: 'https://github.com/Cantrellco/PC-Pro-Inspections',
    // Deliberately names no submit mechanism and no specific config file: an
    // earlier draft claimed both and neither was reliably true of what is
    // deployed. Nothing here states something the project does not support.
    lines: [
      'Instant quote calculator, lead capture with no backend, local SEO and JSON-LD.',
      'Static React build; the owner edits business details in one config file.',
      'Built to rank for someone searching for an inspector in the next town over.',
    ],
    screenshot: { src: '/media/pc-pro-1.jpg', alt: 'PC Pro Inspections — the home page' },
    screenshotMobile: {
      src: '/media/pc-pro-mobile-1.jpg',
      alt: 'PC Pro Inspections — the home page, on mobile',
      label: 'Mobile',
    },
  },
  {
    id: 'faith-outreach',
    name: 'Faith Outreach',
    kind: 'Client · Web',
    summary: 'A church website redesign in Terre Haute, Indiana.',
    url: 'https://fochurch.org',
    /** The planning repo is private, so there is nothing a visitor could open. */
    repoUrl: '',
    lines: [
      'Redesigned in place on Squarespace 7.1 rather than rebuilt in code, because the people who had to keep it updated were church staff, not developers.',
      'The work happened on a private duplicate of the live site, so nothing changed for a visitor until it was ready.',
      'Delivered as a project binder: redesign plan, brand kit, page-by-page copy, a build runbook and a plain-English edit guide for staff.',
      'An old-to-new redirect map built from the site’s existing sitemap, so the congregation’s existing links and search rankings survived the launch.',
      'The church has since moved the live site onto a different platform — the screenshots below are the Squarespace redesign as delivered, not the site’s current build.',
    ],
    screenshot: { src: '/media/faith-outreach-1.jpg', alt: 'Faith Outreach — the redesigned home page' },
    screenshotMobile: {
      src: '/media/faith-outreach-mobile-1.jpg',
      alt: 'Faith Outreach — the Plan Your Visit page, on mobile',
      label: 'Mobile',
    },
  },
] as const satisfies readonly ClientSite[];
