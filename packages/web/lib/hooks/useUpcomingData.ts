import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isTomorrow,
  startOfDay,
} from 'date-fns';
import { useMemo } from 'react';
import type { RepeatingRuleRecord } from '@/db/validation';
import { useRepeatingRules, useTasks } from '@/lib/contexts/DataContext';
import { parseLocalDate } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';

export interface DayGroup {
  id: string;
  date: Date | null;
  dateStr: string;
  label: string;
  tasks: TaskWithRelations[];
  templates: RepeatingRuleRecord[];
  isLater?: boolean;
}

function getDayLabel(date: Date): string {
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

export function useUpcomingData() {
  const { data: tasks, loading } = useTasks();
  const { data: repeatingRules } = useRepeatingRules();

  const today = useMemo(() => startOfDay(new Date()), []);

  const activeTemplates = useMemo(() => {
    return repeatingRules.filter((r) => !r.deletedAt);
  }, [repeatingRules]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.trashedAt) return false;
      if (task.status === 'completed') return false;
      if (!task.scheduledDate && !task.deadline) return false;

      const taskDate = task.scheduledDate
        ? startOfDay(parseLocalDate(task.scheduledDate))
        : task.deadline
          ? startOfDay(parseLocalDate(task.deadline))
          : null;

      return taskDate && !isBefore(taskDate, addDays(today, 1));
    });
  }, [tasks, today]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    const sevenDaysFromNow = addDays(today, 7);

    for (let i = 1; i <= 7; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayTasks = upcomingTasks
        .filter((t) => {
          const scheduledDate = t.scheduledDate
            ? startOfDay(parseLocalDate(t.scheduledDate))
            : null;
          const deadline = t.deadline
            ? startOfDay(parseLocalDate(t.deadline))
            : null;
          return (
            (scheduledDate && isSameDay(scheduledDate, date)) ||
            (deadline && !scheduledDate && isSameDay(deadline, date))
          );
        })
        .slice()
        .sort((a, b) => a.position - b.position);

      const dayTemplates = activeTemplates.filter((r) => {
        const nextDate = startOfDay(parseLocalDate(r.nextOccurrence));
        return isSameDay(nextDate, date);
      });

      if (dayTasks.length > 0 || dayTemplates.length > 0 || i === 1) {
        groups.push({
          id: dateStr,
          date,
          dateStr,
          label: getDayLabel(date),
          tasks: dayTasks,
          templates: dayTemplates,
        });
      }
    }

    const laterTasks = upcomingTasks
      .filter((t) => {
        const scheduledDate = t.scheduledDate
          ? startOfDay(parseLocalDate(t.scheduledDate))
          : null;
        const deadline = t.deadline
          ? startOfDay(parseLocalDate(t.deadline))
          : null;
        const taskDate = scheduledDate || deadline;
        return taskDate && !isBefore(taskDate, addDays(sevenDaysFromNow, 1));
      })
      .slice()
      .sort((a, b) => {
        const dateA = a.scheduledDate || a.deadline || '';
        const dateB = b.scheduledDate || b.deadline || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.position - b.position;
      });

    const laterTemplates = activeTemplates.filter((r) => {
      const nextDate = startOfDay(parseLocalDate(r.nextOccurrence));
      return !isBefore(nextDate, addDays(sevenDaysFromNow, 1));
    });

    if (laterTasks.length > 0 || laterTemplates.length > 0) {
      groups.push({
        id: 'later',
        date: null,
        dateStr: '',
        label: 'Later',
        tasks: laterTasks,
        templates: laterTemplates,
        isLater: true,
      });
    }

    return groups;
  }, [upcomingTasks, activeTemplates, today]);

  return {
    dayGroups,
    loading,
  };
}
