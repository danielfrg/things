import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/db/schema';
import type {
  ApiKeyRecord,
  AreaRecord,
  ChecklistItemRecord,
  HeadingRecord,
  InsertArea,
  InsertChecklistItem,
  InsertHeading,
  InsertProject,
  InsertTag,
  InsertTask,
  ProjectRecord,
  RepeatingRuleRecord,
  TagRecord,
  TaskRecord,
  TaskTagRecord,
  UpdateArea,
  UpdateChecklistItem,
  UpdateHeading,
  UpdateProject,
  UpdateTag,
  UpdateTask,
} from '@/db/validation';
import { createApiKey, deleteApiKey, getApiKeys } from '@/lib/server/apiKeys';
import {
  createArea,
  deleteArea,
  getAreas,
  updateArea,
} from '@/lib/server/areas';
import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItems,
  updateChecklistItem,
} from '@/lib/server/checklistItems';
import {
  createHeading,
  deleteHeading,
  getHeadings,
  updateHeading,
} from '@/lib/server/headings';
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from '@/lib/server/projects';
import {
  createRepeatingRuleFromTaskFn,
  getRepeatingRules,
  removeRepeatingRuleFn,
  updateRepeatingRuleFn,
} from '@/lib/server/repeatingRules';
import {
  addTagToTask,
  createTag,
  deleteTag,
  getTags,
  getTaskTags,
  removeTagFromTask,
  updateTag,
} from '@/lib/server/tags';
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '@/lib/server/tasks';
import type { UpdateRepeatingRuleInput } from '@/lib/services/repeatingRules';

// =============================================================================
// Initial Data Type (for SSR hydration)
// =============================================================================

export interface InitialData {
  tasks?: TaskRecord[];
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
  tags?: TagRecord[];
  taskTags?: TaskTagRecord[];
  headings?: HeadingRecord[];
  checklistItems?: ChecklistItemRecord[];
  apiKeys?: ApiKeyRecord[];
  repeatingRules?: RepeatingRuleRecord[];
}

// =============================================================================
// Query Keys
// =============================================================================

export const queryKeys = {
  tasks: ['tasks'] as const,
  projects: ['projects'] as const,
  areas: ['areas'] as const,
  tags: ['tags'] as const,
  taskTags: ['taskTags'] as const,
  headings: ['headings'] as const,
  checklistItems: ['checklistItems'] as const,
  apiKeys: ['apiKeys'] as const,
  repeatingRules: ['repeatingRules'] as const,
};

// =============================================================================
// Tasks
// =============================================================================

export function useTasksQuery(initialData?: TaskRecord[]) {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => getTasks(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTasks(initialData?: TaskRecord[]) {
  const query = useTasksQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertTask, 'userId'> & { id?: string }) =>
      createTask({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<TaskRecord[]>(queryKeys.tasks);
      const id = data.id ?? generateId();
      const now = new Date();
      const task: TaskRecord = {
        id,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        completedAt: null,
        trashedAt: null,
        canceledAt: null,
        status: data.status ?? 'inbox',
        type: data.type ?? 'task',
        title: data.title,
        notes: data.notes ?? null,
        scheduledDate: data.scheduledDate ?? null,
        deadline: data.deadline ?? null,
        isEvening: data.isEvening ?? false,
        position: data.position ?? 0,
        projectId: data.projectId ?? null,
        areaId: data.areaId ?? null,
        headingId: data.headingId ?? null,
        repeatingRuleId: data.repeatingRuleId ?? null,
      };
      queryClient.setQueryData<TaskRecord[]>(queryKeys.tasks, (old) => [
        ...(old ?? []),
        task,
      ]);
      return { previous, task };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateTask }) =>
      updateTask({ data: params }),
    onMutate: ({ id, changes }) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<TaskRecord[]>(queryKeys.tasks);
      queryClient.setQueryData<TaskRecord[]>(queryKeys.tasks, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, ...changes, updatedAt: new Date() } : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
  });
}

export function useBatchUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; changes: UpdateTask }[]) => {
      await Promise.all(updates.map((u) => updateTask({ data: u })));
    },
    onMutate: (updates) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<TaskRecord[]>(queryKeys.tasks);
      const now = new Date();
      const map = new Map(updates.map((u) => [u.id, u.changes] as const));

      queryClient.setQueryData<TaskRecord[]>(queryKeys.tasks, (old) => {
        if (!old) return old;
        return old.map((t) => {
          const changes = map.get(t.id);
          if (!changes) return t;
          return { ...t, ...changes, updatedAt: now };
        });
      });

      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<TaskRecord[]>(queryKeys.tasks);
      queryClient.setQueryData<TaskRecord[]>(queryKeys.tasks, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
  });
}

export function useCompleteTask() {
  const update = useUpdateTask();

  return {
    mutate: (id: string, completed: boolean) =>
      update.mutate({
        id,
        changes: {
          status: completed ? 'completed' : 'inbox',
          completedAt: completed ? new Date() : null,
        },
      }),
    mutateAsync: (id: string, completed: boolean) =>
      update.mutateAsync({
        id,
        changes: {
          status: completed ? 'completed' : 'inbox',
          completedAt: completed ? new Date() : null,
        },
      }),
  };
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(
        taskIds.map((id, index) =>
          updateTask({ data: { id, changes: { position: index + 1 } } }),
        ),
      );
    },
    onMutate: (taskIds) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<TaskRecord[]>(queryKeys.tasks);
      const now = new Date();
      const map = new Map(taskIds.map((id, idx) => [id, idx + 1]));

      // Optimistically update all positions in a single setQueryData call
      queryClient.setQueryData<TaskRecord[]>(queryKeys.tasks, (old) => {
        if (!old) return old;
        return old.map((t) => {
          const position = map.get(t.id);
          if (position === undefined) return t;
          if (t.position === position) return t;
          return { ...t, position, updatedAt: now };
        });
      });

      return { previous };
    },
    onError: (_err, _taskIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
  });
}

// =============================================================================
// Projects
// =============================================================================

export function useProjectsQuery(initialData?: ProjectRecord[]) {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => getProjects(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjects(initialData?: ProjectRecord[]) {
  const query = useProjectsQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertProject, 'userId'> & { id?: string }) =>
      createProject({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });
      await queryClient.cancelQueries({ queryKey: queryKeys.headings });

      const previousProjects = queryClient.getQueryData<ProjectRecord[]>(
        queryKeys.projects,
      );
      const previousHeadings = queryClient.getQueryData<HeadingRecord[]>(
        queryKeys.headings,
      );

      const projectId = data.id ?? generateId();
      const headingId = generateId();
      const now = new Date();

      // Optimistic project
      const project: ProjectRecord = {
        id: projectId,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        completedAt: data.completedAt ?? null,
        trashedAt: data.trashedAt ?? null,
        title: data.title,
        notes: data.notes ?? null,
        status: data.status ?? 'active',
        position: data.position ?? 0,
        areaId: data.areaId ?? null,
      };

      // Optimistic backlog heading
      const backlogHeading: HeadingRecord = {
        id: headingId,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        title: 'Backlog',
        projectId: projectId,
        position: 9999,
        isBacklog: true,
      };

      queryClient.setQueryData<ProjectRecord[]>(queryKeys.projects, (old) => [
        ...(old ?? []),
        project,
      ]);

      queryClient.setQueryData<HeadingRecord[]>(queryKeys.headings, (old) => [
        ...(old ?? []),
        backlogHeading,
      ]);

      return { previousProjects, previousHeadings, project, backlogHeading };
    },
    onError: (_err, _data, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects, context.previousProjects);
      }
      if (context?.previousHeadings) {
        queryClient.setQueryData(queryKeys.headings, context.previousHeadings);
      }
    },
    onSuccess: (result, _data, context) => {
      // Replace optimistic data with real server data
      if (result.project && context?.project) {
        queryClient.setQueryData<ProjectRecord[]>(queryKeys.projects, (old) =>
          (old ?? []).map((p) =>
            p.id === context.project.id ? result.project : p,
          ),
        );
      }
      if (result.backlogHeading && context?.backlogHeading) {
        queryClient.setQueryData<HeadingRecord[]>(queryKeys.headings, (old) =>
          (old ?? []).map((h) =>
            h.id === context.backlogHeading.id ? result.backlogHeading : h,
          ),
        );
      }
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateProject }) =>
      updateProject({ data: params }),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });
      const previous = queryClient.getQueryData<ProjectRecord[]>(
        queryKeys.projects,
      );
      queryClient.setQueryData<ProjectRecord[]>(queryKeys.projects, (old) =>
        (old ?? []).map((p) =>
          p.id === id ? { ...p, ...changes, updatedAt: new Date() } : p,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projects, context.previous);
      }
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });
      const previous = queryClient.getQueryData<ProjectRecord[]>(
        queryKeys.projects,
      );
      queryClient.setQueryData<ProjectRecord[]>(queryKeys.projects, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projects, context.previous);
      }
    },
  });
}

// =============================================================================
// Areas
// =============================================================================

export function useAreasQuery(initialData?: AreaRecord[]) {
  return useQuery({
    queryKey: queryKeys.areas,
    queryFn: () => getAreas(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAreas(initialData?: AreaRecord[]) {
  const query = useAreasQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertArea, 'userId'> & { id?: string }) =>
      createArea({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas });
      const previous = queryClient.getQueryData<AreaRecord[]>(queryKeys.areas);
      const id = data.id ?? generateId();
      const now = new Date();
      const area: AreaRecord = {
        id,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        title: data.title,
        position: data.position ?? 0,
      };
      queryClient.setQueryData<AreaRecord[]>(queryKeys.areas, (old) => [
        ...(old ?? []),
        area,
      ]);
      return { previous, area };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas, context.previous);
      }
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateArea }) =>
      updateArea({ data: params }),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas });
      const previous = queryClient.getQueryData<AreaRecord[]>(queryKeys.areas);
      queryClient.setQueryData<AreaRecord[]>(queryKeys.areas, (old) =>
        (old ?? []).map((a) =>
          a.id === id ? { ...a, ...changes, updatedAt: new Date() } : a,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas, context.previous);
      }
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArea({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas });
      const previous = queryClient.getQueryData<AreaRecord[]>(queryKeys.areas);
      queryClient.setQueryData<AreaRecord[]>(queryKeys.areas, (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas, context.previous);
      }
    },
  });
}

// =============================================================================
// Tags
// =============================================================================

export function useTagsQuery(initialData?: TagRecord[]) {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => getTags(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTags(initialData?: TagRecord[]) {
  const query = useTagsQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertTag, 'userId'> & { id?: string }) =>
      createTag({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tags });
      const previous = queryClient.getQueryData<TagRecord[]>(queryKeys.tags);
      const id = data.id ?? generateId();
      const now = new Date();
      const tag: TagRecord = {
        id,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        title: data.title,
        color: data.color ?? null,
        position: data.position ?? 0,
      };
      queryClient.setQueryData<TagRecord[]>(queryKeys.tags, (old) => [
        ...(old ?? []),
        tag,
      ]);
      return { previous, tag };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tags, context.previous);
      }
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateTag }) =>
      updateTag({ data: params }),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tags });
      const previous = queryClient.getQueryData<TagRecord[]>(queryKeys.tags);
      queryClient.setQueryData<TagRecord[]>(queryKeys.tags, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, ...changes, updatedAt: new Date() } : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tags, context.previous);
      }
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTag({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tags });
      const previous = queryClient.getQueryData<TagRecord[]>(queryKeys.tags);
      queryClient.setQueryData<TagRecord[]>(queryKeys.tags, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tags, context.previous);
      }
    },
  });
}

// =============================================================================
// TaskTags
// =============================================================================

export function useTaskTagsQuery(initialData?: TaskTagRecord[]) {
  return useQuery({
    queryKey: queryKeys.taskTags,
    queryFn: () => getTaskTags(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTaskTags(initialData?: TaskTagRecord[]) {
  const query = useTaskTagsQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAddTagToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; tagId: string }) =>
      addTagToTask({ data: params }),
    onMutate: async ({ taskId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.taskTags });
      const previous = queryClient.getQueryData<TaskTagRecord[]>(
        queryKeys.taskTags,
      );
      const now = new Date();
      const taskTag: TaskTagRecord = {
        id: generateId(),
        userId: '',
        taskId,
        tagId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      queryClient.setQueryData<TaskTagRecord[]>(queryKeys.taskTags, (old) => [
        ...(old ?? []),
        taskTag,
      ]);
      return { previous, taskId, tagId };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.taskTags, context.previous);
      }
    },
  });
}

export function useRemoveTagFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; tagId: string }) =>
      removeTagFromTask({ data: params }),
    onMutate: async ({ taskId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.taskTags });
      const previous = queryClient.getQueryData<TaskTagRecord[]>(
        queryKeys.taskTags,
      );
      queryClient.setQueryData<TaskTagRecord[]>(queryKeys.taskTags, (old) =>
        (old ?? []).filter(
          (tt) => !(tt.taskId === taskId && tt.tagId === tagId),
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.taskTags, context.previous);
      }
    },
  });
}

// =============================================================================
// Headings
// =============================================================================

export function useHeadingsQuery(initialData?: HeadingRecord[]) {
  return useQuery({
    queryKey: queryKeys.headings,
    queryFn: () => getHeadings(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useHeadings(initialData?: HeadingRecord[]) {
  const query = useHeadingsQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateHeading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertHeading, 'userId'> & { id?: string }) =>
      createHeading({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.headings });
      const previous = queryClient.getQueryData<HeadingRecord[]>(
        queryKeys.headings,
      );
      const id = data.id ?? generateId();
      const now = new Date();
      const heading: HeadingRecord = {
        id,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        title: data.title,
        projectId: data.projectId,
        position: data.position ?? 0,
        isBacklog: data.isBacklog ?? false,
      };
      queryClient.setQueryData<HeadingRecord[]>(queryKeys.headings, (old) => [
        ...(old ?? []),
        heading,
      ]);
      return { previous, heading };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.headings, context.previous);
      }
    },
  });
}

export function useUpdateHeading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateHeading }) =>
      updateHeading({ data: params }),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.headings });
      const previous = queryClient.getQueryData<HeadingRecord[]>(
        queryKeys.headings,
      );
      queryClient.setQueryData<HeadingRecord[]>(queryKeys.headings, (old) =>
        (old ?? []).map((h) =>
          h.id === id ? { ...h, ...changes, updatedAt: new Date() } : h,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.headings, context.previous);
      }
    },
  });
}

export function useDeleteHeading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteHeading({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.headings });
      const previous = queryClient.getQueryData<HeadingRecord[]>(
        queryKeys.headings,
      );
      queryClient.setQueryData<HeadingRecord[]>(queryKeys.headings, (old) =>
        (old ?? []).filter((h) => h.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.headings, context.previous);
      }
    },
  });
}

// =============================================================================
// ChecklistItems
// =============================================================================

export function useChecklistItemsQuery(initialData?: ChecklistItemRecord[]) {
  return useQuery({
    queryKey: queryKeys.checklistItems,
    queryFn: () => getChecklistItems(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useChecklistItems(initialData?: ChecklistItemRecord[]) {
  const query = useChecklistItemsQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertChecklistItem, 'userId'> & { id?: string }) =>
      createChecklistItem({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.checklistItems });
      const previous = queryClient.getQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
      );
      const id = data.id ?? generateId();
      const now = new Date();
      const item: ChecklistItemRecord = {
        ...data,
        id,
        userId: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        title: data.title,
        taskId: data.taskId,
        completed: data.completed ?? false,
        position: data.position ?? 0,
      };
      queryClient.setQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
        (old) => [...(old ?? []), item],
      );
      return { previous, item };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.checklistItems, context.previous);
      }
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; changes: UpdateChecklistItem }) =>
      updateChecklistItem({ data: params }),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.checklistItems });
      const previous = queryClient.getQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
      );
      queryClient.setQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
        (old) =>
          (old ?? []).map((c) =>
            c.id === id ? { ...c, ...changes, updatedAt: new Date() } : c,
          ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.checklistItems, context.previous);
      }
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChecklistItem({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.checklistItems });
      const previous = queryClient.getQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
      );
      queryClient.setQueryData<ChecklistItemRecord[]>(
        queryKeys.checklistItems,
        (old) => (old ?? []).filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.checklistItems, context.previous);
      }
    },
  });
}

// =============================================================================
// API Keys
// =============================================================================

export function useApiKeysQuery(initialData?: ApiKeyRecord[]) {
  return useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: () => getApiKeys(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApiKeys(initialData?: ApiKeyRecord[]) {
  const query = useApiKeysQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; scope: 'read' | 'read-write' }) =>
      createApiKey({ data }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) => deleteApiKey({ data: { keyId } }),
    onMutate: async (keyId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.apiKeys });
      const previous = queryClient.getQueryData<ApiKeyRecord[]>(
        queryKeys.apiKeys,
      );
      queryClient.setQueryData<ApiKeyRecord[]>(queryKeys.apiKeys, (old) =>
        (old ?? []).filter((a) => a.id !== keyId),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.apiKeys, context.previous);
      }
    },
  });
}

// =============================================================================
// Repeating Rules
// =============================================================================

export function useRepeatingRulesQuery(initialData?: RepeatingRuleRecord[]) {
  return useQuery({
    queryKey: queryKeys.repeatingRules,
    queryFn: () => getRepeatingRules(),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRepeatingRules(initialData?: RepeatingRuleRecord[]) {
  const query = useRepeatingRulesQuery(initialData);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateRepeatingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; rrule: string; startDate: string }) =>
      createRepeatingRuleFromTaskFn({ data }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repeatingRules });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useUpdateRepeatingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; updates: UpdateRepeatingRuleInput }) =>
      updateRepeatingRuleFn({ data: params }),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.repeatingRules });
      const previous = queryClient.getQueryData<RepeatingRuleRecord[]>(
        queryKeys.repeatingRules,
      );
      queryClient.setQueryData<RepeatingRuleRecord[]>(
        queryKeys.repeatingRules,
        (old) =>
          (old ?? []).map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r,
          ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.repeatingRules, context.previous);
      }
    },
  });
}

export function useDeleteRepeatingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeRepeatingRuleFn({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.repeatingRules });
      const previous = queryClient.getQueryData<RepeatingRuleRecord[]>(
        queryKeys.repeatingRules,
      );
      queryClient.setQueryData<RepeatingRuleRecord[]>(
        queryKeys.repeatingRules,
        (old) => (old ?? []).filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.repeatingRules, context.previous);
      }
    },
  });
}
