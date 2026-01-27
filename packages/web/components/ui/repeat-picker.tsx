import { addDays, format, isValid, lastDayOfMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as rrulePkg from 'rrule';
import { RepeatIcon, XIcon } from '@/components/icons';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// Handle both ESM and CJS module formats
const RRule = (rrulePkg as any).RRule ?? (rrulePkg as any).default?.RRule;

type RepeatMode = 'daily' | 'weekly' | 'monthly';
type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
type MonthDay = number | 'last'; // 1-31 or 'last' for last day of month

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

function formatInputDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'dd/MM/yyyy');
}

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
    // Check for last day: BYMONTHDAY=-1
    if (rrule.includes('BYMONTHDAY=-1')) {
      return { mode: 'monthly', monthDay: 'last' };
    }
    // Check for specific day: BYMONTHDAY=N
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

function describeRRule(rruleStr: string): string {
  try {
    const rule = RRule.fromString(rruleStr);
    const text = rule.toText();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Custom repeat';
  } catch {
    return 'Custom repeat';
  }
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
      occurrences.push(format(addDays(start, i), 'dd/MM/yy'));
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
      occurrences.push(format(first, 'dd/MM/yy'));
      first = addDays(first, 7);
    }
    return occurrences;
  }

  if (mode === 'monthly') {
    for (let i = 0; i < 4; i++) {
      const targetMonth = new Date(
        start.getFullYear(),
        start.getMonth() + i,
        1,
      );
      if (monthDay === 'last') {
        const last = lastDayOfMonth(targetMonth);
        occurrences.push(format(last, 'dd/MM/yy'));
      } else {
        const day = monthDay ?? 1;
        const maxDay = lastDayOfMonth(targetMonth).getDate();
        const actualDay = Math.min(day, maxDay);
        const date = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          actualDay,
        );
        occurrences.push(format(date, 'dd/MM/yy'));
      }
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
  className?: string;
}

export function RepeatPicker({
  value,
  startDate,
  onChange,
  onClear,
  placeholder,
  disabled,
  className,
}: RepeatPickerProps) {
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => parseRRule(value), [value]);

  const [mode, setMode] = useState<RepeatMode | ''>(parsed?.mode ?? '');
  const [weekday, setWeekday] = useState<Weekday>(parsed?.weekday ?? 'MO');
  const [monthDay, setMonthDay] = useState<MonthDay>(parsed?.monthDay ?? 1);
  const [_startInput, setStartInput] = useState(formatInputDate(startDate));
  const [startIso, setStartIso] = useState<string | null>(startDate ?? null);

  useEffect(() => {
    const nextParsed = parseRRule(value);
    setMode(nextParsed?.mode ?? '');
    setWeekday(nextParsed?.weekday ?? 'MO');
    setMonthDay(nextParsed?.monthDay ?? 1);
  }, [value]);

  useEffect(() => {
    setStartInput(formatInputDate(startDate));
    setStartIso(startDate ?? null);
  }, [startDate]);

  const label = useMemo(() => {
    if (!value) return placeholder ?? 'Set repeat...';

    const parsedValue = parseRRule(value);
    const dateLabel = startDate
      ? format(parseLocalDate(startDate), 'dd/MM/yy')
      : '';

    // If we can parse it as daily/weekly/monthly, show our custom format
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

    // For any other RRULE, use the rrule library
    const desc = describeRRule(value);
    return dateLabel ? `${desc} · ${dateLabel}` : desc;
  }, [value, startDate, placeholder]);

  const nextDates = useMemo(() => {
    if (!mode || !startIso) return [];
    return computeNextOccurrences(mode as RepeatMode, startIso, weekday, monthDay);
  }, [mode, startIso, weekday, monthDay]);

  const canApply = useMemo(() => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    return !!mode && !!startIso && startIso >= tomorrow;
  }, [mode, startIso]);

  const apply = useCallback(() => {
    if (!mode || !startIso) return;
    onChange(buildRRule(mode as RepeatMode, weekday, monthDay), startIso);
    setOpen(false);
  }, [mode, startIso, weekday, monthDay, onChange]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear();
      setMode('');
      setStartInput('');
      setStartIso(null);
    },
    [onClear],
  );

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
        <RepeatIcon className="h-3.5 w-3.5 opacity-70" />
        <span className={cn(!value && 'text-muted-foreground')}>{label}</span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            className="ml-1 -mr-1 p-0.5 opacity-50 hover:opacity-100 cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleClear}
          >
            <XIcon className="h-3 w-3" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] max-md:w-[calc(100vw-32px)] p-3 max-md:p-4 max-md:max-h-[80vh] max-md:overflow-y-auto bg-popover-dark border-0 shadow-xl ring-0 gap-0"
        align="start"
        sideOffset={4}
      >
        {/* Header with title */}
        <div className="flex items-center justify-center relative max-md:mb-4">
          <h3 className="text-sm max-md:text-base font-semibold text-popover-dark-foreground">Repeat</h3>
        </div>

        <div className="space-y-3 max-md:space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors',
                mode === 'daily'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('daily');
                const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const iso =
                  startIso && startIso > tomorrowIso ? startIso : tomorrowIso;
                setStartIso(iso);
                setStartInput(formatInputDate(iso));
              }}
            >
              Daily
            </button>
            <button
              type="button"
              className={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors',
                mode === 'weekly'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('weekly');
                const iso = startIso ?? format(new Date(), 'yyyy-MM-dd');
                setStartIso(iso);
                setStartInput(formatInputDate(iso));
              }}
            >
              Weekly
            </button>
            <button
              type="button"
              className={cn(
                'h-9 max-md:h-12 rounded-lg px-3 text-sm max-md:text-base font-medium transition-colors',
                mode === 'monthly'
                  ? 'bg-popover-dark-selected text-white'
                  : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
              )}
              onClick={() => {
                setMode('monthly');
                const iso = startIso ?? format(new Date(), 'yyyy-MM-dd');
                setStartIso(iso);
                setStartInput(formatInputDate(iso));
                // Default to day 1 if not already set
                if (!monthDay) setMonthDay(1);
              }}
            >
              Monthly
            </button>
          </div>

          {mode === 'weekly' && (
            <div>
              <div className="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Day
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    className={cn(
                      'h-8 rounded-md text-xs font-medium transition-colors',
                      weekday === d.code
                        ? 'bg-popover-dark-selected text-white'
                        : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
                    )}
                    onClick={() => setWeekday(d.code)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'monthly' && (
            <div>
              <div className="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Day of Month
              </div>
              <div className="grid grid-cols-8 gap-1">
                {MONTH_DAYS.map((d) => (
                  <button
                    key={String(d)}
                    type="button"
                    className={cn(
                      'h-8 rounded-md text-xs font-medium transition-colors',
                      monthDay === d
                        ? 'bg-popover-dark-selected text-white'
                        : 'bg-popover-dark-accent text-white hover:bg-popover-dark-accent-hover',
                      d === 'last' && 'col-span-2',
                    )}
                    onClick={() => setMonthDay(d)}
                  >
                    {d === 'last' ? 'Last' : d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode && (
            <div>
              <div className="text-xs font-medium text-popover-dark-muted mb-2 uppercase tracking-wide">
                Starting
              </div>
              <input
                type="date"
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                value={startIso ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartIso(val);
                  setStartInput(formatInputDate(val));
                }}
                className="w-full h-9 rounded-lg bg-popover-dark-accent text-white px-3 text-sm outline-none placeholder:text-popover-dark-muted"
              />
              <p className="mt-1 text-xs text-popover-dark-muted">
                Start date must be tomorrow or later.
              </p>
            </div>
          )}

          {nextDates.length > 0 && (
            <div className="text-xs text-popover-dark-muted">
              Next: {nextDates.join(', ')}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className={cn(
                'flex-1 h-9 rounded-lg text-sm font-medium transition-colors',
                canApply
                  ? 'bg-popover-dark-selected text-white hover:bg-popover-dark-selected/90'
                  : 'bg-popover-dark-accent text-popover-dark-muted cursor-not-allowed',
              )}
              disabled={!canApply}
              onClick={apply}
            >
              Apply
            </button>
            <button
              type="button"
              className="flex-1 h-9 rounded-lg bg-popover-dark-accent text-white text-sm font-medium hover:bg-popover-dark-accent-hover transition-colors"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>

          {value && (
            <button
              type="button"
              className="w-full h-9 rounded-lg bg-popover-dark-accent text-destructive text-sm font-medium hover:bg-popover-dark-accent-hover transition-colors"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Remove Repeat
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
