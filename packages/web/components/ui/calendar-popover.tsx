import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { useCallback, useMemo } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  EveningIcon,
  SomedayIcon,
  StarIcon,
} from '@/components/icons';
import { CalendarGrid } from '@/components/ui/calendar-grid';
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

      {/* Calendar Section */}
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
    </div>
  );
}
