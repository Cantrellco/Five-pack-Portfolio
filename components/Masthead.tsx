import { profile } from '@/content/profile';
import { flagship } from '@/content/projects';
import { NAV } from '@/content/nav';

export function Masthead() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="shell flex h-14 items-center justify-between gap-4">
        <a href="#main" className="label !text-ink whitespace-nowrap">
          {profile.name}
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="link-block text-sm">
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href={flagship.appStoreUrl}
          className="link-block whitespace-nowrap text-sm"
          rel="noopener"
        >
          App Store
        </a>
      </div>
    </header>
  );
}
