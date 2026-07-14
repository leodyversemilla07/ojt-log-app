import { afterEach, describe, expect, it } from 'vitest';
import { clearDraft, loadDraft } from '@/hooks/use-draft-autosave';

describe('draft storage helpers', () => {
  const id = 'unit-test-draft';
  const sample = {
    date: '2026-07-01',
    weekNumber: 1,
    dayNumber: 1,
    timeIn: '09:00',
    timeOut: '17:00',
    tasksAccomplished: 'Built feature\nWrote tests',
    keyLearnings: 'Learned about hooks',
    challenges: '',
    goalsForTomorrow: '',
  };

  afterEach(() => {
    clearDraft(id);
  });

  it('returns null when no draft exists', () => {
    expect(loadDraft(id)).toBeNull();
  });

  it('round-trips a drafted payload through localStorage', () => {
    localStorage.setItem(
      `ojt_log_draft_${id}`,
      JSON.stringify({ savedAt: Date.now(), values: sample }),
    );
    expect(loadDraft(id)).toEqual(sample);
  });

  it('clearDraft removes the key', () => {
    localStorage.setItem(
      `ojt_log_draft_${id}`,
      JSON.stringify({ savedAt: Date.now(), values: sample }),
    );
    clearDraft(id);
    expect(loadDraft(id)).toBeNull();
  });

  it('returns null when the stored payload is malformed', () => {
    localStorage.setItem(`ojt_log_draft_${id}`, 'not-json{');
    expect(loadDraft(id)).toBeNull();
  });
});
