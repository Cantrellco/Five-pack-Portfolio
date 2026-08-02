'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { NAV, type NavItem } from '@/content/nav';
import { useDeck } from './deck/DeckContext';

/**
 * Cmd+K / Ctrl+K jump-to-section, built on a native `<dialog>` for the same
 * reason `WorkProject`'s case studies are: `showModal()` supplies the focus
 * trap, the top-layer stacking, Escape-to-close and the focus-restore on
 * close, all per spec — nothing here reimplements platform behaviour the
 * element already owns. Enhancement-only: with scripting off there is no
 * keyboard event to listen for and the deck is already the full scrolling
 * document, so this renders nothing rather than shipping a dialog no path
 * can ever open.
 */
function isOpenShortcut(event: KeyboardEvent<Document> | globalThis.KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

export function CommandPalette() {
  const { enhanced, show } = useDeck();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<readonly NavItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!enhanced) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isOpenShortcut(event)) return;
      // Chromium and Firefox both bind Ctrl/Cmd+K to their own address-bar
      // search; without this the shortcut opens the palette AND that.
      event.preventDefault();
      dialogRef.current?.showModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enhanced]);

  if (!enhanced) return null;

  const choose = (panel: string) => {
    show(panel);
    dialogRef.current?.close();
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const move = (next: number) => {
    if (items.length === 0) return;
    const clamped = ((next % items.length) + items.length) % items.length;
    setActiveIndex(clamped);
    dialogRef.current
      ?.querySelector(`#command-option-${items[clamped]!.panel}`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) choose(item.panel);
    }
  };

  // The one dismissal `showModal()` does not give for free: a click that
  // lands on the backdrop rather than the dialog's own box. Same distance
  // check `WorkProject` uses, for the same reason — a backdrop click still
  // reports the dialog itself as the event target.
  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    const dialog = event.currentTarget;
    const r = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    if (!inside) dialog.close();
  };

  const onClose = () => {
    setQuery('');
    setActiveIndex(0);
  };

  const activeItem = items[activeIndex];

  return (
    <dialog
      ref={dialogRef}
      className="command-palette"
      aria-label="Jump to section"
      onClose={onClose}
      onClick={onBackdropClick}
      onKeyDown={onKeyDown}
      // Same escape hatch `WorkProject` uses: Lenis's non-passive wheel
      // listener sits on a real DOM ancestor a top-layer dialog's paint
      // order does not remove it from, and would otherwise scroll the page
      // behind this instead of the list inside it.
      data-lenis-prevent=""
    >
      <div className="command-palette-body">
        <input
          type="text"
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-listbox"
          aria-activedescendant={activeItem ? `command-option-${activeItem.panel}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Jump to a section"
          className="command-palette-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <ul id="command-palette-listbox" role="listbox" aria-label="Sections" className="command-palette-list">
          {items.map((item, index) => (
            <li
              key={item.panel}
              id={`command-option-${item.panel}`}
              role="option"
              aria-selected={index === activeIndex}
              className="command-palette-item"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item.panel)}
            >
              {item.label}
            </li>
          ))}
          {items.length === 0 && (
            <li className="command-palette-empty" role="presentation">
              No matching section
            </li>
          )}
        </ul>
        <div className="command-palette-hint mono" aria-hidden="true">
          <span>&uarr;&darr; navigate</span>
          <span>&crarr; select</span>
          <span>esc close</span>
        </div>
      </div>
    </dialog>
  );
}
