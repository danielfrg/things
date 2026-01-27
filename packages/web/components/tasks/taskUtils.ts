import { format, isPast, isToday, isTomorrow, startOfDay } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

/**
 * Format a date string for display in task metadata.
 * Returns 'Today', 'Tomorrow', or 'MMM d' format.
 */
export function formatTaskDate(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  const date = parseLocalDate(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d').toUpperCase();
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
