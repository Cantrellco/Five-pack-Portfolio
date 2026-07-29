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
  roleLine: 'iOS engineer. I ship native apps end to end.',

  /** Longer version for meta description and JSON-LD. */
  summary:
    'Self-taught iOS engineer in Southern Illinois. I design, build, ship and maintain native apps — Swift, SwiftUI, Core ML, HealthKit, watchOS.',

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
} as const;

export type Profile = typeof profile;
