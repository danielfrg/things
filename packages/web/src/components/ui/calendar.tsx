import {
  addDays,
  addMonths,
  format,
  getDay,
  getDaysInMonth,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Star as StarIcon } from 'lucide-solid';
import { createMemo, createSignal, For } from 'solid-js';
import { cn } from '@/lib/utils';

type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  class?: string;
};

export function Calendar(props: CalendarProps) {
  const [month, setMonth] = createSignal(props.selected ?? new Date());

  const daysInMonth = createMemo(() => {
    const start = startOfMonth(month());
    const count = getDaysInMonth(month());
    const startDay = getDay(start); // 0 = Sunday
    // Convert to Monday-first: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
    const mondayFirstStartDay = startDay === 0 ? 6 : startDay - 1;
    const days: (Date | null)[] = [];

    // Add empty slots for days before the 1st
    for (let i = 0; i < mondayFirstStartDay; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 0; i < count; i++) {
      days.push(addDays(start, i));
    }

    return days;
  });

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handlePrevMonth = () => setMonth(subMonths(month(), 1));
  const handleNextMonth = () => setMonth(addMonths(month(), 1));

  const isDisabled = (date: Date) => {
    if (props.disabled) return props.disabled(date);
    return false;
  };

  const isSelected = (date: Date) => {
    if (!props.selected) return false;
    return isSameDay(date, props.selected);
  };

  return (
    <div class={cn('mt-3 p-0 bg-transparent w-full', props.class)}>
      {/* Header with month/year and navigation */}
      <div class="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          class="p-1 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded"
        >
          <ChevronLeftIcon class="h-4 w-4" />
        </button>
        <span class="text-sm font-semibold text-popover-dark-foreground">
          {format(month(), 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          class="p-1 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded"
        >
          <ChevronRightIcon class="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div class="grid grid-cols-7 mb-1">
        <For each={weekdays}>
          {(day) => (
            <div class="text-[11px] font-bold text-popover-dark-muted text-center py-1">
              {day}
            </div>
          )}
        </For>
      </div>

      {/* Days grid */}
      <div class="grid grid-cols-7">
        <For each={daysInMonth()}>
          {(date) => {
            if (!date) {
              return <div class="h-8 w-8" />;
            }

            const dayIsToday = isToday(date);
            const dayIsSelected = isSelected(date);
            const dayIsDisabled = isDisabled(date);

            return (
              <div class="h-8 w-8 p-0 flex items-center justify-center">
                <button
                  type="button"
                  disabled={dayIsDisabled}
                  onClick={() => !dayIsDisabled && props.onSelect?.(date)}
                  class={cn(
                    'h-8 w-8 rounded-md text-sm font-bold transition-colors flex items-center justify-center',
                    dayIsDisabled
                      ? 'text-popover-dark-muted/30 cursor-default'
                      : dayIsSelected
                        ? 'bg-popover-dark-selected text-popover-dark-foreground'
                        : dayIsToday
                          ? 'text-popover-dark-selected'
                          : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
                  )}
                >
                  {dayIsToday && !dayIsSelected ? (
                    <StarIcon class="h-3 w-3" fill="#8E8E93" color="#8E8E93" />
                  ) : (
                    date.getDate()
                  )}
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
