import {
  format,
  isPast,
  isThisWeek,
  isToday,
  isTomorrow,
  startOfDay,
} from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

/**
 * Format a date string for display in task metadata.
 * Returns 'Today', 'Tmrw', day of week for this week, or 'Jan 30' format.
 */
export function formatTaskDate(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  const date = parseLocalDate(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tmrw';
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE');
  return format(date, 'MMM d');
}

/**
 * Get day of week badge text (e.g., 'Mon', 'Tue').
 */
export function getDayOfWeekBadge(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  const date = parseLocalDate(dateStr);
  return format(date, 'EEE');
}

/**
 * Check if a date is overdue (in the past but not today).
 */
export function isDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = parseLocalDate(dateStr);
  return isPast(startOfDay(date)) && !isToday(date);
}
