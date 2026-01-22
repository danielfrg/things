import { useEffect } from 'react';

export function useHotkey(
  key: string,
  callback: () => void,
  options?: { meta?: boolean; ctrl?: boolean; shift?: boolean },
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger hotkeys while typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger if a modal/dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // For modifiers: undefined = don't care, true = required, false = must not be pressed
      const metaMatch =
        options?.meta === undefined ? true : options.meta === e.metaKey;
      const ctrlMatch =
        options?.ctrl === undefined ? true : options.ctrl === e.ctrlKey;
      const shiftMatch =
        options?.shift === undefined ? true : options.shift === e.shiftKey;

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        metaMatch &&
        ctrlMatch &&
        shiftMatch
      ) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, options?.meta, options?.ctrl, options?.shift]);
}
