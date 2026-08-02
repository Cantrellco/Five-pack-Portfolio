'use client';

import { useEffect } from 'react';
import { triggerFieldMorph } from '@/lib/field-state';

/**
 * The Konami code, watched for and nothing else. Renders no DOM — this is a
 * listener with a component's lifecycle, not a piece of UI, the same reason
 * `MotionProvider` renders nothing either.
 *
 * `event.key` for the arrows (unambiguous, no layout to worry about) and
 * `event.code` for B/A (layout-independent, so the physical key in the
 * sequence's position is what matters, not what letter a non-QWERTY layout
 * puts there).
 */
const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

function stepOf(event: KeyboardEvent): string {
  return event.key.startsWith('Arrow') ? event.key : event.code;
}

/** True for anything the sequence must not intercept from — typing in the
 *  command palette's filter, or any other text field, should stay typing. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function FieldMorphTrigger() {
  useEffect(() => {
    let progress = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;

      const step = stepOf(event);
      if (step === SEQUENCE[progress]) {
        progress += 1;
        if (progress === SEQUENCE.length) {
          progress = 0;
          triggerFieldMorph();
        }
      } else {
        // Restart cleanly on a sequence that begins again from the top
        // (ArrowUp after a wrong key partway through) rather than dropping
        // straight to zero and losing that keystroke.
        progress = step === SEQUENCE[0] ? 1 : 0;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
