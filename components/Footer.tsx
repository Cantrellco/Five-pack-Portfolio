import { profile } from '@/content/profile';
import { NAV } from '@/content/nav';

export function Footer() {
  return (
    <footer className="section rule-top !pb-[var(--sp-lg)] !pt-[var(--sp-xl)]">
      <div className="shell">
        {/* The masthead drops its section links below `lg`, so the full index
            lives here where it is reachable at every width without a menu. */}
        <nav aria-label="Sections" className="mb-[var(--sp-xl)] border-b border-rule pb-[var(--sp-md)]">
          <ul className="flex flex-wrap gap-x-[var(--sp-md)] gap-y-[var(--sp-2xs)]">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="link-block text-sm">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid-editorial">
          <p className="label col-aside">Colophon</p>

          <div className="col-main">
            <p className="mono max-w-[58ch] leading-[1.8] text-graphite">
              Next.js, TypeScript, and a canvas written straight against WebGL — no 3D library. Newsreader
              and Instrument Sans, self-hosted and subset to the glyphs this page uses. No analytics, no
              cookies, no third-party requests.
            </p>
            <p className="mono mt-[var(--sp-md)] text-graphite">
              © {new Date().getFullYear()} {profile.name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
