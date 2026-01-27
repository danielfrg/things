import { format, isToday, isTomorrow } from 'date-fns';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { CalendarIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
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

  const displayValue = useMemo(() => {
    if (isSomeday) return 'Someday';
    if (!value) return placeholder ?? 'Select date...';
    const date = parseLocalDate(value);
    if (isToday(date)) return isEvening ? 'This Evening' : 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  }, [value, placeholder, isSomeday, isEvening]);

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
        className="w-auto p-0 bg-transparent border-0 shadow-xl ring-0"
        align="start"
        sideOffset={4}
      >
        <CalendarPopover
          value={value}
          onChange={onChange ?? (() => {})}
          onSomedaySelect={onSomedaySelect}
          isSomeday={isSomeday}
          showSomeday={showSomeday}
          showEvening={showEvening}
          isEvening={isEvening}
          onClose={() => setOpen(false)}
          title={title}
        />
      </PopoverContent>
    </Popover>
  );
}
