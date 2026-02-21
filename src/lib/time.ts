export function calculateTotalHours(timeIn: string, timeOut: string): number {
    if (!timeIn || !timeOut) return 0;

    try {
        const minutesIn = parseTimeToMinutes(timeIn);
        const minutesOut = parseTimeToMinutes(timeOut);
        if (minutesIn === null || minutesOut === null) return 0;

        // If checkout time is before checkin time, assume they worked past midnight.
        let mins = (minutesOut - minutesIn + 24 * 60) % (24 * 60);
        mins -= getOverlapWithNoonBreak(minutesIn, minutesOut);
        if (mins < 0) mins = 0;

        // Return in hours, rounded to 2 decimal places
        return Math.round((mins / 60) * 100) / 100;
    } catch (e) {
        console.error("Error calculating time:", e);
        return 0;
    }
}

function getOverlapWithNoonBreak(startMinutes: number, endMinutes: number): number {
    const breakStart = 12 * 60; // 12:00 PM
    const breakEnd = 13 * 60;   // 1:00 PM

    if (startMinutes <= endMinutes) {
        return getRangeOverlap(startMinutes, endMinutes, breakStart, breakEnd);
    }

    // Overnight shift split into two ranges.
    return (
        getRangeOverlap(startMinutes, 24 * 60, breakStart, breakEnd) +
        getRangeOverlap(0, endMinutes, breakStart, breakEnd)
    );
}

function getRangeOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return Math.max(0, end - start);
}

function parseTimeToMinutes(rawTime: string): number | null {
    const value = rawTime.trim();
    const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
    if (!match) return null;

    const hourRaw = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();

    if (!Number.isInteger(hourRaw) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    if (period) {
        if (hourRaw < 1 || hourRaw > 12) return null;
        const hour24 = (hourRaw % 12) + (period === 'PM' ? 12 : 0);
        return (hour24 * 60) + minutes;
    }

    if (hourRaw < 0 || hourRaw > 23) return null;
    return (hourRaw * 60) + minutes;
}
