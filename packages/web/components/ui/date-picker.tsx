import { addDays, format, isToday, isTomorrow } from 'date-fns';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  EveningIcon,
  SomedayIcon,
  StarIcon,
} from '@/components/icons';
import { CalendarGrid } from '@/components/ui/calendar-grid';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn, parseLocalDate } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange?: (date: string | undefined, isEvening?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showSomeday?: boolean;
  onSomedaySelect?: () => void;
  isSomeday?: boolean;
  icon?: ReactNode;
  showEvening?: boolean;
  isEvening?: boolean;
  title?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  showSomeday,
  onSomedaySelect,
  isSomeday,
  icon,
  showEvening,
  isEvening,
  title = 'When',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    return parseLocalDate(value);
  }, [value]);

  const displayValue = useMemo(() => {
    if (isSomeday) return 'Someday';
    if (!value) return placeholder ?? 'Select date...';
    const date = parseLocalDate(value);
    if (isToday(date)) return isEvening ? 'This Evening' : 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  }, [value, placeholder, isSomeday, isEvening]);

  const handleSelect = useCallback(
    (date: Date, evening = false) => {
      onChange?.(format(date, 'yyyy-MM-dd'), evening);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange?.(undefined, false);
    setOpen(false);
  }, [onChange]);

  const handleSomeday = useCallback(() => {
    onSomedaySelect?.();
    setOpen(false);
  }, [onSomedaySelect]);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1 text-sm transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {icon ?? <CalendarIcon className="h-3.5 w-3.5 opacity-70" />}
        <span className={cn(!value && !isSomeday && 'text-muted-foreground')}>
          {displayValue}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] max-md:w-[calc(100vw-32px)] p-2.5 max-md:p-4 bg-popover-dark border-0 shadow-xl ring-0"
        align="start"
        sideOffset={4}
      >
        {/* Header with title */}
        <div className="flex items-center justify-center relative max-md:mb-4">
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

        {/* Calendar Grid */}
        <CalendarGrid
          selectedDate={selectedDate}
          onSelect={(date) => handleSelect(date, false)}
          hidePastDates
          className="mt-3 max-md:mt-4"
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
      </PopoverContent>
    </Popover>
  );
}
