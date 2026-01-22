import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { InboxIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { TaskList } from '@/components/tasks/TaskList';
import type { TaskRecord } from '@/db/validation';
import {
  useAddTagToTask,
  useAreas,
  useChecklistItems,
  useCompleteTask,
  useProjects,
  useRemoveTagFromTask,
  useReorderTasks,
  useTags,
  useTasks,
  useTaskTags,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { useHotkey } from '@/lib/hooks/useHotkey';
import { useTaskKeyboardNav } from '@/lib/hooks/useTaskKeyboardNav';

export const Route = createFileRoute('/inbox')({
  component: InboxView,
});

function InboxView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);

  // Get resources from context
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: areas } = useAreas();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  useTaskTags();

  // Mutations
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const completeTask = useCompleteTask();
  const addTagToTask = useAddTagToTask();
  const removeTagFromTask = useRemoveTagFromTask();

  const inboxTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.trashedAt) return false;
        if (task.scheduledDate) return false;
        if (task.projectId) return false;
        if (task.areaId) return false;
        return task.status === 'inbox';
      })
      .sort((a, b) => a.position - b.position);
  }, [tasks]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    setScheduleDatePickerTaskId(null);
  }, []);

  const handleTaskExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedTaskId(taskId);
    setScheduleDatePickerTaskId(null);
  }, []);

  // Keyboard navigation
  useTaskKeyboardNav({
    tasks: inboxTasks,
    selectedTaskId,
    expandedTaskId,
    onSelect: handleTaskSelect,
    onExpand: handleTaskExpand,
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

  const handleTaskComplete = useCallback(
    (taskId: string, completed: boolean) => {
      completeTask.mutate(taskId, completed);
    },
    [completeTask],
  );

  const handleTaskReorder = useCallback(
    (taskIds: string[]) => {
      reorderTasks.mutate(taskIds);
    },
    [reorderTasks],
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<TaskRecord>) => {
      updateTask.mutate({ id: taskId, changes: updates });
    },
    [updateTask],
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      updateTask.mutate({ id: taskId, changes: { trashedAt: new Date() } });
      setExpandedTaskId(null);
      setSelectedTaskId(null);
    },
    [updateTask],
  );

  const handleProjectChange = useCallback(
    (taskId: string, projectId: string | null, areaId?: string | null) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          projectId,
          areaId: areaId ?? null,
          headingId: null,
        },
      });
    },
    [updateTask],
  );

  const handleTagAdd = useCallback(
    (taskId: string, tagId: string) => {
      addTagToTask.mutate({ taskId, tagId });
    },
    [addTagToTask],
  );

  const handleTagRemove = useCallback(
    (taskId: string, tagId: string) => {
      removeTagFromTask.mutate({ taskId, tagId });
    },
    [removeTagFromTask],
  );

  const isReady = !tasksLoading;

  return (
    <ViewContainer
      title="Inbox"
      icon={<InboxIcon className="w-6 h-6 text-things-blue" />}
      iconColor="text-things-blue"
      toolbar={
        <ViewToolbar>
          <NewTaskButton />
          <SearchButton />
        </ViewToolbar>
      }
    >
      {!isReady ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <TaskList
          tasks={inboxTasks}
          emptyMessage="Inbox is empty. Add a task to get started."
          selectedTaskId={selectedTaskId}
          expandedTaskId={expandedTaskId}
          scheduleDatePickerTaskId={scheduleDatePickerTaskId}
          onScheduleDatePickerClose={() => setScheduleDatePickerTaskId(null)}
          onTaskSelect={handleTaskSelect}
          onTaskExpand={handleTaskExpand}
          onTaskComplete={handleTaskComplete}
          onTaskReorder={handleTaskReorder}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onProjectChange={handleProjectChange}
          onTagAdd={handleTagAdd}
          onTagRemove={handleTagRemove}
          checklistItems={checklistItems}
          allTags={tags}
          projects={activeProjects}
          areas={areas}
        />
      )}
    </ViewContainer>
  );
}
