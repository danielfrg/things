import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskRecord } from '@/db/validation';

type TaskChanges = Partial<TaskRecord>;

export function usePendingTaskChanges(
  taskId: string,
  onCommit: (taskId: string, changes: TaskChanges) => void,
) {
  const [pending, setPending] = useState<TaskChanges>({});
  const pendingRef = useRef<TaskChanges>({});

  // Use ref to always have the latest callback without causing commit to recreate
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // Use ref for taskId too to avoid stale closures
  const taskIdRef = useRef(taskId);
  useEffect(() => {
    taskIdRef.current = taskId;
  }, [taskId]);

  const addChange = useCallback((changes: TaskChanges) => {
    setPending((prev: TaskChanges) => {
      const updated = { ...prev, ...changes };
      pendingRef.current = updated;
      return updated;
    });
  }, []);

  const commit = useCallback(() => {
    const current = pendingRef.current;
    if (Object.keys(current).length > 0) {
      onCommitRef.current(taskIdRef.current, current);
      setPending({});
      pendingRef.current = {};
    }
  }, []);

  const reset = useCallback(() => {
    setPending({});
    pendingRef.current = {};
  }, []);

  const hasPendingChanges = Object.keys(pending).length > 0;

  return {
    pending,
    addChange,
    commit,
    reset,
    hasPendingChanges,
  };
}
