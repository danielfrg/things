import {
  FileTextIcon,
  FlagIcon,
  ListChecksIcon,
  RepeatIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import type { TagRecord } from '@/db/validation';
import { cn } from '@/lib/utils';
import { formatTaskDate, isDateOverdue } from './taskUtils';

interface TaskMetadataProps {
  scheduledDate?: string | null;
  deadline?: string | null;
  notes?: string | null;
  repeatingRuleId?: string | null;
  tags?: TagRecord[];
  checklistItems?: { completed: boolean }[];
  hideToday?: boolean;
  hideScheduledDate?: boolean;
  showTodayStar?: boolean;
}

/**
 * TaskMetadata displays the collapsed metadata indicators:
 * notes icon, repeat icon, checklist count, tags, scheduled date, deadline.
 *
 * Used by both TaskItem and TaskItemExpandable for consistent display.
 */
export function TaskMetadata({
  scheduledDate,
  deadline,
  notes,
  repeatingRuleId,
  tags,
  checklistItems,
  hideToday,
  hideScheduledDate,
  showTodayStar,
}: TaskMetadataProps) {
  const scheduledDateStr = formatTaskDate(scheduledDate);
  const deadlineStr = formatTaskDate(deadline);
  const scheduledOverdue = isDateOverdue(scheduledDate);
  const deadlineOverdue = isDateOverdue(deadline);

  const showScheduledDate =
    scheduledDateStr &&
    !hideScheduledDate &&
    !((hideToday || showTodayStar) && scheduledDateStr === 'Today');

  const hasChecklist = (checklistItems?.length ?? 0) > 0;
  const completedCount =
    checklistItems?.filter((item) => item.completed).length ?? 0;
  const totalCount = checklistItems?.length ?? 0;

  const hasNotes = Boolean(notes && notes.trim().length > 0);
  const isRepeating = Boolean(repeatingRuleId);
  const tagCount = tags?.length ?? 0;

  const hasMetadata =
    showScheduledDate ||
    Boolean(deadlineStr) ||
    hasChecklist ||
    hasNotes ||
    isRepeating ||
    tagCount > 0;

  if (!hasMetadata) return null;

  return (
    <span className="flex items-center gap-2 ml-auto shrink-0 overflow-hidden">
      {hasNotes && (
        <FileTextIcon className="w-3.5 h-3.5 text-task-inline shrink-0" />
      )}

      {isRepeating && (
        <RepeatIcon className="w-3.5 h-3.5 text-task-inline shrink-0" />
      )}

      {hasChecklist && (
        <span className="flex items-center gap-1 text-xs text-task-inline shrink-0">
          <ListChecksIcon className="w-3.5 h-3.5" />
          {completedCount}/{totalCount}
        </span>
      )}

      {/* Hide tags on mobile to prevent overflow */}
      {tagCount > 0 && (
        <span className="hidden md:flex items-center gap-1">
          {tags?.slice(0, 2).map((tag) => (
            <Badge key={tag.id} variant="outline" size="xs">
              {tag.title}
            </Badge>
          ))}
          {tagCount > 2 && (
            <span className="text-xs text-task-inline">+{tagCount - 2}</span>
          )}
        </span>
      )}

      {showScheduledDate && (
        <Badge
          variant="secondary"
          size="sm"
          className={cn(
            'font-bold bg-scheduled-badge-bg text-scheduled-badge-text',
            scheduledOverdue && 'bg-transparent text-things-pink',
          )}
        >
          {scheduledDateStr}
        </Badge>
      )}

      {deadlineStr && (
        <span
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground shrink-0',
            deadlineOverdue && 'text-things-pink',
          )}
        >
          <FlagIcon className="w-3.5 h-3.5" />
          {deadlineStr}
        </span>
      )}
    </span>
  );
}
