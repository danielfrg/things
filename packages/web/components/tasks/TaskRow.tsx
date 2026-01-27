import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StarIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { AreaRecord, ProjectRecord } from '@/db/validation';
import {
  getTaskDragData,
  getTaskDropTargetData,
  isDraggingATask,
  isTaskDragData,
} from '@/lib/dnd';
import {
  type DraggableDropTargetState,
  draggableDropTargetIdle,
  useDraggableDropTarget,
} from '@/lib/hooks/useDnd';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';
import { TaskMetadata } from './TaskMetadata';
import { formatTaskDate, getDayOfWeekBadge } from './taskUtils';

interface TaskRowProps {
  task: TaskWithRelations;
  onComplete: (taskId: string, completed: boolean) => void;
  onSelect?: (taskId: string) => void;
  onExpand?: (taskId: string) => void;
  hideToday?: boolean;
  hideScheduledDate?: boolean;
  showDayBadge?: boolean;
  showTodayStar?: boolean;
  showProjectInfo?: boolean;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
  selected?: boolean;
  expanded?: boolean;
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
}

type TaskRowState = DraggableDropTargetState;

const idle: TaskRowState = draggableDropTargetIdle;

export function TaskShadow({ dragging }: { dragging: DOMRect }) {
  return (
    <div
      className="flex-shrink-0 rounded-md bg-secondary/80 transition-all duration-150"
      style={{ height: `${dragging.height}px`, width: `${dragging.width}px` }}
    />
  );
}

interface TaskDisplayProps {
  task: TaskWithRelations;
  state: TaskRowState;
  outerRef?: React.RefObject<HTMLDivElement>;
  innerRef?: React.RefObject<HTMLButtonElement>;
  hideToday?: boolean;
  hideScheduledDate?: boolean;
  showDayBadge?: boolean;
  showTodayStar?: boolean;
  showProjectInfo?: boolean;
  onComplete?: (taskId: string, completed: boolean) => void;
  onSelect?: (taskId: string) => void;
  onExpand?: (taskId: string) => void;
  selected?: boolean;
  expanded?: boolean;
  isPreviewPortal?: boolean;
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
}

function TaskDisplay({
  task,
  state,
  outerRef,
  innerRef,
  hideToday,
  hideScheduledDate,
  showDayBadge,
  showTodayStar,
  showProjectInfo,
  onComplete,
  onSelect,
  onExpand,
  selected,
  isPreviewPortal,
  projects,
  areas,
}: TaskDisplayProps) {
  const isCompleted = task.status === 'completed';
  const isSomeday = task.status === 'someday';
  const scheduledDateStr = formatTaskDate(task.scheduledDate);
  const dayBadgeStr = showDayBadge
    ? getDayOfWeekBadge(task.scheduledDate)
    : null;

  const outerClass = cn(
    'm-0 flex-shrink-0',
    state.type === 'is-dragging-and-left-self' && 'hidden',
  );

  const getInnerClass = () => {
    const base =
      'group flex items-center gap-2 px-4 md:px-2 py-2 md:rounded-md w-full text-left overflow-hidden';

    if (selected) return base;

    if (isPreviewPortal) {
      return cn(base, 'bg-background shadow-lg border border-border');
    }

    switch (state.type) {
      case 'idle':
        return cn(base, 'hover:bg-secondary/50 cursor-grab');
      case 'is-dragging':
      case 'is-dragging-and-left-self':
      case 'preview':
        return cn(base, 'opacity-40 cursor-grabbing');
      default:
        return base;
    }
  };

  const previewStyle =
    isPreviewPortal && state.type === 'preview'
      ? {
          width: `${state.dragging.width}px`,
          height: `${state.dragging.height}px`,
        }
      : undefined;

  const selectedStyle = selected
    ? { backgroundColor: 'var(--task-selected)' }
    : undefined;

  return (
    <div ref={outerRef} className={outerClass}>
      {state.type === 'is-over' && state.closestEdge === 'top' && (
        <TaskShadow dragging={state.dragging} />
      )}

      <Button
        ref={innerRef}
        variant="ghost"
        onClick={() => onSelect?.(task.id)}
        onDoubleClick={() => onExpand?.(task.id)}
        className={getInnerClass()}
        style={{ ...previewStyle, ...selectedStyle }}
      >
        <span
          className="shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
          }}
        >
          <Checkbox
            variant="task"
            checked={isCompleted}
            onChange={(checked) => onComplete?.(task.id, checked)}
            dashed={isSomeday}
          />
        </span>

        {dayBadgeStr && (
          <Badge
            variant="secondary"
            size="sm"
            className="text-[12px] text-foreground"
          >
            {dayBadgeStr}
          </Badge>
        )}

        {showTodayStar && scheduledDateStr === 'Today' && !isCompleted && (
          <StarIcon
            className="w-3.5 h-3.5 shrink-0 text-things-yellow"
            fill="currentColor"
          />
        )}

        <div className="flex-1 min-w-0">
          <Input
            variant="ghost"
            type="text"
            value={task.title}
            readOnly
            tabIndex={-1}
            className={cn(
              'w-full text-lg md:text-[15px] leading-tight cursor-inherit pointer-events-none truncate',
              isCompleted
                ? 'line-through text-muted-foreground'
                : isSomeday
                  ? 'text-foreground/80'
                  : 'text-foreground',
            )}
          />
          {showProjectInfo && (task.projectId || task.areaId) && (
            <div className="text-[12px] text-muted-foreground truncate mt-0.5">
              {(() => {
                const project = task.projectId
                  ? projects?.find((p) => p.id === task.projectId)
                  : null;
                const area = task.areaId
                  ? areas?.find((a) => a.id === task.areaId)
                  : null;
                if (project && area) return `${area.title} › ${project.title}`;
                if (project) return project.title;
                if (area) return area.title;
                return null;
              })()}
            </div>
          )}
        </div>

        {!isCompleted && (
          <TaskMetadata
            scheduledDate={task.scheduledDate}
            deadline={task.deadline}
            notes={task.notes}
            repeatingRuleId={task.repeatingRuleId}
            tags={task.tags}
            checklistItems={task.checklistItems}
            hideToday={hideToday}
            hideScheduledDate={hideScheduledDate}
            showTodayStar={showTodayStar}
          />
        )}
      </Button>

      {state.type === 'is-over' && state.closestEdge === 'bottom' && (
        <TaskShadow dragging={state.dragging} />
      )}
    </div>
  );
}

export function TaskRow({
  task,
  onComplete,
  onSelect,
  onExpand,
  hideToday,
  hideScheduledDate,
  showDayBadge,
  showTodayStar,
  showProjectInfo,
  groupDate,
  headingId,
  projectId,
  isEvening,
  selected,
  expanded,
  projects,
  areas,
}: TaskRowProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<TaskRowState>(idle);

  useDraggableDropTarget(
    {
      outerRef,
      innerRef,
      getDragData: () =>
        getTaskDragData({
          task,
          rect: innerRef.current?.getBoundingClientRect() ?? new DOMRect(),
          groupDate,
          headingId,
          projectId,
          isEvening,
        }),
      getDropData: () =>
        getTaskDropTargetData({
          task,
          groupDate,
          headingId,
          projectId,
          isEvening,
        }),
      canDrop: isDraggingATask,
      isSelf: (data) => isTaskDragData(data) && data.task.id === task.id,
      setState,
    },
    [task.id, groupDate, headingId, projectId, isEvening],
  );

  return (
    <>
      <TaskDisplay
        outerRef={outerRef}
        innerRef={innerRef}
        state={state}
        task={task}
        hideToday={hideToday}
        hideScheduledDate={hideScheduledDate}
        showDayBadge={showDayBadge}
        showTodayStar={showTodayStar}
        showProjectInfo={showProjectInfo}
        onComplete={onComplete}
        onSelect={onSelect}
        onExpand={onExpand}
        selected={selected}
        expanded={expanded}
        projects={projects}
        areas={areas}
      />
      {state.type === 'preview' &&
        createPortal(
          <TaskDisplay
            state={state}
            task={task}
            hideToday={hideToday}
            hideScheduledDate={hideScheduledDate}
            showDayBadge={showDayBadge}
            showTodayStar={showTodayStar}
            showProjectInfo={showProjectInfo}
            selected={selected}
            isPreviewPortal
            projects={projects}
            areas={areas}
          />,
          state.container,
        )}
    </>
  );
}
