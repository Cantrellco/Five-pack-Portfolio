import { fieldStats } from '@/lib/generated/field-stats';

const n = (v: number) => v.toLocaleString('en-US');

/**
 * Copy that makes a claim about the training data.
 *
 * While `data/training.json` is the generated placeholder, the site describes
 * the field in structural terms only. The moment the real export replaces it,
 * `placeholder` flips false at build time and the specific, first-person
 * version appears — no copy edit, and nothing untrue ever ships.
 */
export const fieldCopy = fieldStats.placeholder
  ? {
      heroCaption:
        'The drawing behind this page is a training log — one point per logged rep, precomputed at build time.',
      resolveLede:
        'Scroll the field far enough and it stops being texture. Every point is one rep from a training log; the curve is the estimated one-rep max, week by week, per lift.',
      figure: `${n(fieldStats.points)} points`,
      figureNote: 'one per logged rep',
    }
  : {
      heroCaption: `The drawing behind this page is ${n(fieldStats.sets)} sets I logged over ${fieldStats.months} months. One point per rep, precomputed at build time.`,
      resolveLede: `Scroll the field far enough and it stops being texture. Every point is one rep I logged between ${fieldStats.from.slice(0, 4)} and ${fieldStats.to.slice(0, 4)}; the curve is my estimated one-rep max, week by week, per lift.`,
      figure: `${n(fieldStats.points)} points`,
      figureNote: `one per rep, ${n(fieldStats.sets)} sets, ${fieldStats.months} months`,
    };
