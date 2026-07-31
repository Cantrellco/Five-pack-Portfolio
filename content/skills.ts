/**
 * The stack, as a set of marks rather than a paragraph.
 *
 * Every name here is drawn from `resume.ts`'s `skillGroups` or from the tools
 * `projects.ts` names outright (Postgres, React Native, Supabase, HealthKit),
 * filtered down to the ones a reader would actually recognise as a logo. The
 * practice-shaped entries in `skillGroups` — crash triage, performance
 * budgets, App Store release — have no mark to draw and stay text-only there.
 */

export type Skill = {
  id: string;
  name: string;
};

export const skills: readonly Skill[] = [
  { id: 'swift', name: 'Swift' },
  { id: 'swiftui', name: 'SwiftUI' },
  { id: 'watchos', name: 'watchOS' },
  { id: 'healthkit', name: 'HealthKit' },
  { id: 'widgetkit', name: 'WidgetKit' },
  { id: 'cloudkit', name: 'CloudKit' },
  { id: 'react-native', name: 'React Native' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'nextjs', name: 'Next.js' },
  { id: 'postgres', name: 'PostgreSQL' },
  { id: 'supabase', name: 'Supabase' },
  { id: 'tailwind', name: 'Tailwind CSS' },
  { id: 'git', name: 'Git' },
  { id: 'gsap', name: 'GSAP' },
  { id: 'webgl', name: 'WebGL' },
  { id: 'accessibility', name: 'Accessibility' },
] as const satisfies readonly Skill[];
