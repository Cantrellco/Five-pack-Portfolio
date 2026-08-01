'use client';

import { useRef } from 'react';
import { NAV } from '@/content/nav';
import { useDeck } from './DeckContext';

/**
 * The section index, in its two forms.
 *
 * Unenhanced it is a list of anchors inside a labelled <nav> — the same markup
 * this masthead has always shipped, and the only form that exists with
 * scripting off. Enhanced it becomes a tablist: buttons, roving tabindex,
 * arrow-key movement, `aria-selected` carrying the state that colour alone
 * must never carry.
 *
 * The swap happens on a normal re-render after mount, not during hydration,
 * so React is comparing two client renders and no markup mismatch is possible.
 */
export function TabBar({ className }: { className?: string }) {
  const { enhanced, active, show } = useDeck();
  const listRef = useRef<HTMLDivElement | null>(null);

  if (!enhanced) {
    return (
      <nav aria-label="Sections" className={className}>
        {NAV.map((item) => (
          <a key={item.panel} href={item.href} className="link-block text-sm">
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  // Left/Right move between tabs, Home/End jump to the ends. Standard tablist
  // keyboard behaviour: the arrow keys move focus AND selection, so a keyboard
  // user is never focused on a tab whose panel is not the one being shown.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const current = NAV.findIndex((n) => n.panel === active);
    const last = NAV.length - 1;
    const next =
      event.key === 'ArrowLeft'
        ? current <= 0
          ? last
          : current - 1
        : event.key === 'ArrowRight'
          ? current >= last
            ? 0
            : current + 1
          : event.key === 'Home'
            ? 0
            : last;

    const target = NAV[next];
    if (!target) return;

    show(target.panel);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Sections"
      className={className}
      onKeyDown={onKeyDown}
    >
      {NAV.map((item) => {
        const selected = item.panel === active;
        return (
          <button
            key={item.panel}
            type="button"
            role="tab"
            id={`tab-${item.panel}`}
            aria-selected={selected}
            aria-controls={item.panel}
            tabIndex={selected ? 0 : -1}
            className="tab"
            onClick={() => show(item.panel)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
