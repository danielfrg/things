import { addDays, format, isBefore, isToday, isTomorrow, startOfDay } from 'date-fns';
import { createMemo, Show } from 'solid-js';
import {
  CalendarIcon,
  CheckIcon,
  EveningIcon,
  SomedayIcon,
  StarIcon,
} from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { cn, parseLocalDate } from '@/lib/utils';

type CalendarPopoverProps = {
  value?: string;
  onChange: (date: string | undefined, isEvening?: boolean) => void;
  onSomedaySelect?: () => void;
  isSomeday?: boolean;
  showSomeday?: boolean;
  showEvening?: boolean;
  isEvening?: boolean;
  onClose?: () => void;
  title?: string;
};

export function CalendarPopover(props: CalendarPopoverProps) {
  const selectedDate = createMemo(() => {
    if (!props.value) return undefined;
    return parseLocalDate(props.value);
  });

  const handleSelect = (date: Date, evening = false) => {
    props.onChange(format(date, 'yyyy-MM-dd'), evening);
    props.onClose?.();
  };

  const handleClear = () => {
    props.onChange(undefined, false);
    props.onClose?.();
  };

  const handleSomeday = () => {
    props.onSomedaySelect?.();
    props.onClose?.();
  };

  const handleToday = () => handleSelect(new Date(), false);
  const handleThisEvening = () => handleSelect(new Date(), true);
  const handleTomorrow = () => handleSelect(addDays(new Date(), 1), false);

  const isTodaySelected = createMemo(() => {
    const date = selectedDate();
    if (!date) return false;
    return isToday(date) && !props.isEvening;
  });

  const isEveningSelected = createMemo(() => {
    const date = selectedDate();
    if (!date) return false;
    return isToday(date) && props.isEvening;
  });

  const isTomorrowSelected = createMemo(() => {
    const date = selectedDate();
    if (!date) return false;
    return isTomorrow(date);
  });

  const title = () => props.title ?? 'When';

  return (
    <div class="w-[260px] rounded-xl bg-popover-dark border border-popover-dark-border p-2.5 overflow-hidden">
      {/* Header with title */}
      <div class="flex items-center justify-center relative mb-2">
        <h3 class="text-sm font-semibold text-popover-dark-foreground">
          {title()}
        </h3>
      </div>

      {/* Quick Select Options */}
      <div class="space-y-0.5">
        <button
          type="button"
          onClick={handleToday}
          class={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors outline-none',
            isTodaySelected()
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <StarIcon class="h-4 w-4" fill="#FFD60A" color="#FFD60A" />
          <span class="flex-1 text-left">Today</span>
          <Show when={isTodaySelected()}>
            <CheckIcon class="h-4 w-4" />
          </Show>
        </button>

        <Show when={props.showEvening}>
          <button
            type="button"
            onClick={handleThisEvening}
            class={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors outline-none',
              isEveningSelected()
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <EveningIcon class="h-4 w-4" />
            <span class="flex-1 text-left">This Evening</span>
            <Show when={isEveningSelected()}>
              <CheckIcon class="h-4 w-4" />
            </Show>
          </button>
        </Show>

        <button
          type="button"
          onClick={handleTomorrow}
          class={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors outline-none',
            isTomorrowSelected()
              ? 'bg-popover-dark-selected text-popover-dark-foreground'
              : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
          )}
        >
          <CalendarIcon class="h-4 w-4 text-things-pink" />
          <span class="flex-1 text-left">Tomorrow</span>
          <Show when={isTomorrowSelected()}>
            <CheckIcon class="h-4 w-4" />
          </Show>
        </button>
      </div>

      {/* Calendar Section */}
      <Calendar
        selected={selectedDate()}
        onSelect={(date) => handleSelect(date, false)}
        disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
      />

      {/* Someday option */}
      <Show when={props.showSomeday}>
        <div class="mt-3 space-y-0.5">
          <button
            type="button"
            onClick={handleSomeday}
            class={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors outline-none',
              props.isSomeday
                ? 'bg-popover-dark-selected text-popover-dark-foreground'
                : 'text-popover-dark-foreground hover:bg-popover-dark-accent',
            )}
          >
            <SomedayIcon class="h-4 w-4" />
            <span class="flex-1 text-left">Someday</span>
            <Show when={props.isSomeday}>
              <CheckIcon class="h-4 w-4" />
            </Show>
          </button>
        </div>
      </Show>

      {/* Clear Button */}
      <Show when={props.value || props.isSomeday}>
        <button
          type="button"
          onClick={handleClear}
          class="mt-2 w-full rounded-md bg-popover-dark-accent-hover py-2 text-sm font-semibold text-popover-dark-foreground transition-colors hover:bg-popover-dark-accent-hover/80 outline-none"
        >
          Clear
        </button>
      </Show>
    </div>
  );
}
