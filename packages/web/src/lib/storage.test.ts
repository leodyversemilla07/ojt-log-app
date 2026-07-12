import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn(),
  getTotalHours: vi.fn(),
  createLog: vi.fn(),
  getLogById: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  logsApi: {
    getLogs: mocks.getLogs,
    getTotalHours: mocks.getTotalHours,
    createLog: mocks.createLog,
    getLogById: mocks.getLogById,
  },
  authApi: {
    getMe: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
    logout: vi.fn(),
  },
  getAuthToken: vi.fn().mockReturnValue('test-token'),
  setAuthToken: vi.fn(),
}));

import { getLogs, importLegacyLocalLogs } from './storage';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns empty logs when API fails', async () => {
    mocks.getLogs.mockRejectedValue(new Error('Network error'));

    const result = await getLogs(0);

    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('maps API logs to app logs', async () => {
    mocks.getLogs.mockResolvedValue({
      logs: [
        {
          id: 'log-1',
          date: '2026-02-21',
          weekNumber: 2,
          dayNumber: 3,
          timeIn: '08:00',
          timeOut: '17:00',
          totalHours: 8,
        },
      ],
      total: 1,
      hasMore: false,
    });

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

  it('imports legacy local logs and clears localStorage', async () => {
    mocks.createLog.mockResolvedValue({});

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
      ]),
    );

    const result = await importLegacyLocalLogs();

    expect(result).toEqual({ imported: 1 });
    expect(localStorage.getItem('ojt_logs_data')).toBeNull();
    expect(mocks.createLog).toHaveBeenCalledTimes(1);
  });
});
