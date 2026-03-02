import { format, isToday, isTomorrow } from 'date-fns';
import type { JSX } from 'solid-js';
import { createMemo, createSignal, Show } from 'solid-js';
import { CalendarIcon, XIcon } from '@/components/icons';
import { TodayStarIcon, EveningIcon, SomedayIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { ResponsivePicker } from '@/components/ui/responsive-picker';
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
  size?: 'default' | 'lg';
};

export function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = createSignal(false);
  const large = () => props.size === 'lg';

  const displayValue = createMemo(() => {
    if (props.isSomeday) return 'Someday';
    if (!props.value) return props.placeholder ?? 'When';
    const date = parseLocalDate(props.value);
    if (isToday(date)) return props.isEvening ? 'This Evening' : 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  });

  const hasValue = () => Boolean(props.value || props.isSomeday);

  const iconClass = () => large() ? 'h-4.5 w-4.5 md:h-3.5 md:w-3.5' : 'h-4 w-4 md:h-3.5 md:w-3.5';

  const contextIcon = createMemo(() => {
    // If an explicit icon is provided (e.g. deadline flag), use it
    if (props.icon) return props.icon;
    if (props.isSomeday) return <SomedayIcon class={iconClass()} />;
    if (!props.value) return <CalendarIcon class={iconClass()} />;
    const date = parseLocalDate(props.value);
    if (isToday(date) && props.isEvening) return <EveningIcon class={iconClass()} />;
    if (isToday(date)) return <TodayStarIcon class={iconClass()} />;
    return <CalendarIcon class={cn(iconClass(), 'text-things-pink')} />;
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
    <ResponsivePicker
      open={open()}
      onOpenChange={setOpen}
      trigger={
        <div
          class={cn(
            'inline-flex items-center gap-1 rounded transition-colors border border-transparent',
            large()
              ? 'text-base md:text-[14px] h-9 md:h-6'
              : 'text-base md:text-[12px] h-9 md:h-6',
            hasValue()
              ? large()
                ? 'text-foreground hover:border-toolbar-border pl-2 pr-0'
                : 'text-foreground hover:border-toolbar-border px-2'
              : 'text-toolbar-icon hover:border-toolbar-border w-8 md:w-6 justify-center',
            props.disabled && 'cursor-not-allowed opacity-50',
            props.class,
          )}
        >
          {contextIcon()}
          <Show when={hasValue()}>
            <span class="font-semibold">{displayValue()}</span>
            <Show when={props.onClear}>
              <span
                class={cn(
                  'inline-flex items-center justify-center text-foreground hover:bg-toolbar-border transition-colors',
                  large() ? 'h-full px-1.5 rounded-[3px]' : 'ml-0.5 rounded-sm',
                )}
                onClick={handleClear}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <XIcon class="h-3.5 w-3.5 md:h-3 md:w-3" />
              </span>
            </Show>
          </Show>
        </div>
      }
    >
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
    </ResponsivePicker>
  );
}
