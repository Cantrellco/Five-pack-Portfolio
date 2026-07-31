import { publicFiles } from '@/lib/generated/static-assets';

/**
 * Build-time check for a file under public/.
 *
 * Screenshots and the demo clip are not in the repo yet. Rather than gate them
 * behind a config flag someone has to remember to flip, the server components
 * check a manifest built from the filesystem: drop `public/media/workout-buddy-1.png`
 * in and it renders on the next build with no code change. Until then the frame
 * renders its reserved box, so adding the real asset cannot shift layout.
 *
 * Checks a build-time manifest rather than calling `existsSync` directly
 * because this runs again on every ISR revalidation, which on Cloudflare
 * Workers executes with no filesystem at all.
 */
export function publicFileExists(path: string): boolean {
  return publicFiles.has(path.startsWith('/') ? path : `/${path}`);
}
