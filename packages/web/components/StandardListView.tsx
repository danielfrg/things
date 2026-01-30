import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatchActionBar } from '@/components/BatchActionBar';
import {
  GroupedTaskList,
  type TaskGroupsData,
  type TaskMoveInfo,
} from '@/components/board';
import { TaskListSkeleton } from '@/components/tasks/TaskRowSkeleton';
import type { ProjectRecord, TaskRecord } from '@/db/validation';
import {
  useAreas,
  useChecklistItems,
  useProjects,
  useTags,
  useTaskTags,
} from '@/lib/contexts/DataContext';
import { useBatchOperations } from '@/lib/hooks/useBatchOperations';
import { useHotkey } from '@/lib/hooks/useHotkey';
import { useMultiSelect } from '@/lib/hooks/useMultiSelect';
import { useTaskKeyboardNav } from '@/lib/hooks/useTaskKeyboardNav';
import { useTaskOperations } from '@/lib/hooks/useTaskOperations';

type TaskStatus = 'inbox' | 'scheduled' | 'anytime' | 'someday' | 'completed';

interface StandardListViewProps {
  /** The board data to display */
  boardData: TaskGroupsData;
  /** Whether data is still loading */
  loading?: boolean;
  /** Message to show when empty */
  emptyMessage?: string;
  /** Status to set when un-completing a task */
  uncompleteStatus?: TaskStatus;
  /** Hide the today star on tasks */
  hideToday?: boolean;
  /** Show the today star indicator */
  showTodayStar?: boolean;
  /** Whether this is the trash view */
  isTrash?: boolean;
  /** Custom handler for restoring trashed tasks */
  onRestore?: (taskId: string) => void;
  /** Custom handler for permanent delete (trash view) */
  onPermanentDelete?: (taskId: string) => void;
  /** Custom handler for task moves between sections */
  onTaskMove?: (info: TaskMoveInfo, projects: ProjectRecord[]) => void;
  /** Callback for editing heading title (project view) */
  onHeadingEdit?: (headingId: string, title: string) => void;
  /** Callback for deleting a heading (project view) */
  onHeadingDelete?: (headingId: string) => void;
  /** Initial task to select and expand */
  initialSelectedTaskId?: string;
  /** Show project link button on hover for project sections */
  showProjectLink?: boolean;
}

export function StandardListView({
  boardData,
  loading = false,
  emptyMessage = 'No tasks.',
  uncompleteStatus = 'anytime',
  hideToday,
  showTodayStar,
  isTrash,
  onRestore,
  onPermanentDelete,
  onTaskMove,
  onHeadingEdit,
  onHeadingDelete,
  initialSelectedTaskId,
  showProjectLink,
}: StandardListViewProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);

  const { data: projects } = useProjects();
  const { data: areas } = useAreas();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  const { data: taskTags } = useTaskTags();

  const ops = useTaskOperations({ uncompleteStatus });
  const batchOps = useBatchOperations();

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const tasks = useMemo(
    () => boardData.sections.flatMap((s) => s.tasks),
    [boardData],
  );

  const {
    selectedIds,
    lastSelectedId,
    handleSelect: baseHandleSelect,
    clearSelection,
    selectAll,
    isMultiSelecting,
  } = useMultiSelect({ items: tasks });

  // Handle initial task selection from command palette
  useEffect(() => {
    if (initialSelectedTaskId) {
      // Simulate a click to select the initial task
      baseHandleSelect(initialSelectedTaskId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
      setExpandedTaskId(initialSelectedTaskId);
    }
  }, [initialSelectedTaskId, baseHandleSelect]);

  // Get the single selected task ID for keyboard nav (when not multi-selecting)
  const selectedTaskId = isMultiSelecting ? null : lastSelectedId;

  useTaskKeyboardNav({
    tasks,
    selectedTaskId,
    expandedTaskId,
    onSelect: (taskId) => {
      if (taskId) {
        baseHandleSelect(taskId, {
          shiftKey: false,
          metaKey: false,
          ctrlKey: false,
        } as React.MouseEvent);
      } else {
        clearSelection();
      }
    },
    onExpand: (taskId) => {
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
      baseHandleSelect(taskId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
    },
  });

  // Cmd+A to select all
  useHotkey('a', selectAll, { meta: true });

  useHotkey(
    's',
    () => {
      if (lastSelectedId && !expandedTaskId && !isMultiSelecting) {
        setScheduleDatePickerTaskId(lastSelectedId);
      }
    },
    { ctrl: true },
  );

  const handleSelect = useCallback(
    (taskId: string, event: React.MouseEvent) => {
      baseHandleSelect(taskId, event);
      setScheduleDatePickerTaskId(null);
    },
    [baseHandleSelect],
  );

  const handleExpand = useCallback(
    (taskId: string) => {
      // Clear multi-selection when expanding
      clearSelection();
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
      baseHandleSelect(taskId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
      setScheduleDatePickerTaskId(null);
    },
    [baseHandleSelect, clearSelection],
  );

  const handleMove = useCallback(
    (info: TaskMoveInfo) => {
      if (onTaskMove) {
        onTaskMove(info, activeProjects);
        return;
      }
      ops.move(info, activeProjects);
    },
    [ops, activeProjects, onTaskMove],
  );

  const handleUpdate = useCallback(
    (taskId: string, updates: Partial<TaskRecord>) => {
      ops.update(taskId, updates);
    },
    [ops],
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      if (onPermanentDelete) {
        onPermanentDelete(taskId);
      } else {
        ops.trash(taskId);
      }
      setExpandedTaskId(null);
      clearSelection();
    },
    [ops, onPermanentDelete, clearSelection],
  );

  // Batch operation handlers
  const handleBatchDateChange = useCallback(
    (date: string | null, isEvening?: boolean) => {
      batchOps.batchSetDate(Array.from(selectedIds), date, isEvening);
      clearSelection();
    },
    [batchOps, selectedIds, clearSelection],
  );

  const handleBatchMove = useCallback(
    (projectId: string | null, areaId?: string | null) => {
      batchOps.batchMove(Array.from(selectedIds), projectId, areaId);
      clearSelection();
    },
    [batchOps, selectedIds, clearSelection],
  );

  const handleBatchTrash = useCallback(() => {
    batchOps.batchTrash(Array.from(selectedIds));
    clearSelection();
  }, [batchOps, selectedIds, clearSelection]);

  if (loading) {
    return <TaskListSkeleton />;
  }

  if (boardData.sections.length === 0) {
    return (
      <div className="py-6 text-md text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <>
      <GroupedTaskList
        initial={boardData}
        onComplete={ops.complete}
        onSelect={handleSelect}
        onClearSelection={clearSelection}
        onExpand={handleExpand}
        onReorder={ops.reorder}
        onMoveTask={handleMove}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRestore={onRestore}
        onProjectChange={ops.changeProject}
        onTagAdd={ops.addTag}
        onTagRemove={ops.removeTag}
        selectedIds={selectedIds}
        expandedTaskId={expandedTaskId}
        scheduleDatePickerTaskId={scheduleDatePickerTaskId}
        onScheduleDatePickerClose={() => setScheduleDatePickerTaskId(null)}
        projects={activeProjects}
        areas={areas}
        checklistItems={checklistItems}
        tags={tags}
        taskTags={taskTags}
        hideToday={hideToday}
        showTodayStar={showTodayStar}
        isTrash={isTrash}
        onHeadingEdit={onHeadingEdit}
        onHeadingDelete={onHeadingDelete}
        showProjectLink={showProjectLink}
      />

      {isMultiSelecting && (
        <BatchActionBar
          count={selectedIds.size}
          onDateChange={handleBatchDateChange}
          onMove={handleBatchMove}
          onTrash={handleBatchTrash}
          onClear={clearSelection}
          projects={activeProjects}
          areas={areas}
        />
      )}
    </>
  );
}
