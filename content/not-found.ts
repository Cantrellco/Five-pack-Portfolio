/**
 * The 404 page's copy. One line, a code, and the way back — a wrong address
 * deserves an answer, not a production.
 *
 * The line states the fact and stops. No mascot, no pun on "lost": the site's
 * voice is dry everywhere else, and a page most visitors reach by typo is the
 * last place to start performing.
 */
import { profile } from '@/content/profile';

export const notFoundCopy = {
  /** Browser tab title. The layout sets no title template, so this is the
   *  whole string, and it carries the name the way every other title does. */
  title: `Page not found — ${profile.name}`,

  /** The status code, set in the mono data voice — it is a number the
   *  browser already knows, not a headline to dramatise. */
  code: '404',

  /** The one line. It is the page's h1. */
  line: 'Nothing lives at this address.',

  /** The single link out. "Front page" rather than any internal vocabulary —
   *  whoever landed here has not read the site yet. */
  backLabel: 'Back to the front page',
} as const;
