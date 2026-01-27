import {
  addMonths,
  format,
  getDay,
  getDaysInMonth,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  /** Whether to hide past dates */
  hidePastDates?: boolean;
  /** Day name format: 'short' = 'Sun', 'narrow' = 'Su' */
  dayFormat?: 'short' | 'narrow';
  className?: string;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_NARROW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarGrid({
  selectedDate,
  onSelect,
  hidePastDates = true,
  dayFormat = 'short',
  className,
}: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());

  const dayNames = dayFormat === 'short' ? DAY_NAMES_SHORT : DAY_NAMES_NARROW;

  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(viewDate);
    const daysInMonth = getDaysInMonth(viewDate);
    const startDayOfWeek = getDay(firstDay);
    const today = startOfDay(new Date());

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    }

    if (!hidePastDates) return days;

    // Group days into weeks
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Filter out weeks where all days are past (excluding today)
    const filteredWeeks = weeks.filter((week) =>
      week.some((day) => {
        if (!day) return false;
        return !isBefore(startOfDay(day), today);
      }),
    );

    return filteredWeeks.flat();
  }, [viewDate, hidePastDates]);

  const today = startOfDay(new Date());

  return (
    <div className={className}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2 max-md:mb-3">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1 max-md:p-2 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded"
        >
          <ChevronLeftIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />
        </button>
        <span className="text-sm max-md:text-base font-semibold text-popover-dark-foreground">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1 max-md:p-2 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded"
        >
          <ChevronRightIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1 max-md:mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-[11px] max-md:text-sm font-bold text-popover-dark-muted text-center py-1 max-md:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-8 w-8 max-md:h-11 max-md:w-full" />;
          }

          const isPast = isBefore(day, today);
          const dayIsToday = isToday(day);
          const dayIsSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, viewDate);

          // Show empty cell for past dates (keep grid structure)
          if (hidePastDates && isPast && !dayIsToday) {
            return <div key={day.toISOString()} className="h-8 w-8 max-md:h-11 max-md:w-full" />;
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'h-8 w-8 max-md:h-11 max-md:w-full rounded-md text-sm max-md:text-base font-bold transition-colors flex items-center justify-center',
                !isCurrentMonth && 'opacity-30',
                dayIsSelected
                  ? 'bg-popover-dark-selected text-popover-dark-foreground'
                  : dayIsToday
                    ? 'text-popover-dark-selected'
                    : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
              )}
            >
              {dayIsToday && !dayIsSelected ? (
                <StarIcon className="h-3 w-3 max-md:h-4 max-md:w-4" fill="#8E8E93" color="#8E8E93" />
              ) : (
                day.getDate()
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
