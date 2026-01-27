import { addDays, format, isBefore, isToday, isTomorrow, startOfDay } from 'date-fns';
import { useCallback, useMemo } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  EveningIcon,
  SomedayIcon,
  StarIcon,
} from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { cn, parseLocalDate } from '@/lib/utils';

interface CalendarPopoverProps {
  value?: string;
  onChange: (date: string | undefined, isEvening?: boolean) => void;
  onSomedaySelect?: () => void;
  isSomeday?: boolean;
  showSomeday?: boolean;
  showEvening?: boolean;
  isEvening?: boolean;
  onClose?: () => void;
  title?: string;
}

/**
 * Calendar popover content - for use with createPortal or inside a Popover.
 * Does NOT include Popover wrapper - use DatePicker for the full component.
 */
export function CalendarPopover({
  value,
  onChange,
  onSomedaySelect,
  isSomeday,
  showSomeday,
  showEvening,
  isEvening,
  onClose,
  title = 'When',
}: CalendarPopoverProps) {
  const selectedDate = useMemo(() => {
    if (!value) return null;
    return parseLocalDate(value);
  }, [value]);

  const handleSelect = useCallback(
    (date: Date, evening = false) => {
      onChange(format(date, 'yyyy-MM-dd'), evening);
      onClose?.();
    },
    [onChange, onClose],
  );

  const handleClear = useCallback(() => {
    onChange(undefined, false);
    onClose?.();
  }, [onChange, onClose]);

  const handleSomeday = useCallback(() => {
    onSomedaySelect?.();
    onClose?.();
  }, [onSomedaySelect, onClose]);

  const handleToday = useCallback(() => {
    handleSelect(new Date(), false);
  }, [handleSelect]);

  const handleThisEvening = useCallback(() => {
    handleSelect(new Date(), true);
  }, [handleSelect]);

  const handleTomorrow = useCallback(() => {
    handleSelect(addDays(new Date(), 1), false);
  }, [handleSelect]);

  const isTodaySelected = useMemo(() => {
    if (!selectedDate) return false;
    return isToday(selectedDate) && !isEvening;
  }, [selectedDate, isEvening]);

  const isEveningSelected = useMemo(() => {
    if (!selectedDate) return false;
    return isToday(selectedDate) && isEvening;
  }, [selectedDate, isEvening]);

  const isTomorrowSelected = useMemo(() => {
    if (!selectedDate) return false;
    return isTomorrow(selectedDate);
  }, [selectedDate]);

  return (
    <div className="w-[260px] max-md:w-[calc(100vw-32px)] rounded-xl bg-popover-dark p-2.5 max-md:p-4 overflow-hidden">
      {/* Header with title */}
      <div className="flex items-center justify-center relative mb-2 max-md:mb-4">
        <h3 className="text-sm max-md:text-base font-semibold text-popover-dark-foreground">
          {title}
        </h3>
      </div>

      {/* Quick Select Options */}
      <div className="space-y-0.5 max-md:space-y-1">
        <button
          type="button"
          onClick={handleToday}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 max-md:py-3 text-sm max-md:text-base font-semibold transition-colors',
            isTodaySelected
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <StarIcon className="h-4 w-4 max-md:h-5 max-md:w-5" fill="#FFD60A" color="#FFD60A" />
          <span className="flex-1 text-left">Today</span>
          {isTodaySelected && <CheckIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />}
        </button>

        {showEvening && (
          <button
            type="button"
            onClick={handleThisEvening}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 max-md:py-3 text-sm max-md:text-base font-semibold transition-colors',
              isEveningSelected
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <EveningIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />
            <span className="flex-1 text-left">This Evening</span>
            {isEveningSelected && <CheckIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />}
          </button>
        )}

        <button
          type="button"
          onClick={handleTomorrow}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 max-md:py-3 text-sm max-md:text-base font-semibold transition-colors',
            isTomorrowSelected
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <CalendarIcon className="h-4 w-4 max-md:h-5 max-md:w-5 text-things-pink" />
          <span className="flex-1 text-left">Tomorrow</span>
          {isTomorrowSelected && <CheckIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />}
        </button>
      </div>

      {/* Calendar Section */}
      <Calendar
        mode="single"
        selected={selectedDate ?? undefined}
        onSelect={(date) => date && handleSelect(date, false)}
        disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
        showOutsideDays={false}
        fixedWeeks={false}
        className="mt-3 max-md:mt-4 p-0 bg-transparent w-full gap-0"
        classNames={{
          months: 'flex flex-col w-full relative',
          month: 'w-full',
          nav: 'absolute inset-x-0 top-0 z-10 flex items-center justify-between pointer-events-none [&>button]:pointer-events-auto',
          button_previous: 'p-1 max-md:p-2 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded size-auto',
          button_next: 'p-1 max-md:p-2 text-popover-dark-muted hover:text-popover-dark-foreground transition-colors rounded size-auto',
          month_caption: 'flex items-center justify-center mb-2 max-md:mb-3',
          caption_label: 'text-sm max-md:text-base font-semibold text-popover-dark-foreground',
          weekdays: 'grid grid-cols-7 mb-1 max-md:mb-2',
          weekday: 'text-[11px] max-md:text-sm font-bold text-popover-dark-muted text-center py-1 max-md:py-2',
          week: 'grid grid-cols-7',
          day: 'h-8 w-8 max-md:h-11 max-md:w-full p-0 flex items-center justify-center',
          today: 'bg-transparent',
          outside: 'opacity-30',
          disabled: '',
          hidden: 'invisible',
        }}
        formatters={{
          formatWeekdayName: (date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        }}
        components={{
          DayButton: ({ day, modifiers, ...props }) => {
            const dayIsToday = isToday(day.date);
            const dayIsSelected = modifiers.selected;
            const dayIsDisabled = modifiers.disabled;

            return (
              <button
                type="button"
                {...props}
                disabled={dayIsDisabled}
                className={cn(
                  'h-8 w-8 max-md:h-11 max-md:w-full rounded-md text-sm max-md:text-base font-bold transition-colors flex items-center justify-center',
                  modifiers.outside && 'opacity-30',
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
                  <StarIcon className="h-3 w-3 max-md:h-4 max-md:w-4" fill="#8E8E93" color="#8E8E93" />
                ) : (
                  day.date.getDate()
                )}
              </button>
            );
          },
        }}
      />

      {/* Bottom Options */}
      {showSomeday && (
        <div className="mt-3 max-md:mt-4 space-y-0.5 max-md:space-y-1">
          <button
            type="button"
            onClick={handleSomeday}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 max-md:py-3 text-sm max-md:text-base font-semibold transition-colors',
              isSomeday
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <SomedayIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />
            <span className="flex-1 text-left">Someday</span>
            {isSomeday && <CheckIcon className="h-4 w-4 max-md:h-5 max-md:w-5" />}
          </button>
        </div>
      )}

      {/* Clear Button */}
      {(value || isSomeday) && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 max-md:mt-4 w-full rounded-md bg-popover-dark-accent-hover py-2 max-md:py-3 text-sm max-md:text-base font-semibold text-popover-dark-foreground transition-colors hover:bg-popover-dark-accent-hover/80"
        >
          Clear
        </button>
      )}
    </div>
  );
}
