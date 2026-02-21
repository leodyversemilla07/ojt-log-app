export interface OJTLogEntry {
    id: string;
    date: string; // ISO string format YYYY-MM-DD
    weekNumber: number;
    dayNumber: number;
    timeIn: string; // HH:mm format
    timeOut: string; // HH:mm format
    totalHours: number;
    tasksAccomplished: string[];
    keyLearnings: string[];
    challenges: string;
    goalsForTomorrow: string;
}

export type OJTLogEntryFormData = Omit<OJTLogEntry, 'id' | 'totalHours'>;
