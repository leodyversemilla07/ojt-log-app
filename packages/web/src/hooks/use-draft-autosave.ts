import { useEffect, useRef, useState } from 'react';

const DRAFT_KEY_PREFIX = 'ojt_log_draft_';

type DraftValue = {
  date: string;
  weekNumber: number;
  dayNumber: number;
  timeIn: string;
  timeOut: string;
  tasksAccomplished: string;
  keyLearnings: string;
  challenges: string;
  goalsForTomorrow: string;
};

type UseDraftAutosaveOptions<T extends Partial<DraftValue>> = {
  /** Stable identifier; for edit mode include the log id, for new use 'new' */
  draftId: string;
  /** Current form values */
  values: T;
  /** Returns true if values look meaningful enough to save (skip empty defaults) */
  shouldSave?: (values: T) => boolean;
  /** Debounce interval in ms */
  debounceMs?: number;
};

export type UseDraftAutosaveReturn = {
  /** True if a draft was loaded from storage at mount */
  restored: boolean;
  /** Clear the persisted draft and reload to default values */
  discard: () => void;
  /** True if the saved draft differs from defaults (i.e. user has typed something) */
  hasDraft: boolean;
};

/**
 * Auto-save form drafts to localStorage. Restores on mount, persists on debounced change.
 *
 * Generic T is constrained to `Partial<DraftValue>` so callers can pass either the strict
 * FormValues type or a looser watch() result without TS fighting them.
 * The wrapper itself only reflects T in the public API; values are JSON-serialised as-is.
 */
export function useDraftAutosave<T extends Partial<DraftValue>>({
  draftId,
  values,
  shouldSave,
  debounceMs = 600,
}: UseDraftAutosaveOptions<T>): UseDraftAutosaveReturn {
  const key = `${DRAFT_KEY_PREFIX}${draftId}`;
  const [restored, setRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const initialLoadRef = useRef(true);

  // Load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      setHasDraft(true);
      setRestored(true);
    } catch {
      // ignore
    }
  }, [key]);

  // Save on debounced change (skip first run)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    const id = setTimeout(() => {
      try {
        const meaningful = shouldSave ? shouldSave(values) : true;
        if (!meaningful) {
          localStorage.removeItem(key);
          setHasDraft(false);
          return;
        }
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
        setHasDraft(true);
      } catch {
        // ignore quota errors
      }
    }, debounceMs);

    return () => clearTimeout(id);
  }, [key, values, shouldSave, debounceMs]);

  function discard() {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setHasDraft(false);
    setRestored(false);
  }

  return { restored, discard, hasDraft };
}

export function loadDraft<T>(draftId: string): T | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.values as T;
  } catch {
    return null;
  }
}

export function clearDraft(draftId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
  } catch {
    // ignore
  }
}

export type { DraftValue };
