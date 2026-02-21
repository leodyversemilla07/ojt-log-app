import type { OJTLogEntry, OJTLogEntryFormData } from '@/types/log';
import { calculateTotalHours } from '@/lib/time';
import { supabase } from '@/utils/supabase';

const STORAGE_KEY = 'ojt_logs_data';

type SupabaseLogRow = {
    id: string;
    user_id: string;
    date: string;
    week_number: number;
    day_number: number;
    time_in: string;
    time_out: string;
    total_hours: number | string;
    tasks_accomplished: string[] | null;
    key_learnings: string[] | null;
    challenges: string | null;
    goals_for_tomorrow: string | null;
    created_at: string;
    updated_at: string;
};

function getLegacyLocalLogs(): OJTLogEntry[] {
    try {
        const val = localStorage.getItem(STORAGE_KEY);
        return val ? JSON.parse(val) : [];
    } catch (e) {
        console.error("Failed to parse logs from localStorage", e);
        return [];
    }
}

function mapRowToLog(row: SupabaseLogRow): OJTLogEntry {
    return {
        id: row.id,
        date: row.date,
        weekNumber: row.week_number,
        dayNumber: row.day_number,
        timeIn: row.time_in.slice(0, 5),
        timeOut: row.time_out.slice(0, 5),
        totalHours: Number(row.total_hours),
        tasksAccomplished: row.tasks_accomplished ?? [],
        keyLearnings: row.key_learnings ?? [],
        challenges: row.challenges ?? '',
        goalsForTomorrow: row.goals_for_tomorrow ?? '',
    };
}

async function getAuthUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Failed to get auth user', error);
        return null;
    }

    return data.user?.id ?? null;
}

export function hasLegacyLocalLogs(): boolean {
    return getLegacyLocalLogs().length > 0;
}

export async function importLegacyLocalLogs(): Promise<{ imported: number }> {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const legacyLogs = getLegacyLocalLogs();
    if (legacyLogs.length === 0) {
        return { imported: 0 };
    }

    const payload = legacyLogs.map((log) => ({
        id: log.id,
        user_id: userId,
        date: log.date,
        week_number: log.weekNumber,
        day_number: log.dayNumber,
        time_in: log.timeIn,
        time_out: log.timeOut,
        total_hours: log.totalHours,
        tasks_accomplished: log.tasksAccomplished,
        key_learnings: log.keyLearnings,
        challenges: log.challenges,
        goals_for_tomorrow: log.goalsForTomorrow,
    }));

    const { error } = await supabase
        .from('ojt_logs')
        .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
        throw error;
    }

    localStorage.removeItem(STORAGE_KEY);
    return { imported: legacyLogs.length };
}

export async function getLogs(): Promise<OJTLogEntry[]> {
    const userId = await getAuthUserId();
    if (!userId) {
        return [];
    }

    const { data, error } = await supabase
        .from('ojt_logs')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Failed to fetch logs from Supabase', error);
        return [];
    }

    return (data as SupabaseLogRow[]).map(mapRowToLog);
}

export async function getLogById(id: string): Promise<OJTLogEntry | null> {
    const userId = await getAuthUserId();
    if (!userId) {
        return null;
    }

    const { data, error } = await supabase
        .from('ojt_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Failed to fetch log by id from Supabase', error);
        return null;
    }

    return data ? mapRowToLog(data as SupabaseLogRow) : null;
}

export async function saveLog(data: OJTLogEntryFormData): Promise<OJTLogEntry> {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const payload = {
        user_id: userId,
        date: data.date,
        week_number: data.weekNumber,
        day_number: data.dayNumber,
        time_in: data.timeIn,
        time_out: data.timeOut,
        total_hours: calculateTotalHours(data.timeIn, data.timeOut),
        tasks_accomplished: data.tasksAccomplished,
        key_learnings: data.keyLearnings,
        challenges: data.challenges,
        goals_for_tomorrow: data.goalsForTomorrow,
    };

    const { data: inserted, error } = await supabase
        .from('ojt_logs')
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        throw error;
    }

    return mapRowToLog(inserted as SupabaseLogRow);
}

export async function updateLog(id: string, data: OJTLogEntryFormData): Promise<OJTLogEntry | null> {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const payload = {
        date: data.date,
        week_number: data.weekNumber,
        day_number: data.dayNumber,
        time_in: data.timeIn,
        time_out: data.timeOut,
        total_hours: calculateTotalHours(data.timeIn, data.timeOut),
        tasks_accomplished: data.tasksAccomplished,
        key_learnings: data.keyLearnings,
        challenges: data.challenges,
        goals_for_tomorrow: data.goalsForTomorrow,
    };

    const { data: updated, error } = await supabase
        .from('ojt_logs')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw error;
    }

    return updated ? mapRowToLog(updated as SupabaseLogRow) : null;
}

export async function deleteLog(id: string): Promise<void> {
    const userId = await getAuthUserId();
    if (!userId) {
        throw new Error('User is not authenticated.');
    }

    const { error } = await supabase
        .from('ojt_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        throw error;
    }
}

export async function getTotalHoursLogged(): Promise<number> {
    const logs = await getLogs();
    return logs.reduce((sum, log) => sum + log.totalHours, 0);
}
