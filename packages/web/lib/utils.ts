import { type ClassValue, clsx } from 'clsx';
import { parseISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC.
 *
 * parseISO('2026-01-13') interprets it as UTC midnight, which can be
 * the previous day in timezones behind UTC (e.g., CST = UTC-6).
 *
 * This function appends T00:00:00 to force local time interpretation.
 */
export function parseLocalDate(dateStr: string): Date {
  // If it's already a full ISO string with time, use parseISO directly
  if (dateStr.includes('T')) {
    return parseISO(dateStr);
  }
  // For date-only strings (YYYY-MM-DD), append time to get local midnight
  return parseISO(`${dateStr}T00:00:00`);
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone.
 *
 * Using toISOString() converts to UTC which can shift the date.
 * This function uses local date components to ensure correct date.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
