import type { OJTLogEntry, OJTLogEntryFormData } from '@ojt-log/shared';
import { type LogDetail, type LogFilters, logsApi } from '@/lib/api';

const SETTINGS_KEY = 'ojt_settings';
const DEFAULT_TARGET_HOURS = 486;

export interface AppSettings {
  targetHours: number;
}

function getSettings(): AppSettings {
  try {
    const val = localStorage.getItem(SETTINGS_KEY);
    return val ? JSON.parse(val) : { targetHours: DEFAULT_TARGET_HOURS };
  } catch {
    return { targetHours: DEFAULT_TARGET_HOURS };
  }
}

export function getTargetHours(): number {
  return getSettings().targetHours;
}

export function setTargetHours(hours: number): void {
  const settings = getSettings();
  settings.targetHours = hours;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function mapLogToEntry(log: LogDetail): OJTLogEntry {
  return {
    id: log.id,
    date: log.date,
    weekNumber: log.weekNumber,
    dayNumber: log.dayNumber,
    timeIn: log.timeIn.slice(0, 5),
    timeOut: log.timeOut.slice(0, 5),
    totalHours: Number(log.totalHours),
    tasksAccomplished: log.tasksAccomplished ?? [],
    keyLearnings: log.keyLearnings ?? [],
    challenges: log.challenges ?? '',
    goalsForTomorrow: log.goalsForTomorrow ?? '',
  };
}

function mapFormDataToLog(data: OJTLogEntryFormData): Omit<LogDetail, 'id' | 'totalHours'> {
  return {
    date: data.date,
    weekNumber: data.weekNumber,
    dayNumber: data.dayNumber,
    timeIn: data.timeIn,
    timeOut: data.timeOut,
    tasksAccomplished: data.tasksAccomplished,
    keyLearnings: data.keyLearnings,
    challenges: data.challenges,
    goalsForTomorrow: data.goalsForTomorrow,
  };
}

export function hasLegacyLocalLogs(): boolean {
  try {
    const val = localStorage.getItem('ojt_logs_data');
    const logs = val ? JSON.parse(val) : [];
    return Array.isArray(logs) && logs.length > 0;
  } catch {
    return false;
  }
}

export async function importLegacyLocalLogs(): Promise<{ imported: number }> {
  try {
    const val = localStorage.getItem('ojt_logs_data');
    const logs: OJTLogEntry[] = val ? JSON.parse(val) : [];

    if (logs.length === 0) {
      return { imported: 0 };
    }

    let imported = 0;
    for (const log of logs) {
      try {
        const logData = mapFormDataToLog({
          date: log.date,
          weekNumber: log.weekNumber,
          dayNumber: log.dayNumber,
          timeIn: log.timeIn,
          timeOut: log.timeOut,
          tasksAccomplished: log.tasksAccomplished,
          keyLearnings: log.keyLearnings,
          challenges: log.challenges,
          goalsForTomorrow: log.goalsForTomorrow,
        });
        await logsApi.createLog(logData);
        imported++;
      } catch (e) {
        console.error('Failed to import log:', e);
      }
    }

    if (imported > 0) {
      localStorage.removeItem('ojt_logs_data');
    }

    return { imported };
  } catch (e) {
    console.error('Failed to import legacy logs:', e);
    return { imported: 0 };
  }
}

export interface PaginatedLogs {
  logs: OJTLogEntry[];
  total: number;
  hasMore: boolean;
}

export async function getLogs(page: number = 0, filters?: LogFilters): Promise<PaginatedLogs> {
  try {
    const data = await logsApi.getLogs(page, 20, filters);
    return {
      logs: data.logs.map((log) => ({
        id: log.id,
        date: log.date,
        weekNumber: log.weekNumber,
        dayNumber: log.dayNumber,
        timeIn: log.timeIn.slice(0, 5),
        timeOut: log.timeOut.slice(0, 5),
        totalHours: Number(log.totalHours),
        tasksAccomplished: Array.isArray(log.tasksAccomplished) ? log.tasksAccomplished : [],
        keyLearnings: [],
        challenges: '',
        goalsForTomorrow: '',
      })),
      total: data.total,
      hasMore: data.hasMore,
    };
  } catch (e) {
    console.error('Failed to fetch logs:', e);
    return { logs: [], total: 0, hasMore: false };
  }
}

export async function getTotalHoursLogged(): Promise<number> {
  try {
    return await logsApi.getTotalHours();
  } catch (e) {
    console.error('Failed to fetch total hours:', e);
    return 0;
  }
}

export async function getLogById(id: string): Promise<OJTLogEntry | null> {
  try {
    const log = await logsApi.getLogById(id);
    return mapLogToEntry(log);
  } catch (e) {
    console.error('Failed to fetch log:', e);
    return null;
  }
}

export async function saveLog(data: OJTLogEntryFormData): Promise<OJTLogEntry> {
  const logData = mapFormDataToLog(data);
  const created = await logsApi.createLog(logData);
  return mapLogToEntry(created);
}

export async function updateLog(
  id: string,
  data: OJTLogEntryFormData,
): Promise<OJTLogEntry | null> {
  try {
    const logData = mapFormDataToLog(data);
    const updated = await logsApi.updateLog(id, logData);
    return mapLogToEntry(updated);
  } catch (e) {
    console.error('Failed to update log:', e);
    return null;
  }
}

export async function deleteLog(id: string): Promise<void> {
  await logsApi.deleteLog(id);
}

// Export logs as CSV
export async function exportLogsAsCsv(filters?: LogFilters): Promise<void> {
  // Fetch all logs (up to 1000 for export)
  const data = await logsApi.getLogs(0, 1000, filters);

  if (data.logs.length === 0) {
    throw new Error('No logs to export');
  }

  // Fetch full details for each log
  const fullLogs: OJTLogEntry[] = [];
  for (const log of data.logs) {
    const full = await logsApi.getLogById(log.id);
    fullLogs.push(mapLogToEntry(full));
  }

  // CSV headers
  const headers = [
    'Date',
    'Week',
    'Day',
    'Time In',
    'Time Out',
    'Total Hours',
    'Tasks Accomplished',
    'Key Learnings',
    'Challenges',
    'Goals for Tomorrow',
  ];

  // Escape CSV field
  function escapeField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Build CSV rows
  const rows = fullLogs.map((log) => [
    log.date,
    log.weekNumber.toString(),
    log.dayNumber.toString(),
    log.timeIn,
    log.timeOut,
    log.totalHours.toString(),
    escapeField(log.tasksAccomplished.join('; ')),
    escapeField(log.keyLearnings.join('; ')),
    escapeField(log.challenges),
    escapeField(log.goalsForTomorrow),
  ]);

  // Create CSV content
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ojt-logs-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
