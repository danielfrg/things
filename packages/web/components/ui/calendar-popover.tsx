import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { useCallback, useMemo } from 'react';
import {
  BoxIcon,
  CalendarIcon,
  CheckIcon,
  EveningIcon,
  StarIcon,
} from '@/components/icons';
import { CalendarGrid } from '@/components/ui/calendar-grid';
import { useOverlay } from '@/lib/hooks/useOverlay';
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
}

export function CalendarPopover({
  value,
  onChange,
  onSomedaySelect,
  isSomeday,
  showSomeday,
  showEvening,
  isEvening,
  onClose,
}: CalendarPopoverProps) {
  const overlayRef = useOverlay({
    open: true,
    onClose: onClose ?? (() => {}),
  });

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
    <div
      ref={overlayRef}
      className="w-[260px] rounded-xl bg-popover-dark p-2.5 overflow-hidden"
    >
      {/* Quick Select Options */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={handleToday}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors',
            isTodaySelected
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <StarIcon className="h-4 w-4" fill="#FFD60A" color="#FFD60A" />
          <span className="flex-1 text-left">Today</span>
          {isTodaySelected && <CheckIcon className="h-4 w-4" />}
        </button>

        {showEvening && (
          <button
            type="button"
            onClick={handleThisEvening}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors',
              isEveningSelected
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <EveningIcon className="h-4 w-4" />
            <span className="flex-1 text-left">This Evening</span>
            {isEveningSelected && <CheckIcon className="h-4 w-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={handleTomorrow}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors',
            isTomorrowSelected
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <CalendarIcon className="h-4 w-4 text-things-pink" />
          <span className="flex-1 text-left">Tomorrow</span>
          {isTomorrowSelected && <CheckIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Calendar Section */}
      <CalendarGrid
        selectedDate={selectedDate}
        onSelect={(date) => handleSelect(date, false)}
        hidePastDates
        className="mt-3"
      />

      {/* Bottom Options */}
      <div className="mt-3 space-y-0.5">
        {showSomeday && (
          <button
            type="button"
            onClick={handleSomeday}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors',
              isSomeday
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <BoxIcon className="h-4 w-4 text-things-beige" />
            <span className="flex-1 text-left">Someday</span>
            {isSomeday && <CheckIcon className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Clear Button */}
      {(value || isSomeday) && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 w-full rounded-md bg-popover-dark-accent-hover py-2 text-sm font-semibold text-popover-dark-foreground transition-colors hover:bg-popover-dark-accent-hover/80"
        >
          Clear
        </button>
      )}
    </div>
  );
}
