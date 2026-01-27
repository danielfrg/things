import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useHotkey } from '@/lib/hooks/useHotkey';
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
}: StandardListViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);

  // Handle initial task selection from command palette
  useEffect(() => {
    if (initialSelectedTaskId) {
      setSelectedTaskId(initialSelectedTaskId);
      setExpandedTaskId(initialSelectedTaskId);
    }
  }, [initialSelectedTaskId]);

  const { data: projects } = useProjects();
  const { data: areas } = useAreas();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  useTaskTags();

  const ops = useTaskOperations({ uncompleteStatus });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const tasks = useMemo(
    () => boardData.sections.flatMap((s) => s.tasks),
    [boardData],
  );

  useTaskKeyboardNav({
    tasks,
    selectedTaskId,
    expandedTaskId,
    onSelect: (taskId) => setSelectedTaskId(taskId),
    onExpand: (taskId) => {
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
      setSelectedTaskId(taskId);
    },
  });

  useHotkey(
    's',
    () => {
      if (selectedTaskId && !expandedTaskId) {
        setScheduleDatePickerTaskId(selectedTaskId);
      }
    },
    { ctrl: true },
  );

  const handleSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    setScheduleDatePickerTaskId(null);
  }, []);

  const handleExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedTaskId(taskId);
    setScheduleDatePickerTaskId(null);
  }, []);

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
      setSelectedTaskId(null);
    },
    [ops, onPermanentDelete],
  );

  if (loading) {
    return <TaskListSkeleton />;
  }

  if (boardData.sections.length === 0) {
    return (
      <div className="py-6 text-md text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <GroupedTaskList
      initial={boardData}
      onComplete={ops.complete}
      onSelect={handleSelect}
      onExpand={handleExpand}
      onReorder={ops.reorder}
      onMoveTask={handleMove}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onRestore={onRestore}
      onProjectChange={ops.changeProject}
      onTagAdd={ops.addTag}
      onTagRemove={ops.removeTag}
      selectedTaskId={selectedTaskId}
      expandedTaskId={expandedTaskId}
      scheduleDatePickerTaskId={scheduleDatePickerTaskId}
      onScheduleDatePickerClose={() => setScheduleDatePickerTaskId(null)}
      projects={activeProjects}
      areas={areas}
      checklistItems={checklistItems}
      tags={tags}
      hideToday={hideToday}
      showTodayStar={showTodayStar}
      isTrash={isTrash}
      onHeadingEdit={onHeadingEdit}
      onHeadingDelete={onHeadingDelete}
    />
  );
}
