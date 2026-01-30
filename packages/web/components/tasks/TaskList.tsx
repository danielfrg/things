import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
  TaskTagRecord,
} from '@/db/validation';
import {
  type DndModules,
  getDayGroupDropTargetData,
  getEveningGroupDropTargetData,
  getHeadingGroupDropTargetData,
  getProjectGroupDropTargetData,
  isDayGroupDropTargetData,
  isDraggingATask,
  isEveningGroupDropTargetData,
  isHeadingGroupDropTargetData,
  isProjectGroupDropTargetData,
  isTaskDragData,
  isTaskDropTargetData,
  loadDnd,
} from '@/lib/dnd';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';
import { TaskCard } from './TaskCard';
import { TaskRow, TaskShadow } from './TaskRow';

interface TaskListProps {
  tasks: TaskWithRelations[];
  optimisticOrder?: string[] | null;
  incomingTask?: {
    task: TaskWithRelations;
    index: number;
    rect: DOMRect;
  } | null;
  onTaskSelect?: (taskId: string, event: React.MouseEvent) => void;
  onTaskExpand?: (taskId: string) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onTaskReorder?: (taskIds: string[]) => void;
  onTaskMoveToHeading?: (
    taskId: string,
    headingId: string | undefined,
    targetTaskId?: string,
    edge?: 'top' | 'bottom',
  ) => void;
  onTaskMoveToProject?: (
    taskId: string,
    projectId: string | undefined,
    targetTaskId?: string,
    edge?: 'top' | 'bottom',
  ) => void;
  onTaskMoveToDate?: (
    taskId: string,
    date: string,
    targetTaskId?: string,
    edge?: 'top' | 'bottom',
  ) => void;
  onTaskMoveToEvening?: (
    taskId: string,
    isEvening: boolean,
    targetTaskId?: string,
    edge?: 'top' | 'bottom',
  ) => void;
  emptyMessage?: string;
  allowEmptyDropZone?: boolean;
  hideToday?: boolean;
  hideScheduledDate?: boolean;
  showDayBadge?: boolean;
  showTodayStar?: boolean;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
  selectedTaskId?: string | null;
  selectedIds?: Set<string>;
  expandedTaskId?: string | null;
  scheduleDatePickerTaskId?: string | null;
  onScheduleDatePickerClose?: () => void;
  onTaskUpdate?: (taskId: string, updates: Partial<TaskRecord>) => void;
  onTaskDelete?: (taskId: string) => void;
  onProjectChange?: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onTagAdd?: (taskId: string, tagId: string) => void;
  onTagRemove?: (taskId: string, tagId: string) => void;
  checklistItems?: ChecklistItemRecord[];
  tags?: TagRecord[];
  taskTags?: TaskTagRecord[];
  allTags?: TagRecord[];
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
  isTrash?: boolean;
  onRestore?: (taskId: string) => void;
  showProjectInfo?: boolean;
}

export function TaskList(props: TaskListProps) {
  const [isOver, setIsOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const displayedTasks = props.tasks;

  // Use optimisticOrder if provided, otherwise use props.tasks order directly
  const taskIds = useMemo(() => {
    if (props.optimisticOrder) {
      const existing = new Set(displayedTasks.map((t) => t.id));
      return props.optimisticOrder.filter((id) => existing.has(id));
    }
    return displayedTasks.map((t) => t.id);
  }, [displayedTasks, props.optimisticOrder]);

  const tasksById = useMemo(() => {
    const map = new Map<string, TaskWithRelations>();
    for (const t of displayedTasks) map.set(t.id, t);
    return map;
  }, [displayedTasks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.monitorForElements({
        canMonitor({
          source,
        }: {
          source: { data: Record<string | symbol, unknown> };
        }) {
          return isTaskDragData(source.data);
        },
        onDrop({
          source,
          location,
        }: {
          source: { data: Record<string | symbol, unknown> };
          location: {
            current: {
              dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
            };
          };
        }) {
          handleDrop(dnd, source, location);
        },
      });
    });

    function handleDrop(
      dnd: DndModules,
      source: { data: Record<string | symbol, unknown> },
      location: {
        current: {
          dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
        };
      },
    ) {
      const dragging = source.data;
      if (!isTaskDragData(dragging)) return;

      const innerMost = location.current.dropTargets[0];
      if (!innerMost) return;

      const dropTargetData = innerMost.data;

      if (isHeadingGroupDropTargetData(dropTargetData)) {
        const targetHeadingId = dropTargetData.headingId;
        if (props.headingId !== targetHeadingId) return;

        const sourceHeadingId = dragging.headingId;
        const isDifferentHeading =
          (sourceHeadingId === undefined && targetHeadingId !== undefined) ||
          (sourceHeadingId !== undefined && targetHeadingId === undefined) ||
          sourceHeadingId !== targetHeadingId;

        if (isDifferentHeading && props.onTaskMoveToHeading) {
          props.onTaskMoveToHeading(
            dragging.task.id,
            targetHeadingId,
            undefined,
            undefined,
          );
        }
        return;
      }

      if (isProjectGroupDropTargetData(dropTargetData)) {
        const targetProjectId = dropTargetData.projectId;
        if (props.projectId !== targetProjectId) return;

        const sourceProjectId = dragging.projectId;
        const isDifferentProject =
          (sourceProjectId === undefined && targetProjectId !== undefined) ||
          (sourceProjectId !== undefined && targetProjectId === undefined) ||
          sourceProjectId !== targetProjectId;

        if (isDifferentProject && props.onTaskMoveToProject) {
          props.onTaskMoveToProject(
            dragging.task.id,
            targetProjectId,
            undefined,
            undefined,
          );
        }
        return;
      }

      if (isDayGroupDropTargetData(dropTargetData)) {
        const targetDate = dropTargetData.groupDate;
        if (props.groupDate !== targetDate) return;

        const sourceDate = dragging.groupDate;
        const isDifferentDate = sourceDate !== targetDate;

        if (isDifferentDate && props.onTaskMoveToDate) {
          props.onTaskMoveToDate(
            dragging.task.id,
            targetDate,
            undefined,
            undefined,
          );
        }
        return;
      }

      if (isEveningGroupDropTargetData(dropTargetData)) {
        const targetIsEvening = dropTargetData.isEvening;
        if (props.isEvening !== targetIsEvening) return;

        const sourceIsEvening = dragging.isEvening ?? false;
        const isDifferentEvening = sourceIsEvening !== targetIsEvening;

        if (isDifferentEvening && props.onTaskMoveToEvening) {
          props.onTaskMoveToEvening(
            dragging.task.id,
            targetIsEvening,
            undefined,
            undefined,
          );
        }
        return;
      }

      if (!isTaskDropTargetData(dropTargetData)) return;

      const currentTasks = taskIds
        .map((id) => tasksById.get(id))
        .filter((t): t is TaskWithRelations => Boolean(t));
      const targetIndex = currentTasks.findIndex(
        (t) => t.id === dropTargetData.task.id,
      );

      if (targetIndex === -1) return;

      const sourceProjectId = dragging.projectId;
      const targetProjectId = dropTargetData.projectId;

      if (props.onTaskMoveToProject) {
        const isDifferentProject =
          (sourceProjectId === undefined && targetProjectId !== undefined) ||
          (sourceProjectId !== undefined && targetProjectId === undefined) ||
          sourceProjectId !== targetProjectId;

        if (isDifferentProject) {
          const closestEdge = dnd.extractClosestEdge(dropTargetData);
          const edge =
            closestEdge === 'top' || closestEdge === 'bottom'
              ? closestEdge
              : 'bottom';

          props.onTaskMoveToProject(
            dragging.task.id,
            targetProjectId,
            dropTargetData.task.id,
            edge,
          );
          return;
        }
      }

      const sourceHeadingId = dragging.headingId;
      const targetHeadingId = dropTargetData.headingId;

      const sourceStr = sourceHeadingId?.toString();
      const targetStr = targetHeadingId?.toString();

      if (sourceStr !== targetStr) {
        if (props.onTaskMoveToHeading) {
          const closestEdge = dnd.extractClosestEdge(dropTargetData);
          const edge =
            closestEdge === 'top' || closestEdge === 'bottom'
              ? closestEdge
              : 'bottom';

          props.onTaskMoveToHeading(
            dragging.task.id,
            targetHeadingId,
            dropTargetData.task.id,
            edge,
          );
        }
        return;
      }

      const sourceDate = dragging.groupDate;
      const targetDate = dropTargetData.groupDate;

      if (sourceDate !== targetDate && targetDate) {
        if (props.onTaskMoveToDate) {
          const closestEdge = dnd.extractClosestEdge(dropTargetData);
          const edge =
            closestEdge === 'top' || closestEdge === 'bottom'
              ? closestEdge
              : 'bottom';

          props.onTaskMoveToDate(
            dragging.task.id,
            targetDate,
            dropTargetData.task.id,
            edge,
          );
        }
        return;
      }

      // Check for evening cross-section move
      const sourceIsEvening = dragging.isEvening ?? false;
      const targetIsEvening = dropTargetData.isEvening ?? false;

      if (sourceIsEvening !== targetIsEvening) {
        if (props.onTaskMoveToEvening) {
          const closestEdge = dnd.extractClosestEdge(dropTargetData);
          const edge =
            closestEdge === 'top' || closestEdge === 'bottom'
              ? closestEdge
              : 'bottom';

          props.onTaskMoveToEvening(
            dragging.task.id,
            targetIsEvening,
            dropTargetData.task.id,
            edge,
          );
        }
        return;
      }

      const startIndex = currentTasks.findIndex(
        (t) => t.id === dragging.task.id,
      );

      if (startIndex === -1) return;
      if (startIndex === targetIndex) return;

      const closestEdge = dnd.extractClosestEdge(dropTargetData);

      const reordered = dnd.reorderWithEdge({
        axis: 'vertical',
        list: currentTasks,
        startIndex,
        indexOfTarget: targetIndex,
        closestEdgeOfTarget: closestEdge,
      });

      const newOrder = reordered.map((t) => t.id);
      props.onTaskReorder?.(newOrder);
    }

    return () => cleanup?.();
  }, [
    props.groupDate,
    props.headingId,
    props.isEvening,
    props.onTaskMoveToDate,
    props.onTaskMoveToEvening,
    props.onTaskMoveToHeading,
    props.onTaskMoveToProject,
    props.onTaskReorder,
    props.projectId,
    taskIds,
    tasksById,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const element = dropZoneRef.current;
    if (!element) return;
    if (displayedTasks.length > 0) return;

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.dropTargetForElements({
        element,
        canDrop: isDraggingATask,
        getData: () => {
          if (props.onTaskMoveToEvening && props.isEvening !== undefined) {
            return getEveningGroupDropTargetData({
              isEvening: props.isEvening,
            });
          }
          if (props.onTaskMoveToDate && props.groupDate) {
            return getDayGroupDropTargetData({ groupDate: props.groupDate });
          }
          if (props.onTaskMoveToProject) {
            return getProjectGroupDropTargetData({
              projectId: props.projectId,
            });
          }
          return getHeadingGroupDropTargetData({ headingId: props.headingId });
        },
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: () => setIsOver(false),
      });
    });

    return () => cleanup?.();
  }, [
    displayedTasks.length,
    props.groupDate,
    props.headingId,
    props.projectId,
    props.isEvening,
    props.onTaskMoveToDate,
    props.onTaskMoveToProject,
    props.onTaskMoveToEvening,
  ]);

  const isEmpty = displayedTasks.length === 0 && !props.incomingTask;

  if (isEmpty) {
    if (props.allowEmptyDropZone) {
      return (
        <div
          ref={dropZoneRef}
          className={cn(
            'h-[40px] transition-colors rounded-md',
            isOver && 'bg-secondary/50',
          )}
        />
      );
    }
    return (
      <div className="py-6 text-md text-muted-foreground">
        {props.emptyMessage ?? ''}
      </div>
    );
  }

  // Build render list with incoming task placeholder if needed
  const renderItems: Array<
    { type: 'task'; id: string } | { type: 'placeholder'; rect: DOMRect }
  > = [];
  const incomingTaskId = props.incomingTask?.task.id;
  const hasIncoming = props.incomingTask && !taskIds.includes(incomingTaskId!);

  taskIds.forEach((taskId, index) => {
    // Insert placeholder before this position if needed
    if (hasIncoming && props.incomingTask!.index === index) {
      renderItems.push({ type: 'placeholder', rect: props.incomingTask!.rect });
    }
    renderItems.push({ type: 'task', id: taskId });
  });

  // If incoming task goes at the end
  if (hasIncoming && props.incomingTask!.index >= taskIds.length) {
    renderItems.push({ type: 'placeholder', rect: props.incomingTask!.rect });
  }

  return (
    <div className="min-h-[40px]">
      {renderItems.map((item) => {
        if (item.type === 'placeholder') {
          return <TaskShadow key="incoming-placeholder" dragging={item.rect} />;
        }

        const taskId = item.id;
        const task = tasksById.get(taskId);
        if (!task) return null;

        const isExpanded = props.expandedTaskId === task.id;
        const taskChecklistItems = (props.checklistItems ?? []).filter(
          (row) => row.taskId === task.id,
        );
        // Use props.taskTags (from useTaskTags hook) if available for reactivity,
        // otherwise fall back to embedded task.tags
        const taskTagIds = props.taskTags
          ? props.taskTags
              .filter((tt) => tt.taskId === task.id)
              .map((tt) => tt.tagId)
          : (task.tags?.map((t: TagRecord) => t.id) ?? []);
        const taskTags = (props.allTags ?? []).filter((tag) =>
          taskTagIds.includes(tag.id),
        );

        const hasDetailHandlers = Boolean(
          props.onTaskUpdate && props.onTaskDelete,
        );

        if (!hasDetailHandlers) {
          return (
            <TaskRow
              key={taskId}
              task={task}
              onSelect={(id, event) => props.onTaskSelect?.(id, event)}
              onExpand={(id) => props.onTaskExpand?.(id)}
              onComplete={(id, completed) =>
                props.onTaskComplete(id, completed)
              }
              hideToday={props.hideToday}
              hideScheduledDate={props.hideScheduledDate}
              showDayBadge={props.showDayBadge}
              showTodayStar={props.showTodayStar}
              showProjectInfo={props.showProjectInfo}
              groupDate={props.groupDate}
              headingId={props.headingId}
              projectId={props.projectId}
              isEvening={props.isEvening}
              selected={
                props.selectedIds
                  ? props.selectedIds.has(task.id)
                  : props.selectedTaskId === task.id
              }
              expanded={false}
              projects={props.projects}
              areas={props.areas}
            />
          );
        }

        return (
          <TaskCard
            key={taskId}
            task={task}
            expanded={isExpanded}
            selected={
              props.selectedIds
                ? props.selectedIds.has(task.id)
                : props.selectedTaskId === task.id
            }
            onSelect={(id, event) => props.onTaskSelect?.(id, event)}
            onExpand={(id) => props.onTaskExpand?.(id)}
            onComplete={(id, completed) => props.onTaskComplete(id, completed)}
            checklistItems={taskChecklistItems}
            tags={taskTags}
            allTags={props.allTags}
            onUpdate={props.onTaskUpdate!}
            onDelete={props.onTaskDelete!}
            onProjectChange={props.onProjectChange}
            onTagAdd={props.onTagAdd}
            onTagRemove={props.onTagRemove}
            projects={props.projects}
            areas={props.areas}
            repeatingRuleId={task.repeatingRuleId}
            isTrash={props.isTrash}
            onRestore={props.onRestore}
            hideToday={props.hideToday}
            hideScheduledDate={props.hideScheduledDate}
            showDayBadge={props.showDayBadge}
            showTodayStar={props.showTodayStar}
            showProjectInfo={props.showProjectInfo}
            groupDate={props.groupDate}
            headingId={props.headingId}
            projectId={props.projectId}
            isEvening={props.isEvening}
            scheduleDatePickerOpen={props.scheduleDatePickerTaskId === task.id}
            onScheduleDatePickerClose={props.onScheduleDatePickerClose}
          />
        );
      })}
    </div>
  );
}

export { TaskShadow };
