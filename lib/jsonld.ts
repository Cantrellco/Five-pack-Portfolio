import { profile } from '@/content/profile';
import { flagship } from '@/content/projects';

/**
 * Person schema. Keep it factual — every claim here is also stated in the
 * page's visible text, which is the only thing that makes structured data
 * worth shipping.
 */
export function personJsonLd() {
  // `sameAs` is exactly "other official profiles of this same person", so a
  // real Instagram account belongs in it alongside GitHub. Still filtered:
  // the empty ones are placeholders, and a blank string here would publish a
  // link to nowhere as a claimed identity.
  const sameAs = [profile.github, profile.linkedin, profile.instagram].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${profile.siteUrl}/#person`,
    name: profile.name,
    url: profile.siteUrl,
    email: `mailto:${profile.email}`,
    jobTitle: 'Full-Stack Engineer & AI Developer',
    description: profile.summary,
    knowsAbout: [
      'Swift',
      'SwiftUI',
      'iOS',
      'watchOS',
      'React Native',
      'Postgres',
      'Applied AI',
      'HealthKit',
      'App Intents',
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.locality,
      addressRegion: profile.region,
      addressCountry: profile.country,
    },
    ...(sameAs.length ? { sameAs } : {}),
    workExample: {
      '@type': 'SoftwareApplication',
      name: flagship.name,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'iOS, watchOS',
      url: flagship.appStoreUrl,
      author: { '@id': `${profile.siteUrl}/#person` },
    },
  };
}
