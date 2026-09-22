/**
 * Job & Scheduling Helper Utilities
 * Provides consistent date, hour, duration parsing and status mappings
 * between Client CRM records and the Dispatch Dashboard timeline.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a request time string (e.g., "08:00 AM", "10:30 AM", "01:00 PM")
 * into a timeline start hour (integer between 7 and 18 for standard 7am-7pm schedule grid).
 */
export function parseStartHour(requestTime?: string): number {
  if (!requestTime) return 8; // Default 8 AM

  const clean = requestTime.trim().toUpperCase();

  // Handle explicit known dropdown values
  if (clean.includes('07:') || clean === '7:00 AM' || clean === '07:00 AM') return 7;
  if (clean.includes('08:') || clean === '8:00 AM' || clean === '08:00 AM') return 8;
  if (clean.includes('09:') || clean === '9:00 AM' || clean === '09:00 AM') return 9;
  if (clean.includes('10:') || clean === '10:00 AM' || clean === '10:30 AM') return 10;
  if (clean.includes('11:') || clean === '11:00 AM' || clean === '11:30 AM') return 11;
  if (clean.includes('12:') || clean === '12:00 PM' || clean === '12:30 PM') return 12;
  if (clean.includes('01:') || clean === '1:00 PM' || clean === '01:00 PM') return 13;
  if (clean.includes('02:') || clean === '2:00 PM' || clean === '02:00 PM') return 14;
  if (clean.includes('03:') || clean === '3:00 PM' || clean === '03:00 PM') return 15;
  if (clean.includes('04:') || clean === '4:00 PM' || clean === '04:00 PM') return 16;
  if (clean.includes('05:') || clean === '5:00 PM' || clean === '05:00 PM') return 17;
  if (clean.includes('06:') || clean === '6:00 PM' || clean === '06:00 PM') return 18;

  // General 12-hour or 24-hour time regex parser
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const meridian = match12[3]?.toUpperCase();

    if (meridian === 'PM' && hour < 12) {
      hour += 12;
    } else if (meridian === 'AM' && hour === 12) {
      hour = 0;
    }

    // Clamp within 7 to 18 grid bounds
    return Math.max(7, Math.min(18, hour));
  }

  return 8;
}

/**
 * Parses an estimated duration string (e.g., "1 hour", "2 hours", "3 hours", "Full Day")
 * into a timeline duration number (in hours).
 */
export function parseDurationHours(durationStr?: string): number {
  if (!durationStr) return 2; // Default 2 hours

  const clean = durationStr.trim().toLowerCase();

  if (clean.includes('full day') || clean.includes('all day') || clean.includes('8 hour')) {
    return 8;
  }

  const match = clean.match(/^(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    return Math.max(1, Math.min(10, hours));
  }

  return 2;
}

/**
 * Maps a ServiceRequest execution status to a ScheduledJob status enum
 */
export function mapServiceStatusToJobStatus(
  status?: string
): 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' {
  switch (status) {
    case 'InProgress':
      return 'InProgress';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    case 'Assigned':
    default:
      return 'Scheduled';
  }
}
