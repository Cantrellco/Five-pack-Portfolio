/**
 * Project content.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(owner) — VERIFY BEFORE LAUNCH
 * The architecture tiers, the four technical decisions and the "hardest
 * problem" note below were drafted from the feature list (Watch app, Live
 * Activities, widgets, App Intents, HealthKit, on-device Core ML). They are
 * written to be true of Workout Buddy as described, but they are claims about
 * YOUR code — read them and correct anything that does not match the real
 * implementation. An engineer who likes the site will ask about these in an
 * interview, so they need to be exactly right.
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

  // TODO(owner): set to the public repo URL, or leave blank to hide the link.
  repoUrl: '',

  shipped: 'Shipped to the App Store in January 2025',

  /** Two sentences. What it is, who it is for. */
  what: [
    'Workout Buddy is a training log that picks your next set for you. It reads what you actually lifted, runs a progression model on device, and tells you the weight and reps to load — for lifters who want structure without building a spreadsheet.',
  ],

  role: 'I designed it, built it, shipped it, and I am the only person who maintains it. Roadmap, App Store review, crash triage, support email.',

  /** Native depth. The part a web developer could not have built. */
  nativeDepth: [
    { name: 'watchOS app', detail: 'Logs sets at the rack. Runs standalone when the phone is in a locker.' },
    { name: 'Live Activities', detail: 'Rest timer on the Lock Screen and in the Dynamic Island.' },
    { name: 'Widgets', detail: 'Next session on the Home Screen; interactive buttons to start it.' },
    { name: 'App Intents', detail: 'Siri, Shortcuts and Spotlight all start and log workouts.' },
    { name: 'HealthKit', detail: 'Writes strength-training workouts and reads body mass.' },
    { name: 'Core ML', detail: 'Progression model runs on device. No account, no network needed.' },
  ],

  architecture: {
    caption:
      'Four processes read the same workout. Everything above the store is a surface; everything below it is state.',
    tiers: [
      {
        label: 'Surfaces',
        note: 'Four processes, four memory budgets',
        nodes: ['iPhone app (SwiftUI)', 'Watch app', 'Widgets', 'Live Activity'],
      },
      {
        label: 'Commands',
        note: 'One entry point for every surface',
        nodes: ['App Intents', 'Siri / Shortcuts / Spotlight'],
      },
      {
        label: 'Domain',
        note: 'No UIKit, no SwiftUI — importable by every target',
        nodes: ['Session reducer', 'Progression engine', 'Core ML recommender'],
      },
      {
        label: 'State',
        note: 'Shared App Group container',
        nodes: ['SwiftData store', 'CloudKit sync'],
      },
      {
        label: 'Integrations',
        note: 'Optional — denial degrades, never blocks',
        nodes: ['HealthKit'],
      },
    ] as const satisfies readonly ArchTier[],
  },

  decisions: [
    {
      id: 'timer',
      title: 'The rest timer does not tick from the app',
      choice:
        'The Live Activity renders its countdown with a system timer interval, so the Lock Screen stays accurate with zero updates from me. I spend the update budget only on state changes — set finished, rest started, session ended.',
      tradeoff:
        'I gave up control of the countdown formatting and cannot easily show anything but elapsed or remaining time. In exchange the timer never drifts, never goes stale, and never gets throttled out mid-set.',
    },
    {
      id: 'intents',
      title: 'App Intents are the only command surface',
      choice:
        'Siri, Shortcuts, Spotlight and the widget buttons all call the same intent types. Nothing goes through a URL scheme, and no surface talks to a view model.',
      tradeoff:
        'Intents run in an extension process with no UI and a hard memory ceiling, which forced every piece of workout logic out of the views and into a plain Swift module. That refactor cost about a week. It is also the only reason the watch app was three days of work instead of a rewrite.',
    },
    {
      id: 'coreml',
      title: 'The progression model runs on device',
      choice:
        'Set recommendations come from a Core ML model bundled with the app rather than an API call. There is no account and no server.',
      tradeoff:
        'Model updates ship on the App Store release cycle instead of instantly, and the binary carries the weights. The payoff is that the app works in a gym basement with no signal, has no backend to pay for or page me about, and no training data leaves the phone.',
    },
    {
      id: 'sync',
      title: 'A session is an event log, not a record',
      choice:
        'The watch and the phone both append events — set logged, weight changed, rest skipped — each with its own identifier. A deterministic reducer folds them into session state.',
      tradeoff:
        'More storage and a reducer to maintain versus a simple mutable row. But two devices writing at once converge on the same session no matter which order the writes land in, and I can replay a log to reproduce a support ticket exactly.',
    },
  ] as const satisfies readonly TechDecision[],

  hardestProblem: {
    title: 'The hardest problem',
    body: [
      'Keeping one workout consistent across four processes. Early on, the watch and the phone could both advance the set counter while the phone was suspended, and the session came back with two "set 3"s in it. It reproduced maybe one session in thirty, which made it miserable to chase.',
      'The fix was the event log above. What made it hard was not the merge logic — it was accepting that the mutable session object had to go, three months after everything was built on top of it.',
    ],
  },

  refactor: {
    title: 'What I would refactor',
    body: [
      'Feature extraction for the Core ML model exists in two places — once in the app target and once on the watch. They drifted for one release and produced different recommendations on the same data. It works now because I fixed both, not because the design stops it happening again. It belongs in the shared domain module with the rest of the logic.',
    ],
  },

  media: {
    // Drop the real files at these paths — no code change needed.
    // Frames reserve their exact aspect ratio, so adding them cannot shift layout.
    screenshots: [
      { src: '/media/workout-buddy-1.png', alt: 'Workout Buddy — today’s session with recommended weight and reps', label: 'Session' },
      { src: '/media/workout-buddy-2.png', alt: 'Workout Buddy — set logging with the rest timer running', label: 'Logging' },
      { src: '/media/workout-buddy-3.png', alt: 'Workout Buddy — progression chart for a single lift over time', label: 'Progression' },
      { src: '/media/workout-buddy-4.png', alt: 'Workout Buddy — Apple Watch set logging screen', label: 'Watch' },
    ],
    demo: {
      src: '/media/workout-buddy-demo.mp4',
      poster: '/media/workout-buddy-demo-poster.jpg',
      caption: 'Starting a session, logging a set, and the rest timer on the Lock Screen.',
    },
  },
} as const;

export const secondProject = {
  name: 'Coach–client training platform',
  kind: 'Web · Postgres',

  // TODO(owner): set the repo or live URL, or leave blank to hide the link.
  repoUrl: '',
  liveUrl: '',

  what: 'A coach writes a programme once and assigns it to a roster; each client sees only their own block, logs against it, and the coach watches the numbers come back. Where Workout Buddy is one person and one device, this is many people looking at overlapping slices of the same data.',

  notes: [
    {
      title: 'Access control lives in the database',
      body: 'Row-level security policies in Postgres decide who can read a set, not the API layer. A missed check in application code is a leak; a missed check here is a query that returns nothing.',
    },
    {
      title: 'Roles are relationships, not flags',
      body: 'A user is not "a coach" — they are a coach of a specific roster. Modelling it as an edge rather than a boolean is what makes a coach with two gyms, or a lifter who also coaches, work without special cases.',
    },
    {
      title: 'The programme is versioned',
      body: 'Editing a live block cannot silently rewrite what a client already did. Assignments point at a version, so history stays true to what was actually prescribed that week.',
    },
  ],
} as const;

export const clientWork = [
  {
    name: 'PC Pro Inspections',
    url: 'https://pcproinspections.com',
    lines: [
      'Marketing site for a residential home inspection business in Southern Illinois.',
      'Instant quote calculator, lead capture with no backend, local SEO and JSON-LD.',
      'Static React build; the owner edits business details in one config file.',
    ],
  },
  {
    name: 'Church site',
    // TODO(owner): paste the live URL. Blank renders the name without a link.
    url: '',
    lines: [
      'Service times, events and giving for a local congregation.',
      'Built for volunteers to update without touching code.',
      'Delivered against someone else’s requirements, on their timeline.',
    ],
  },
] as const;
