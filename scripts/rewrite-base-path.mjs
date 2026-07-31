// Only runs for the GitHub Pages static export (npm run build:pages), never
// for the real server build. `output: export` + basePath correctly prefixes
// everything Next itself emits (chunks, inlined CSS, next/image URLs), but it
// cannot rewrite plain strings authored by hand: image paths in content/,
// `mask-image`/`@font-face` `url()`s in globals.css/fonts.css baked in by
// `experimental.inlineCss`, and the RSC payload's copy of those same strings.
// This walks the finished `out/` directory and prefixes the three raw asset
// roots the site references (/media/, /fonts/, /field/) wherever they were
// missed, skipping anything already correctly prefixed.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const base = process.env.GITHUB_PAGES === 'true' ? '/Five-pack-Portfolio' : '';
if (!base) process.exit(0);

const TEXT_EXT = new Set(['.html', '.css', '.js', '.txt', '.xml', '.json']);
const ALL_ROOTS = ['/media/', '/fonts/', '/field/'];

// `/fonts/` and `/field/` are already basePath-correct inside compiled .js:
// load.ts and FieldMount.tsx build those URLs from NEXT_PUBLIC_BASE_PATH at
// runtime via a variable, not an adjacent string literal, so the lookbehind
// below can't see that they're already prefixed and would double-prefix them
// (observed live: /Five-pack-Portfolio/Five-pack-Portfolio/field/manifest.json,
// 404). /media/ is never built that way in .js, so it's still safe to catch
// there — only content/projects.ts's raw strings need it.
const JS_ROOTS = ['/media/'];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const ext = extname(entry.name);
    if (!TEXT_EXT.has(ext)) continue;
    const roots = ext === '.js' ? JS_ROOTS : ALL_ROOTS;

    const before = await readFile(path, 'utf8');
    let after = before;
    for (const root of roots) {
      // Negative lookbehind skips occurrences already prefixed with `base`.
      const pattern = new RegExp(`(?<!${base})${root}`, 'g');
      after = after.replaceAll(pattern, `${base}${root}`);
    }
    if (after !== before) await writeFile(path, after, 'utf8');
  }
}

await walk('out');
