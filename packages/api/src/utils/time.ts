/**
 * Calculate total hours from time-in and time-out strings
 * @param timeIn - Start time in HH:mm format
 * @param timeOut - End time in HH:mm format
 * @returns Total hours as a number
 */
export function calculateTotalHours(timeIn: string, timeOut: string): number {
  const [inHours, inMinutes] = timeIn.split(':').map(Number);
  const [outHours, outMinutes] = timeOut.split(':').map(Number);

  const totalInMinutes = inHours * 60 + inMinutes;
  const totalOutMinutes = outHours * 60 + outMinutes;

  let diff = totalOutMinutes - totalInMinutes;

  // Handle overnight shifts
  if (diff < 0) {
    diff += 24 * 60;
  }

  return Math.round((diff / 60) * 100) / 100; // Round to 2 decimal places
}
