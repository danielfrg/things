import { useCallback } from 'react';
import { useBatchUpdateTasks } from '@/lib/contexts/DataContext';

interface UseBatchOperationsReturn {
  batchSetDate: (
    ids: string[],
    date: string | null,
    isEvening?: boolean,
  ) => void;
  batchMove: (
    ids: string[],
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  batchTrash: (ids: string[]) => void;
}

export function useBatchOperations(): UseBatchOperationsReturn {
  const batchUpdate = useBatchUpdateTasks();

  const batchSetDate = useCallback(
    (ids: string[], date: string | null, isEvening?: boolean) => {
      const updates = ids.map((id) => ({
        id,
        changes: {
          scheduledDate: date,
          status: date ? ('scheduled' as const) : ('anytime' as const),
          isEvening: isEvening ?? false,
        },
      }));
      batchUpdate.mutate(updates);
    },
    [batchUpdate],
  );

  const batchMove = useCallback(
    (ids: string[], projectId: string | null, areaId?: string | null) => {
      const updates = ids.map((id) => ({
        id,
        changes: {
          projectId,
          areaId: areaId ?? null,
          headingId: null,
        },
      }));
      batchUpdate.mutate(updates);
    },
    [batchUpdate],
  );

  const batchTrash = useCallback(
    (ids: string[]) => {
      const now = new Date();
      const updates = ids.map((id) => ({
        id,
        changes: {
          trashedAt: now,
        },
      }));
      batchUpdate.mutate(updates);
    },
    [batchUpdate],
  );

  return {
    batchSetDate,
    batchMove,
    batchTrash,
  };
}
