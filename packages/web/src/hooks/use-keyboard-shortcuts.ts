import { useEffect } from 'react';

export type KeyboardShortcutHandler = (e: KeyboardEvent) => void;

export type ShortcutMap = {
  /** Cmd/Ctrl + K — focus search */
  modK?: KeyboardShortcutHandler;
  /** Cmd/Ctrl + N — new entry */
  modN?: KeyboardShortcutHandler;
  /** Escape — clear selection or close dialogs */
  escape?: KeyboardShortcutHandler;
};

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    function isMac() {
      return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
    }

    function onKeyDown(e: KeyboardEvent) {
      const modKey = isMac() ? e.metaKey : e.ctrlKey;

      if (modKey && (e.key === 'k' || e.key === 'K') && shortcuts.modK) {
        e.preventDefault();
        shortcuts.modK(e);
        return;
      }

      if (modKey && (e.key === 'n' || e.key === 'N') && shortcuts.modN) {
        e.preventDefault();
        shortcuts.modN(e);
        return;
      }

      if (e.key === 'Escape' && shortcuts.escape) {
        shortcuts.escape(e);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
}
