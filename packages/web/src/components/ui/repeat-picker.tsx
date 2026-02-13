import { addDays, format, isValid, lastDayOfMonth } from 'date-fns';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { RepeatIcon } from '@/components/icons';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { toolbarButtonVariants } from './toolbar-button';

type RepeatMode = 'daily' | 'weekly' | 'monthly';
type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
type MonthDay = number | 'last';

const WEEKDAYS: Array<{ code: Weekday; label: string }> = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
];

const MONTH_DAYS: MonthDay[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 'last',
];

function parseRRule(
  rrule: string | undefined,
): { mode: RepeatMode; weekday?: Weekday; monthDay?: MonthDay } | null {
  if (!rrule) return null;

  if (rrule.startsWith('FREQ=DAILY')) {
    return { mode: 'daily' };
  }

  if (rrule.startsWith('FREQ=WEEKLY')) {
    const byday = /BYDAY=([^;]+)/.exec(rrule);
    const weekday = (byday?.[1]?.split(',')[0] ?? 'MO') as Weekday;
    if (WEEKDAYS.some((d) => d.code === weekday)) {
      return { mode: 'weekly', weekday };
    }
    return { mode: 'weekly', weekday: 'MO' };
  }

  if (rrule.startsWith('FREQ=MONTHLY')) {
    if (rrule.includes('BYMONTHDAY=-1')) {
      return { mode: 'monthly', monthDay: 'last' };
    }
    const bymonthday = /BYMONTHDAY=(\d+)/.exec(rrule);
    if (bymonthday) {
      const day = parseInt(bymonthday[1], 10);
      if (day >= 1 && day <= 31) {
        return { mode: 'monthly', monthDay: day };
      }
    }
    return { mode: 'monthly', monthDay: 1 };
  }

  return null;
}

function buildRRule(
  mode: RepeatMode,
  weekday: Weekday,
  monthDay: MonthDay,
): string {
  if (mode === 'daily') return 'FREQ=DAILY';
  if (mode === 'weekly') return `FREQ=WEEKLY;BYDAY=${weekday}`;
  if (mode === 'monthly') {
    if (monthDay === 'last') return 'FREQ=MONTHLY;BYMONTHDAY=-1';
    return `FREQ=MONTHLY;BYMONTHDAY=${monthDay}`;
  }
  return 'FREQ=DAILY';
}

function computeNextOccurrences(
  mode: RepeatMode,
  startDate: string,
  weekday?: Weekday,
  monthDay?: MonthDay,
): string[] {
  const occurrences: string[] = [];

  const start = parseLocalDate(startDate);
  if (!isValid(start)) return occurrences;

  if (mode === 'daily') {
    for (let i = 0; i < 4; i++) {
      occurrences.push(format(addDays(start, i), 'MM/dd/yy'));
    }
    return occurrences;
  }

  if (mode === 'weekly') {
    const target = weekday ?? 'MO';
    const map: Record<Weekday, number> = {
      SU: 0,
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
    };

    const targetDay = map[target];
    const dayDiff = (targetDay - start.getDay() + 7) % 7;
    let first = addDays(start, dayDiff);
    for (let i = 0; i < 4; i++) {
      occurrences.push(format(first, 'MM/dd/yy'));
      first = addDays(first, 7);
    }
    return occurrences;
  }

  if (mode === 'monthly') {
    // Find the first occurrence on or after the start date
    let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    
    for (let i = 0; i < 4; i++) {
      let targetDate: Date;
      
      if (monthDay === 'last') {
        targetDate = lastDayOfMonth(currentMonth);
      } else {
        const day = monthDay ?? 1;
        const maxDay = lastDayOfMonth(currentMonth).getDate();
        const actualDay = Math.min(day, maxDay);
        targetDate = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          actualDay,
        );
      }
      
      // For the first occurrence, make sure it's on or after start date
      if (i === 0 && targetDate < start) {
        // Target day already passed in start month, move to next month
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        i--; // Retry this iteration with the new month
        continue;
      }
      
      occurrences.push(format(targetDate, 'MM/dd/yy'));
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    return occurrences;
  }

  return occurrences;
}

interface RepeatPickerProps {
  value: string | undefined;
  startDate: string | undefined;
  onChange: (rrule: string | undefined, startDate: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  /** Hide the X clear button and "Remove Repeat" button */
  hideClear?: boolean;
}

export function RepeatPicker(props: RepeatPickerProps) {
  const [open, setOpen] = createSignal(false);

  const parsed = createMemo(() => parseRRule(props.value));

  const [mode, setMode] = createSignal<RepeatMode | ''>(parsed()?.mode ?? '');
  const [weekday, setWeekday] = createSignal<Weekday>(parsed()?.weekday ?? 'MO');
  const [monthDay, setMonthDay] = createSignal<MonthDay>(parsed()?.monthDay ?? 1);
  const [startIso, setStartIso] = createSignal<string | null>(props.startDate ?? null);

  // Sync with external value changes
  createEffect(() => {
    const nextParsed = parseRRule(props.value);
    setMode(nextParsed?.mode ?? '');
    setWeekday(nextParsed?.weekday ?? 'MO');
    setMonthDay(nextParsed?.monthDay ?? 1);
  });

  createEffect(() => {
    setStartIso(props.startDate ?? null);
  });

  const label = createMemo(() => {
    if (!props.value) return props.placeholder ?? 'Repeat';

    const parsedValue = parseRRule(props.value);
    const dateLabel = props.startDate
      ? format(parseLocalDate(props.startDate), 'MM/dd/yy')
      : '';

    if (parsedValue?.mode && dateLabel) {
      if (parsedValue.mode === 'daily') {
        return `Daily · ${dateLabel}`;
      }

      if (parsedValue.mode === 'weekly') {
        const weekdayLabel = WEEKDAYS.find(
          (d) => d.code === (parsedValue.weekday ?? 'MO'),
        )?.label;
        return `Weekly (${weekdayLabel ?? 'Mon'}) · ${dateLabel}`;
      }

      if (parsedValue.mode === 'monthly') {
        const dayLabel =
          parsedValue.monthDay === 'last'
            ? 'last day'
            : `day ${parsedValue.monthDay}`;
        return `Monthly (${dayLabel}) · ${dateLabel}`;
      }
    }

    return dateLabel ? `Repeat · ${dateLabel}` : 'Repeat';
  });

  const nextDates = createMemo(() => {
    const m = mode();
    const s = startIso();
    if (!m || !s) return [];
    return computeNextOccurrences(m as RepeatMode, s, weekday(), monthDay());
  });

  const canApply = createMemo(() => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const m = mode();
    const s = startIso();
    return !!m && !!s && s >= tomorrow;
  });

  const apply = () => {
    const m = mode();
    const s = startIso();
    if (!m || !s) return;
    props.onChange(buildRRule(m as RepeatMode, weekday(), monthDay()), s);
    setOpen(false);
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
        <span class="opacity-70 group-hover:opacity-100 transition-opacity">
          <RepeatIcon class="h-3.5 w-3.5" />
        </span>
        <span
          class={cn(
            'transition-colors',
            !props.value && 'opacity-70 group-hover:opacity-100',
          )}
        >
          {label()}
        </span>
      </PopoverTrigger>

      <PopoverContent
        class="w-[280px] max-md:w-[calc(100vw-32px)] p-3 max-md:p-4 max-md:max-h-[80vh] max-md:overflow-y-auto bg-popover-dark border border-popover-dark-border shadow-xl ring-0 gap-0"
      >
        {/* Header with title */}
        <div class="flex mb-2 items-center justify-center relative max-md:mb-4">
          <h3 class="text-sm max-md:text-base font-semibold text-popover-dark-foreground">
            Repeat
          </h3>
        </div>

        <div class="space-y-2 max-md:space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors outline-none',
                mode() === 'daily'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('daily');
                const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const iso =
                  startIso() && startIso()! > tomorrowIso ? startIso() : tomorrowIso;
                setStartIso(iso);
              }}
            >
              Daily
            </button>
            <button
              type="button"
              class={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors outline-none',
                mode() === 'weekly'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('weekly');
                const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const iso =
                  startIso() && startIso()! > tomorrowIso ? startIso() : tomorrowIso;
                setStartIso(iso);
              }}
            >
              Weekly
            </button>
            <button
              type="button"
              class={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors outline-none',
                mode() === 'monthly'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('monthly');
                const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const iso =
                  startIso() && startIso()! > tomorrowIso ? startIso() : tomorrowIso;
                setStartIso(iso);
                if (!monthDay()) setMonthDay(1);
              }}
            >
              Monthly
            </button>
          </div>

          <Show when={mode() === 'weekly'}>
            <div>
              <div class="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Day
              </div>
              <div class="grid grid-cols-7 gap-1">
                <For each={WEEKDAYS}>
                  {(d) => (
                    <button
                      type="button"
                      class={cn(
                        'h-8 rounded-md text-xs font-medium transition-colors outline-none',
                        weekday() === d.code
                          ? 'bg-popover-dark-selected text-white'
                          : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
                      )}
                      onClick={() => setWeekday(d.code)}
                    >
                      {d.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={mode() === 'monthly'}>
            <div>
              <div class="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Day of Month
              </div>
              <div class="grid grid-cols-8 gap-1">
                <For each={MONTH_DAYS}>
                  {(d) => (
                    <button
                      type="button"
                      class={cn(
                        'h-8 rounded-md text-xs font-medium transition-colors outline-none',
                        monthDay() === d
                          ? 'bg-popover-dark-selected text-white'
                          : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
                        d === 'last' && 'col-span-2',
                      )}
                      onClick={() => setMonthDay(d)}
                    >
                      {d === 'last' ? 'Last' : d}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={mode()}>
            <div>
              <div class="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Starting
              </div>
              <input
                type="date"
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                value={startIso() ?? ''}
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  setStartIso(val);
                }}
                class="w-full h-9 rounded-lg bg-popover-dark-accent text-white px-3 text-sm outline-none placeholder:text-popover-dark-muted"
              />
              <p class="mt-1 text-xs text-popover-dark-muted">
                Start date must be tomorrow or later.
              </p>
            </div>
          </Show>

          <Show when={nextDates().length > 0}>
            <div class="text-xs text-popover-dark-muted">
              Next: {nextDates().join(', ')}
            </div>
          </Show>

          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              class={cn(
                'flex-1 h-9 rounded-lg text-sm font-medium transition-colors outline-none',
                canApply()
                  ? 'bg-popover-dark-selected text-white hover:bg-popover-dark-selected/90'
                  : 'bg-popover-dark-accent text-popover-dark-muted cursor-not-allowed',
              )}
              disabled={!canApply()}
              onClick={apply}
            >
              Apply
            </button>
            <button
              type="button"
              class="flex-1 h-9 rounded-lg bg-popover-dark-accent text-white text-sm font-medium hover:bg-popover-dark-accent-hover transition-colors outline-none"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
