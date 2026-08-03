import type { CSSProperties, SVGProps } from 'react';
import { ScrambleText } from '@/components/ScrambleText';
import { skills, type Skill } from '@/content/skills';

/**
 * One mark per skill, drawn rather than imported. A logo library brings
 * either full-colour brand marks — which the six-token palette has no room
 * for — or a build dependency this site otherwise has none of. Every glyph
 * here is instead a single-weight line abstraction of the thing it names, in
 * `currentColor`, the same treatment `objects/*.svg` gets elsewhere on the
 * page. None of them claims to be the trademark; the name printed under every
 * orb is what actually identifies it.
 */
function SkillGlyph({ id }: { id: Skill['id'] }) {
  const common: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (id) {
    case 'swift':
      return (
        <svg {...common}>
          <path d="M4 14.5c3.6 2.8 9.5 3.6 13-.8" />
          <path d="M6.5 8.5c2.2 3 6.8 6 11 5" />
        </svg>
      );
    case 'swiftui':
      return (
        <svg {...common}>
          <path d="M12 4a8 8 0 0 1 6 13.3" />
          <path d="M12 8a4 4 0 0 1 3.2 6.4" />
          <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'watchos':
      return (
        <svg {...common}>
          <rect x="7" y="6" width="10" height="12" rx="3" />
          <path d="M17 10.5h1.6v3H17" />
        </svg>
      );
    case 'healthkit':
      return (
        <svg {...common}>
          <path d="M12 19s-7-4.4-7-9.6A4 4 0 0 1 12 7a4 4 0 0 1 7 2.4C19 14.6 12 19 12 19Z" />
        </svg>
      );
    case 'widgetkit':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="6" height="6" rx="1.2" />
          <rect x="13" y="5" width="6" height="6" rx="1.2" />
          <rect x="5" y="13" width="6" height="6" rx="1.2" />
          <rect x="13" y="13" width="6" height="6" rx="1.2" />
        </svg>
      );
    case 'cloudkit':
      return (
        <svg {...common}>
          <path d="M7 17h10a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8 8.6 3.5 3.5 0 0 0 7 17Z" />
        </svg>
      );
    case 'react-native':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(120 12 12)" />
        </svg>
      );
    case 'typescript':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <text
            x="12"
            y="15.6"
            textAnchor="middle"
            fontSize="8"
            fill="currentColor"
            stroke="none"
            style={{ fontFamily: 'var(--ff-mono)', fontWeight: 600 }}
          >
            TS
          </text>
        </svg>
      );
    case 'nextjs':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9 16V8h1.6l4.4 8V8" />
        </svg>
      );
    case 'postgres':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="7" rx="6" ry="2.4" />
          <path d="M6 7v10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V7" />
          <path d="M6 12c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4" />
        </svg>
      );
    case 'supabase':
      return (
        <svg {...common}>
          <path d="M13 3 6 13h5l-1 8 7-11h-5l1-7Z" />
        </svg>
      );
    case 'tailwind':
      return (
        <svg {...common}>
          <path d="M5 9c1.5-2 3.5-2 5 0s3.5 2 5 0" />
          <path d="M5 15c1.5-2 3.5-2 5 0s3.5 2 5 0" />
        </svg>
      );
    case 'git':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="1.8" />
          <circle cx="6" cy="18" r="1.8" />
          <circle cx="17" cy="12" r="1.8" />
          <path d="M6 7.8v8.4" />
          <path d="M6 9c0 3 3 3 8.5 3" />
        </svg>
      );
    case 'gsap':
      return (
        <svg {...common}>
          <path d="M12 12c0-1.5 1.2-2.5 2.5-2 1.6.6 1.9 2.8.5 4-1.8 1.5-4.6 1-5.7-1-1.3-2.4.2-5.6 3-6.7 3.3-1.3 7 .6 8.2 4" />
        </svg>
      );
    case 'webgl':
      return (
        <svg {...common}>
          <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3Z" />
          <path d="M12 9l3.5 6h-7L12 9Z" />
        </svg>
      );
    case 'accessibility':
      return (
        <svg {...common}>
          <circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none" />
          <path d="M7 9h10" />
          <path d="M12 9v5" />
          <path d="M12 14l-3.5 5" />
          <path d="M12 14l3.5 5" />
        </svg>
      );
    default:
      return null;
  }
}

function SkillOrb({ skill, index }: { skill: Skill; index: number }) {
  return (
    <li className="skill-orb" style={{ '--i': index } as CSSProperties}>
      <span className="skill-orb-circle">
        <SkillGlyph id={skill.id} />
      </span>
      <span className="skill-orb-name">{skill.name}</span>
    </li>
  );
}

/**
 * The stack, as a wave: two identical copies of the same sixteen orbs, laid
 * side by side and scrolled left by exactly half the track's width, on a
 * loop — so the join between the second copy ending and the first repeating
 * is invisible. Each orb also bobs on its own clock, staggered by a negative
 * delay per index, at the same large, continuous amplitude the vertical-only
 * version settled on — so what's moving sideways is also visibly waving,
 * rather than a flat conveyor belt of orbs that happen to jitter.
 *
 * The scrolling copy is `aria-hidden`: it exists to loop cleanly, not to be
 * read. The first `<ul>` is the real one — sixteen names, once, in order —
 * so a screen reader hears this exactly like any other list on the page,
 * untroubled by the second copy or by the fact that it never stops moving.
 */
export function Skills() {
  return (
    <div className="skills mt-[var(--sp-md)] border-t border-rule pt-[var(--sp-sm)]">
      <p className="label kicker">
        <ScrambleText text="Skills" />
      </p>

      <div className="skills-track-viewport">
        <div className="skills-track">
          <ul className="skills-set" aria-label={`${skills.length} skills`}>
            {skills.map((skill, i) => (
              <SkillOrb key={skill.id} skill={skill} index={i} />
            ))}
          </ul>
          <ul className="skills-set" aria-hidden="true">
            {skills.map((skill, i) => (
              <SkillOrb key={`${skill.id}-loop`} skill={skill} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
