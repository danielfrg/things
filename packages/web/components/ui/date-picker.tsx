import { format, isToday, isTomorrow } from 'date-fns';
import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { getAnchoredPosition } from '@/lib/hooks/useAnchoredPosition';
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
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayValue = useMemo(() => {
    if (isSomeday) return 'Someday';
    if (!value) return placeholder ?? 'Select date...';
    const date = parseLocalDate(value);
    if (isToday(date)) return isEvening ? 'This Evening' : 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  }, [value, placeholder, isSomeday, isEvening]);

  const handleClose = () => setOpen(false);

  const anchorRect = triggerRef.current?.getBoundingClientRect() ?? null;
  const popoverStyle = getAnchoredPosition(anchorRect, { popoverHeight: 380 });

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'inline-flex items-center gap-1 text-sm transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {icon ?? <CalendarIcon className="h-3.5 w-3.5 opacity-70" />}
        <span className={cn(!value && !isSomeday && 'text-muted-foreground')}>
          {displayValue}
        </span>
      </button>

      {open &&
        createPortal(
          <div data-popover style={popoverStyle}>
            <CalendarPopover
              value={value}
              onChange={onChange ?? (() => {})}
              onSomedaySelect={onSomedaySelect}
              isSomeday={isSomeday}
              showSomeday={showSomeday}
              showEvening={showEvening}
              isEvening={isEvening}
              onClose={handleClose}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
