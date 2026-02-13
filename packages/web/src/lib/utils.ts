import { type ClassValue, clsx } from "clsx"
import { format, isPast, isThisWeek, isToday, isTomorrow, startOfDay } from "date-fns"
import { twMerge } from "tailwind-merge"

export { parseLocalDate, formatLocalDate } from "@things/sdk"
import { parseLocalDate, formatLocalDate } from "@things/sdk"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get today's date as a YYYY-MM-DD string in local timezone.
 */
export function getTodayString(): string {
  return formatLocalDate(new Date())
}

/**
 * Format a date string for display in task metadata.
 * Returns 'Today', 'Tmrw', day of week for this week, or 'Jan 30' format.
 */
export function formatTaskDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const date = parseLocalDate(dateStr)
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tmrw"
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, "EEE")
  return format(date, "MMM d")
}

/**
 * Check if a date is overdue (in the past but not today).
 */
export function isDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const date = parseLocalDate(dateStr)
  return isPast(startOfDay(date)) && !isToday(date)
}
