import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { TaskList } from '@/components/tasks/TaskList';
import { TemplateCard } from '@/components/tasks/TemplateCard';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
  TaskTagRecord,
} from '@/db/validation';
import { useBatchUpdateTasks } from '@/lib/contexts/DataContext';
import {
  type Edge,
  getDayGroupDropTargetData,
  isDraggingATask,
  isTaskDragData,
  isTaskDropTargetData,
  loadDnd,
} from '@/lib/dnd';
import type { DayGroup } from '@/lib/hooks/useUpcomingData';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';

interface UpcomingDaySectionProps {
  group: DayGroup;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  selectedTemplateId: string | null;
  expandedTemplateId: string | null;
  scheduleDatePickerTaskId: string | null;
  projects: ProjectRecord[];
  areas: AreaRecord[];
  checklistItems: ChecklistItemRecord[];
  tags: TagRecord[];
  taskTags?: TaskTagRecord[];
  onTaskSelect: (taskId: string | null) => void;
  onTaskExpand: (taskId: string) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onTaskUpdate: (taskId: string, updates: Partial<TaskRecord>) => void;
  onTaskDelete: (taskId: string) => void;
  onProjectChange: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onTagAdd: (taskId: string, tagId: string) => void;
  onTagRemove: (taskId: string, tagId: string) => void;
  onTemplateSelect: (templateId: string | null) => void;
  onTemplateExpand: (templateId: string) => void;
  onTaskMoveToDate: (taskId: string, date: string) => void;
  onScheduleDatePickerClose: () => void;
}

function EmptyDropZone({
  groupDate,
  onDrop,
}: {
  groupDate: string;
  onDrop: (taskId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.dropTargetForElements({
        element,
        canDrop: isDraggingATask,
        getData: () => getDayGroupDropTargetData({ groupDate }),
        onDragEnter({
          source,
        }: {
          source: { data: Record<string | symbol, unknown> };
        }) {
          if (isTaskDragData(source.data)) {
            setIsOver(true);
            setDragHeight(source.data.rect.height);
          }
        },
        onDragLeave() {
          setIsOver(false);
          setDragHeight(null);
        },
        onDrop({
          source,
        }: {
          source: { data: Record<string | symbol, unknown> };
        }) {
          setIsOver(false);
          setDragHeight(null);
          if (isTaskDragData(source.data)) {
            onDrop(source.data.task.id);
          }
        },
      });
    });

    return () => cleanup?.();
  }, [groupDate, onDrop]);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-md transition-all duration-150',
        isOver ? 'bg-secondary/80' : 'bg-transparent',
      )}
      style={{ height: isOver && dragHeight ? `${dragHeight}px` : '40px' }}
    />
  );
}

export function UpcomingDaySection({
  group,
  selectedTaskId,
  expandedTaskId,
  selectedTemplateId,
  expandedTemplateId,
  scheduleDatePickerTaskId,
  projects,
  areas,
  checklistItems,
  tags,
  taskTags,
  onTaskSelect,
  onTaskExpand,
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  onProjectChange,
  onTagAdd,
  onTagRemove,
  onTemplateSelect,
  onTemplateExpand,
  onTaskMoveToDate,
  onScheduleDatePickerClose,
}: UpcomingDaySectionProps) {
  const batchUpdateTasks = useBatchUpdateTasks();

  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [incomingTask, setIncomingTask] = useState<{
    task: TaskWithRelations;
    index: number;
    rect: DOMRect;
  } | null>(null);

  // Handle drops onto this day section (both on tasks and empty area)
  const handleTaskDrop = useCallback(
    (
      draggedTask: TaskWithRelations,
      sourceGroup: string | undefined,
      targetTask: TaskWithRelations | null,
      edge: Edge | null,
      rect: DOMRect,
    ) => {
      const isCrossGroup = sourceGroup !== group.id;

      if (!targetTask) {
        // Dropped on empty area - just move the date
        if (isCrossGroup && group.id !== 'later') {
          onTaskMoveToDate(draggedTask.id, group.id);
        }
        return;
      }

      // Build task list for reordering
      const tasksInGroup = isCrossGroup
        ? [...group.tasks.filter((t) => t.id !== draggedTask.id), draggedTask]
        : group.tasks;

      const startIndex = tasksInGroup.findIndex((t) => t.id === draggedTask.id);
      const targetIndex = tasksInGroup.findIndex((t) => t.id === targetTask.id);

      if (startIndex === -1 || targetIndex === -1) return;

      void loadDnd().then((dnd) => {
        const reordered = dnd.reorderWithEdge({
          axis: 'vertical',
          list: tasksInGroup,
          startIndex,
          indexOfTarget: targetIndex,
          closestEdgeOfTarget: edge,
        });

        const reorderedIds = reordered.map((t) => t.id);
        const draggedIndex = reorderedIds.indexOf(draggedTask.id);

        flushSync(() => {
          setPendingOrder(reorderedIds);
          if (isCrossGroup) {
            setIncomingTask({ task: draggedTask, index: draggedIndex, rect });
          }
        });

        const updates = reordered.map((task, index) => {
          const changes: Partial<TaskRecord> = { position: index + 1 };
          if (task.id === draggedTask.id && isCrossGroup) {
            changes.scheduledDate = group.id;
            changes.status = 'scheduled';
          }
          return { id: task.id, changes };
        });

        batchUpdateTasks.mutate(updates, {
          onSettled: () => {
            setPendingOrder(null);
            setIncomingTask(null);
          },
        });
      });
    },
    [group.id, group.tasks, batchUpdateTasks, onTaskMoveToDate],
  );

  // Set up drop target monitoring for cross-group task drops
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.monitorForElements({
        canMonitor: isDraggingATask,
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
          const innerMost = location.current.dropTargets[0];
          if (!innerMost) return;

          // Only handle drops that target this group
          const targetData = innerMost.data;
          const targetGroupDate = isTaskDropTargetData(targetData)
            ? targetData.groupDate
            : null;

          if (targetGroupDate !== group.id) return;

          if (!isTaskDragData(source.data)) return;

          const draggedTask = source.data.task;
          const sourceGroup = source.data.groupDate;
          const rect = source.data.rect;

          if (isTaskDropTargetData(targetData)) {
            const edge = dnd.extractClosestEdge(targetData);
            handleTaskDrop(
              draggedTask,
              sourceGroup,
              targetData.task,
              edge,
              rect,
            );
          }
        },
      });
    });

    return () => cleanup?.();
  }, [group.id, handleTaskDrop]);

  const handleEmptyDrop = useCallback(
    (taskId: string) => {
      if (group.id !== 'later') {
        onTaskMoveToDate(taskId, group.id);
      }
    },
    [group.id, onTaskMoveToDate],
  );

  const hasContent =
    group.tasks.length > 0 || group.templates.length > 0 || incomingTask;

  return (
    <div>
      {/* Day header */}
      <div className="mb-3 px-4 md:px-8">
        {group.date ? (
          <div className="flex items-start gap-2">
            <div className="text-[28px] font-bold text-foreground leading-none">
              {format(group.date, 'd')}
            </div>
            <div className="flex-1 mt-[5px] border-t border-section-border">
              <div className="text-[16px] font-bold text-date-label">
                {group.label}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-section-border">
            <div className="text-[20px] font-bold text-foreground leading-none">
              {group.label}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {hasContent ? (
        <>
          {(group.tasks.length > 0 || incomingTask) && (
            <TaskList
              tasks={group.tasks}
              optimisticOrder={pendingOrder}
              incomingTask={incomingTask}
              onTaskSelect={onTaskSelect}
              onTaskComplete={onTaskComplete}
              onTaskExpand={onTaskExpand}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onProjectChange={onProjectChange}
              onTagAdd={onTagAdd}
              onTagRemove={onTagRemove}
              expandedTaskId={expandedTaskId}
              scheduleDatePickerTaskId={scheduleDatePickerTaskId}
              onScheduleDatePickerClose={onScheduleDatePickerClose}
              checklistItems={checklistItems}
              taskTags={taskTags}
              allTags={tags}
              projects={projects}
              areas={areas}
              groupDate={group.id}
              hideScheduledDate={!group.isLater}
              selectedTaskId={selectedTaskId}
            />
          )}

          {group.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              expanded={expandedTemplateId === template.id}
              selected={selectedTemplateId === template.id}
              onSelect={onTemplateSelect}
              onExpand={onTemplateExpand}
              projects={projects}
              areas={areas}
              allTags={tags}
              showNextDate={group.isLater}
            />
          ))}
        </>
      ) : (
        <EmptyDropZone groupDate={group.id} onDrop={handleEmptyDrop} />
      )}
    </div>
  );
}
