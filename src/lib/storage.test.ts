import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

import {
  getLogs,
  importLegacyLocalLogs,
  saveLog,
} from './storage';

const sampleRow = {
  id: 'log-1',
  user_id: 'user-1',
  date: '2026-02-21',
  week_number: 2,
  day_number: 3,
  time_in: '08:00:00',
  time_out: '17:00:00',
  total_hours: 8,
  tasks_accomplished: ['Task A'],
  key_learnings: ['Learning A'],
  challenges: 'Challenge',
  goals_for_tomorrow: 'Goal',
  created_at: '2026-02-21T00:00:00Z',
  updated_at: '2026-02-21T00:00:00Z',
};

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns empty logs when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getLogs(0);

    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('maps Supabase rows to app logs', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const range = vi.fn().mockResolvedValue({ data: [sampleRow], error: null, count: 1 });
    const order = vi.fn().mockReturnValue({ range });
    const eq = vi.fn().mockResolvedValue({ count: 1 });
    const head = vi.fn().mockResolvedValue({ count: 1 });
    const select = vi.fn().mockReturnValue({ order, eq, head });
    mocks.from.mockReturnValue({ select });

    const result = await getLogs(0);

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]).toMatchObject({
      id: 'log-1',
      weekNumber: 2,
      dayNumber: 3,
      timeIn: '08:00',
      timeOut: '17:00',
      totalHours: 8,
    });
  });

  it('throws on save when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      saveLog({
        date: '2026-02-21',
        weekNumber: 1,
        dayNumber: 1,
        timeIn: '08:00',
        timeOut: '17:00',
        tasksAccomplished: ['Task'],
        keyLearnings: ['Learning'],
        challenges: '',
        goalsForTomorrow: '',
      })
    ).rejects.toThrow('User is not authenticated.');
  });

  it('imports legacy local logs and clears localStorage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    localStorage.setItem(
      'ojt_logs_data',
      JSON.stringify([
        {
          id: 'legacy-1',
          date: '2026-02-21',
          weekNumber: 1,
          dayNumber: 1,
          timeIn: '08:00',
          timeOut: '17:00',
          totalHours: 8,
          tasksAccomplished: ['Legacy Task'],
          keyLearnings: ['Legacy Learning'],
          challenges: '',
          goalsForTomorrow: '',
        },
      ])
    );

    const result = await importLegacyLocalLogs();

    expect(result).toEqual({ imported: 1 });
    expect(localStorage.getItem('ojt_logs_data')).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
