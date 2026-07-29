/**
 * The site's one easing curve, as a function.
 *
 * CSS gets it as `--motion-ease: cubic-bezier(0.22, 0.61, 0.24, 1)`; GSAP gets
 * it from here. Same four control points, same maths, so a hover transition and
 * a scroll reveal decelerate identically. Slightly overdamped — nothing bounces.
 */

const CX = 0.22;
const CY = 0.61;
const DX = 0.24;
const DY = 1;

const bezier = (t: number, a: number, b: number) => {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
};

/** Newton–Raphson for x, then evaluate y. Eight iterations is far past the
 *  precision a 60fps frame can express. */
export function ease(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const err = bezier(t, CX, DX) - x;
    if (Math.abs(err) < 1e-5) break;
    const u = 1 - t;
    const d = 3 * u * u * CX + 6 * u * t * (DX - CX) + 3 * t * t * (1 - DX);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }

  return bezier(t, CY, DY);
}
