import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build-time check for a file under public/.
 *
 * Screenshots and the demo clip are not in the repo yet. Rather than gate them
 * behind a config flag someone has to remember to flip, the server components
 * ask the filesystem: drop `public/media/workout-buddy-1.png` in and it renders
 * on the next build with no code change. Until then the frame renders its
 * reserved box, so adding the real asset cannot shift layout.
 */
export function publicFileExists(path: string): boolean {
  return existsSync(join(process.cwd(), 'public', path.replace(/^\//, '')));
}
