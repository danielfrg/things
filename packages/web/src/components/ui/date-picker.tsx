import { format, isToday, isTomorrow } from 'date-fns';
import type { JSX } from 'solid-js';
import { createMemo, createSignal, Show } from 'solid-js';
import { CalendarIcon, XIcon } from '@/components/icons';
import { TodayStarIcon, EveningIcon, SomedayIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, parseLocalDate } from '@/lib/utils';

type DatePickerProps = {
  value?: string;
  onChange?: (date: string | undefined, isEvening?: boolean) => void;
  onClear?: () => void;
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

  const hasValue = () => Boolean(props.value || props.isSomeday);

  const contextIcon = createMemo(() => {
    // If an explicit icon is provided (e.g. deadline flag), use it
    if (props.icon) return props.icon;
    if (props.isSomeday) return <SomedayIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />;
    if (!props.value) return <CalendarIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />;
    const date = parseLocalDate(props.value);
    if (isToday(date) && props.isEvening) return <EveningIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />;
    if (isToday(date)) return <TodayStarIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />;
    return <CalendarIcon class="h-4 w-4 md:h-3.5 md:w-3.5 text-things-pink" />;
  });

  const handleChange = (date: string | undefined, isEvening?: boolean) => {
    props.onChange?.(date, isEvening);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    props.onClear?.();
  };

  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <div class="inline-flex items-center">
        <PopoverTrigger
          disabled={props.disabled}
          class={cn(
            'inline-flex items-center gap-1 rounded text-base md:text-[12px] transition-colors h-9 md:h-6 border border-transparent',
            hasValue()
              ? 'text-foreground hover:border-toolbar-border px-2'
              : 'text-toolbar-icon hover:border-toolbar-border w-8 md:w-6 justify-center',
            'disabled:cursor-not-allowed disabled:opacity-50',
            props.class,
          )}
        >
          {contextIcon()}
          <Show when={hasValue()}>
            <span class="font-semibold">{displayValue()}</span>
            <Show when={props.onClear}>
              <span
                class="inline-flex items-center justify-center ml-0.5 rounded-sm text-foreground hover:bg-toolbar-border transition-colors"
                onClick={handleClear}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <XIcon class="h-3.5 w-3.5 md:h-3 md:w-3" />
              </span>
            </Show>
          </Show>
        </PopoverTrigger>
      </div>
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
