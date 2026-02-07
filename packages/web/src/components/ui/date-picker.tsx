import { format, isToday, isTomorrow } from 'date-fns';
import type { JSX } from 'solid-js';
import { createMemo, createSignal } from 'solid-js';
import { CalendarIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toolbarButtonVariants } from '@/components/ui/toolbar-button';
import { cn, parseLocalDate } from '@/lib/utils';

type DatePickerProps = {
  value?: string;
  onChange?: (date: string | undefined, isEvening?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  showSomeday?: boolean;
  onSomedaySelect?: () => void;
  isSomeday?: boolean;
  icon?: JSX.Element;
  showEvening?: boolean;
  isEvening?: boolean;
  title?: string;
};

export function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = createSignal(false);

  const displayValue = createMemo(() => {
    if (props.isSomeday) return 'Someday';
    if (!props.value) return props.placeholder ?? 'When';
    const date = parseLocalDate(props.value);
    if (isToday(date)) return props.isEvening ? 'This Evening' : 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  });

  const handleChange = (date: string | undefined, isEvening?: boolean) => {
    props.onChange?.(date, isEvening);
  };

  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={props.disabled}
        class={cn(
          'group',
          toolbarButtonVariants(),
          'disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )}
      >
        <span class="group-hover:opacity-100 transition-opacity [&>svg]:opacity-70 [&>svg]:group-hover:opacity-100">
          {props.icon ?? <CalendarIcon class="h-3.5 w-3.5" />}
        </span>
        <span
          class={cn(
            'transition-colors',
            !props.value && !props.isSomeday && 'opacity-70 group-hover:opacity-100',
          )}
        >
          {displayValue()}
        </span>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl">
        <CalendarPopover
          value={props.value}
          onChange={handleChange}
          onSomedaySelect={props.onSomedaySelect}
          isSomeday={props.isSomeday}
          showSomeday={props.showSomeday}
          showEvening={props.showEvening}
          isEvening={props.isEvening}
          onClose={() => setOpen(false)}
          title={props.title}
        />
      </PopoverContent>
    </Popover>
  );
}
