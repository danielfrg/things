import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { type InitialData, queryKeys } from '@/lib/hooks/useData';

// Re-export hooks from useData
export {
  useAddTagToTask,
  useApiKeys,
  useAreas,
  useBatchUpdateTasks,
  useChecklistItems,
  useCompleteTask,
  useCreateApiKey,
  useCreateArea,
  useCreateChecklistItem,
  useCreateHeading,
  useCreateProject,
  useCreateRepeatingRule,
  useCreateTag,
  useCreateTask,
  useDeleteApiKey,
  useDeleteArea,
  useDeleteChecklistItem,
  useDeleteHeading,
  useDeleteProject,
  useDeleteRepeatingRule,
  useDeleteTag,
  useDeleteTask,
  useHeadings,
  useProjects,
  useRemoveTagFromTask,
  useReorderTasks,
  useRepeatingRules,
  useTags,
  useTasks,
  useTaskTags,
  useUpdateArea,
  useUpdateChecklistItem,
  useUpdateHeading,
  useUpdateProject,
  useUpdateRepeatingRule,
  useUpdateTag,
  useUpdateTask,
} from '@/lib/hooks/useData';

// Re-export InitialData type
export type { InitialData };

function createQueryClient(initialData?: InitialData): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  });

  // Prime the cache with initial data
  if (initialData) {
    if (initialData.tasks) {
      client.setQueryData(queryKeys.tasks, initialData.tasks);
    }
    if (initialData.projects) {
      client.setQueryData(queryKeys.projects, initialData.projects);
    }
    if (initialData.areas) {
      client.setQueryData(queryKeys.areas, initialData.areas);
    }
    if (initialData.tags) {
      client.setQueryData(queryKeys.tags, initialData.tags);
    }
    if (initialData.taskTags) {
      client.setQueryData(queryKeys.taskTags, initialData.taskTags);
    }
    if (initialData.headings) {
      client.setQueryData(queryKeys.headings, initialData.headings);
    }
    if (initialData.checklistItems) {
      client.setQueryData(queryKeys.checklistItems, initialData.checklistItems);
    }
    if (initialData.apiKeys) {
      client.setQueryData(queryKeys.apiKeys, initialData.apiKeys);
    }
    if (initialData.repeatingRules) {
      client.setQueryData(queryKeys.repeatingRules, initialData.repeatingRules);
    }
  }

  return client;
}

interface DataProviderProps {
  children: ReactNode;
  initialData?: InitialData;
}

export function DataProvider({ children, initialData }: DataProviderProps) {
  // Create QueryClient per provider instance to prevent SSR data leakage
  const [queryClient] = useState(() => createQueryClient(initialData));

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
