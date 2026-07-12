import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('@/lib/api', () => ({
  authApi: {
    getMe: vi.fn().mockRejectedValue(new Error('Not authenticated')),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
  logsApi: {
    getLogs: vi.fn(),
    getTotalHours: vi.fn(),
    createLog: vi.fn(),
    getLogById: vi.fn(),
    updateLog: vi.fn(),
    deleteLog: vi.fn(),
  },
  getAuthToken: vi.fn().mockReturnValue(null),
  setAuthToken: vi.fn(),
}));

describe('App auth gate', () => {
  it('shows auth page when not authenticated', async () => {
    render(<App />);

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });
});
