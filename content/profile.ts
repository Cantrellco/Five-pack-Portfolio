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
  roleLine: 'Full-stack engineer and AI developer.',

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

  /** Sits under the GitHub Activity figures. Those come from the public API
   *  only, and Workout Buddy's repo is private (`flagship.repoUrl` is
   *  deliberately blank), so the language share counts none of the largest
   *  thing on this site. Saying so converts a number that undersells the
   *  native work into one a reader can place — the same rule the field copy
   *  follows: a figure never gets to imply something the data does not
   *  support. Here rather than inline in `Contact.tsx` because all copy lives
   *  in `content/`, and this line is now read on the phone as well as the
   *  desktop, so it has one source or it drifts. */
  activityNote:
    'Public repositories only — Workout Buddy’s source is private, so none of its Swift is counted here.',

  /** Longer version for meta description and JSON-LD. */
  // No Core ML: nothing shipped uses it, and this string is the meta
  // description and the JSON-LD, which is the last place to overstate a stack.
  summary:
    'Self-taught full-stack engineer and AI developer in Southern Illinois. I design, build, ship, and maintain products end to end — native iOS and watchOS, React Native, Postgres, and the AI systems running inside them.',

  /** The About panel's bio, in order — shared verbatim between the phone and
   *  desktop layouts. No heading above it: the panel's own "About" kicker is
   *  the heading, and a second one over the prose only restated what the
   *  first paragraph already says in the reader's voice.
   *
   *  The phone screen used to carry its own two-paragraph trim, held to a
   *  hard height budget so `#about .section` never scrolled. It now renders
   *  this same array and scrolls like every other panel below `lg` — see the
   *  "two viewport-fit screens" note in globals.css. */
  aboutBio: [
    "I'm Cody Cantrell, a self-taught software developer with a passion for creating software that feels as good as it functions.",
    "I enjoy building apps and websites that are intuitive, visually polished, and thoughtfully crafted. Whether I'm developing an iOS app, designing a website for a local business, or learning a new technology, I'm always looking for ways to create experiences that feel effortless to use. I believe great software is more than just functional—it should be fast, refined, and something people genuinely enjoy coming back to.",
    "I care about the details. Smooth interactions, clean interfaces, thoughtful design, and solid engineering are the things that turn a good product into a great one, and they're the standards I try to bring to every project.",
    "Outside of development, my faith in Jesus, my wife Gracie, and our son Shepherd are at the center of my life. They shape both how I work and why I build. When I'm away from the keyboard, you'll usually find me staying active or planning another trip to Disney World with my family.",
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

  instagram: 'https://instagram.com/codycantrell.13',
  instagramUser: 'codycantrell.13',

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
