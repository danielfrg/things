import { useCallback } from 'react';
import type { TaskMoveInfo } from '@/components/board';
import type { ProjectRecord, TaskRecord } from '@/db/validation';
import {
  useAddTagToTask,
  useRemoveTagFromTask,
  useReorderTasks,
  useUpdateTask,
} from '@/lib/contexts/DataContext';

type TaskStatus = 'inbox' | 'scheduled' | 'anytime' | 'someday' | 'completed';

interface TaskOperationsOptions {
  uncompleteStatus?: TaskStatus;
}

export function useTaskOperations(options: TaskOperationsOptions = {}) {
  const { uncompleteStatus = 'anytime' } = options;

  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const addTagToTask = useAddTagToTask();
  const removeTagFromTask = useRemoveTagFromTask();

  const complete = useCallback(
    (taskId: string, completed: boolean) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          status: completed ? 'completed' : uncompleteStatus,
          completedAt: completed ? new Date() : null,
        },
      });
    },
    [updateTask, uncompleteStatus],
  );

  const update = useCallback(
    (taskId: string, updates: Partial<TaskRecord>) => {
      updateTask.mutate({ id: taskId, changes: updates });
    },
    [updateTask],
  );

  const trash = useCallback(
    (taskId: string) => {
      updateTask.mutate({ id: taskId, changes: { trashedAt: new Date() } });
    },
    [updateTask],
  );

  const reorder = useCallback(
    (taskIds: string[]) => {
      reorderTasks.mutate(taskIds);
    },
    [reorderTasks],
  );

  const move = useCallback(
    (info: TaskMoveInfo, projects: ProjectRecord[]) => {
      const { taskId, toSection, newTaskIds } = info;
      const changes: Record<string, unknown> = {};

      if (toSection.isEvening !== undefined) {
        changes.isEvening = toSection.isEvening;
      }

      if (toSection.projectId) {
        const project = projects.find((p) => p.id === toSection.projectId);
        changes.projectId = toSection.projectId;
        changes.areaId = project?.areaId ?? null;
      } else if (toSection.id === 'section:no-project') {
        changes.projectId = null;
        changes.areaId = null;
      } else if (toSection.id.startsWith('section:area:')) {
        const areaId = toSection.id.replace('section:area:', '');
        changes.projectId = null;
        changes.areaId = areaId;
      }

      updateTask.mutate({ id: taskId, changes });
      reorderTasks.mutate(newTaskIds);
    },
    [updateTask, reorderTasks],
  );

  const changeProject = useCallback(
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

  const addTag = useCallback(
    (taskId: string, tagId: string) => {
      addTagToTask.mutate({ taskId, tagId });
    },
    [addTagToTask],
  );

  const removeTag = useCallback(
    (taskId: string, tagId: string) => {
      removeTagFromTask.mutate({ taskId, tagId });
    },
    [removeTagFromTask],
  );

  return {
    complete,
    update,
    trash,
    reorder,
    move,
    changeProject,
    addTag,
    removeTag,
  };
}
