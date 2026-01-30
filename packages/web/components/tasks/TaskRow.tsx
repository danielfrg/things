import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EveningIcon, StarIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AreaRecord, ProjectRecord } from '@/db/validation';
import {
  getTaskDragData,
  getTaskDropTargetData,
  isDraggingATask,
  isSidebarAreaDropTargetData,
  isSidebarNavDropTargetData,
  isSidebarProjectDropTargetData,
  isTaskDragData,
} from '@/lib/dnd';
import {
  type DraggableDropTargetState,
  draggableDropTargetIdle,
  useDraggableDropTarget,
} from '@/lib/hooks/useDnd';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';
import { TaskCheckbox } from './TaskCheckbox';
import { TaskMetadata } from './TaskMetadata';
import { TaskProjectBadge } from './TaskProjectBadge';
import { TaskTitle } from './TaskTitle';
import { formatTaskDate, getDayOfWeekBadge } from './taskUtils';

interface TaskRowProps {
  task: TaskWithRelations;
  onComplete: (taskId: string, completed: boolean) => void;
  onSelect?: (taskId: string, event: React.MouseEvent) => void;
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
  onSelect?: (taskId: string, event: React.MouseEvent) => void;
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

  const titleStatus = isCompleted
    ? 'completed'
    : isSomeday
      ? 'someday'
      : 'default';

  return (
    <div ref={outerRef} className={outerClass}>
      {state.type === 'is-over' && state.closestEdge === 'top' && (
        <TaskShadow dragging={state.dragging} />
      )}

      <Button
        ref={innerRef}
        variant="ghost"
        onMouseDown={(e) => {
          if (e.button === 0) {
            onSelect?.(task.id, e);
          }
        }}
        onDoubleClick={() => onExpand?.(task.id)}
        className={getInnerClass()}
        style={{ ...previewStyle, ...selectedStyle }}
      >
        <TaskCheckbox
          checked={isCompleted}
          onChange={(checked) => onComplete?.(task.id, checked)}
          dashed={isSomeday}
        />

        {dayBadgeStr && (
          <Badge
            variant="secondary"
            size="sm"
            className="text-[12px] text-foreground"
          >
            {dayBadgeStr}
          </Badge>
        )}

        {showTodayStar &&
          scheduledDateStr === 'Today' &&
          !isCompleted &&
          (task.isEvening ? (
            <EveningIcon className="w-3.5 h-3.5 shrink-0 text-things-evening" />
          ) : (
            <StarIcon
              className="w-3.5 h-3.5 shrink-0 text-things-yellow"
              fill="currentColor"
            />
          ))}

        <div className="flex-1 min-w-0">
          <TaskTitle
            value={task.title}
            status={titleStatus}
            className="w-full cursor-inherit"
          />
          {showProjectInfo && (
            <TaskProjectBadge
              projectId={task.projectId}
              areaId={task.areaId}
              projects={projects}
              areas={areas}
            />
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
      onDrop: ({ location }) => {
        const target = location.current.dropTargets[0];
        if (target) {
          const data = target.data;
          if (
            isSidebarProjectDropTargetData(data) ||
            isSidebarNavDropTargetData(data) ||
            isSidebarAreaDropTargetData(data)
          ) {
            // Keep hidden for sidebar drops, add fallback timeout
            setTimeout(() => setState(idle), 300);
            return true;
          }
        }
        return false;
      },
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
