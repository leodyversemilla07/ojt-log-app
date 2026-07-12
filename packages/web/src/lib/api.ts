import type { ApiResponse, AuthResponse, OJTLogEntry } from '@ojt-log/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type LogListItem = Pick<
  OJTLogEntry,
  'id' | 'date' | 'weekNumber' | 'dayNumber' | 'timeIn' | 'timeOut' | 'totalHours'
>;

interface PaginatedLogs {
  logs: LogListItem[];
  total: number;
  hasMore: boolean;
}

type LogDetail = OJTLogEntry;

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await apiFetch<ApiResponse<AuthResponse>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.data.token);
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiFetch<ApiResponse<AuthResponse>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.data.token);
    return response.data;
  },

  async getMe(): Promise<{ id: string; email: string }> {
    const response =
      await apiFetch<ApiResponse<{ user: { id: string; email: string } }>>('/api/auth/me');
    return response.data.user;
  },

  logout(): void {
    setAuthToken(null);
  },
};

// Logs API
export interface LogFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  weekNumber?: number;
}

export const logsApi = {
  async getLogs(
    page: number = 0,
    limit: number = 20,
    filters?: LogFilters,
  ): Promise<PaginatedLogs> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.weekNumber) params.append('weekNumber', filters.weekNumber.toString());

    const response = await apiFetch<ApiResponse<PaginatedLogs>>(`/api/logs?${params.toString()}`);
    return response.data;
  },

  async getLogById(id: string): Promise<LogDetail> {
    const response = await apiFetch<ApiResponse<LogDetail>>(`/api/logs/${id}`);
    const log = response.data;
    return {
      ...log,
      tasksAccomplished: Array.isArray(log.tasksAccomplished) ? log.tasksAccomplished : [],
      keyLearnings: Array.isArray(log.keyLearnings) ? log.keyLearnings : [],
    };
  },

  async getTotalHours(): Promise<number> {
    const response = await apiFetch<ApiResponse<{ totalHours: number }>>('/api/logs/stats');
    return response.data.totalHours;
  },

  async createLog(data: Omit<LogDetail, 'id' | 'totalHours'>): Promise<LogDetail> {
    const response = await apiFetch<ApiResponse<LogDetail>>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateLog(id: string, data: Omit<LogDetail, 'id' | 'totalHours'>): Promise<LogDetail> {
    const response = await apiFetch<ApiResponse<LogDetail>>(`/api/logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteLog(id: string): Promise<void> {
    await apiFetch<ApiResponse<null>>(`/api/logs/${id}`, {
      method: 'DELETE',
    });
  },
};

export type { AuthResponse, LogDetail, LogListItem, PaginatedLogs };
