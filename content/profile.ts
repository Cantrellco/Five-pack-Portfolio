/**
 * Everything about the person. One file — nothing here is duplicated in a
 * component.
 *
 * Fields marked `TODO(owner)` are the only things that still need filling.
 * They are the ONLY placeholders in the codebase; every other string is real.
 */

export const profile = {
  name: 'Cody Cantrell',
  firstName: 'Cody',
  lastName: 'Cantrell',

  /** One line, above the fold. Says what he does, not how he feels about it. */
  roleLine: 'Full-stack engineer and AI developer. I build native apps, backends, and the AI running inside them.',

  /** The stack tag under the role line — same job the tab bar's `kind` field
   *  does for a project: names what this is before anything else does. */
  stackTag: 'Swift · AI integration · React Native · Postgres',

  /** Contact panel's headline — the specific ask, not a restatement of
   *  `roleLine`. Kept as its own field because it is the one line on the site
   *  that goes stale on its own schedule: it has to be hand-edited the moment
   *  it stops being true, independent of the rest of the profile. */
  contactHeadline: 'Open to full-stack and AI engineering roles',

  /** Sits under the email. True because Workout Buddy's own credit line
   *  already says so — "I am the only person who maintains it... support
   *  email" — this is that same fact, stated where someone deciding whether
   *  to write can actually see it. */
  contactNote: 'No inbox filter and no assistant between us — I read every message myself.',

  /** Longer version for meta description and JSON-LD. */
  // No Core ML: nothing shipped uses it, and this string is the meta
  // description and the JSON-LD, which is the last place to overstate a stack.
  summary:
    'Self-taught full-stack engineer and AI developer in Southern Illinois. I design, build, ship, and maintain products end to end — native iOS and watchOS, React Native, Postgres, and the AI systems running inside them.',

  /** The About panel's opening heading and its two paragraphs, in order. */
  aboutHeading: 'Self-taught — and I stand behind it',
  aboutBio: [
    "I'm self-taught, and everything I've shipped came from wanting to build it myself first. Workout Buddy — an iOS and watchOS app with an AI coach that reads your training history and rewrites your program to fit — pulled me through React Native, native Swift and a Postgres backend on Supabase. The Harvest is a Bible app built on nothing but Apple's own frameworks. And in between, four sites for local businesses here in Southern Illinois: a coffee shop, a home inspector, a church, a play place for kids — each one shipped, each one still live.",
    "Outside of it: Jesus first, then my wife Gracie and our son Shepherd — most of what isn't spent building software is spent with them. I work out most days and stay active, which is half the reason Workout Buddy exists in the first place. Disney World is the one trip we never get tired of taking.",
  ],

  location: 'Southern Illinois',
  locality: 'Fairfield',
  region: 'IL',
  country: 'US',

  email: 'cantrellco.13@gmail.com',
  github: 'https://github.com/Cantrellco',
  githubUser: 'Cantrellco',

  // TODO(owner): paste the real LinkedIn URL. Falsy = the link is not rendered.
  linkedin: '',

  // TODO(owner): drop the PDF at public/cody-cantrell-resume.pdf.
  // Falsy = the link is not rendered.
  resume: '',

  // TODO(owner): set the production domain before launch. Drives the canonical
  // URL, the sitemap, Open Graph URLs and the JSON-LD @id.
  siteUrl: 'https://codycantrell.dev',

  /**
   * The portrait pinned in the identity column.
   *
   * Falsy = the column renders type and the ink field alone, which is a
   * complete layout rather than a broken one — so an unfinished or missing
   * image never leaves a hole in the page.
   *
   * Whatever goes here has to survive the performance budget: it sits above
   * the fold, so it is a candidate for LCP. Keep it around 900px on the long
   * edge; next/image serves AVIF and WebP from it.
   */
  portrait: {
    /* Head, neck and shoulders, cut straight out of the original engraving
       rather than drawn again from it. That distinction is the whole point:
       every regenerated version drifted a little further off the likeness, so
       this one keeps the original's own pixels and only removes what was
       around them. The decoration that used to be baked in lives in
       `public/media/objects/` now, as separate vectors the page can move.

       The full bust, not a head crop: cropped to the head it read as a
       photograph someone had cut down, and the shoulders are what make it a
       portrait instead. The engraving's own hatching fades out at the bottom
       edge, so standing it on the floor of the pane leaves no hard line. */
    src: '/media/cody-figure.webp',
    /**
     * Names the person and says it is drawn. Both matter: the likeness is the
     * content, and someone who cannot see it should not be left thinking the
     * page is showing a photograph when it is showing an engraving.
     */
    alt: 'Cody Cantrell, in an engraved portrait',
    /* Intrinsic size of the file. Reserving this exact ratio is what keeps the
       image out of the CLS budget — the box is correct before any bytes land.
       Trimmed tight to the figure, so the room the solids and the wordmark
       need is made by the CSS box in globals.css, not by transparent margin
       baked into the asset. */
    width: 1000,
    height: 1450,
  },
} as const;

export type Profile = typeof profile;
