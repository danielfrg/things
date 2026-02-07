import { createEffect, createSignal, on } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { TaskInfo } from "./data"

/**
 * Pending Changes Buffer for Optimistic UI
 *
 * This hook manages local task state that can differ from the global store.
 * It prevents tasks from "jumping" while the user is editing them.
 *
 * Use case: User is in Today view and changes task date to tomorrow.
 * Without buffering, the task would instantly disappear.
 * With buffering, the task stays visible until the user commits/blurs.
 *
 * Features:
 * - Maintains local copy of task that can diverge from props
 * - Only flushes changes to server on explicit commit or blur
 * - Auto-syncs when task ID changes (different task selected)
 * - Tracks which fields have pending changes
 */

export type PendingChanges = Partial<TaskInfo>

export function usePendingChanges(task: () => TaskInfo, onCommit: (id: string, changes: Partial<TaskInfo>) => void) {
  // Track pending changes that haven't been committed
  const [pending, setPending] = createStore<PendingChanges>({})
  const [hasPending, setHasPending] = createSignal(false)

  // Track the current task ID to detect when task changes
  let lastTaskId = task().id

  // Sync local state when task changes (e.g., different task selected)
  createEffect(
    on(
      () => task().id,
      (id) => {
        if (id !== lastTaskId) {
          // Different task - reset pending changes
          lastTaskId = id
          setPending(reconcile({}))
          setHasPending(false)
        }
      },
    ),
  )

  // Get the effective value (pending if exists, otherwise from task)
  const getValue = <K extends keyof TaskInfo>(key: K): TaskInfo[K] => {
    if (key in pending) {
      return pending[key] as TaskInfo[K]
    }
    return task()[key]
  }

  // Set a pending change (doesn't commit to server)
  const setPendingChange = <K extends keyof TaskInfo>(key: K, value: TaskInfo[K]) => {
    setPending(key, value as PendingChanges[K])
    setHasPending(true)
  }

  // Set multiple pending changes at once
  const setPendingChanges = (changes: Partial<TaskInfo>) => {
    for (const [key, value] of Object.entries(changes)) {
      setPending(key as keyof TaskInfo, value as PendingChanges[keyof TaskInfo])
    }
    setHasPending(true)
  }

  // Commit pending changes to server
  const commit = () => {
    if (!hasPending()) return

    const changes = { ...pending }
    onCommit(task().id, changes)

    // Clear pending changes after commit
    setPending(reconcile({}))
    setHasPending(false)
  }

  // Cancel pending changes (revert to server state)
  const cancel = () => {
    setPending(reconcile({}))
    setHasPending(false)
  }

  // Get the effective task with pending changes merged
  const effectiveTask = (): TaskInfo => {
    return { ...task(), ...pending }
  }

  // Check if a specific field has pending changes
  const isPending = <K extends keyof TaskInfo>(key: K): boolean => {
    return key in pending
  }

  return {
    // Read pending state
    pending,
    hasPending,

    // Get effective values
    getValue,
    effectiveTask,
    isPending,

    // Modify pending state
    setPendingChange,
    setPendingChanges,

    // Commit or cancel
    commit,
    cancel,
  }
}

/**
 * Simpler version for fields that should commit immediately
 * but with a debounce to avoid rapid updates
 */
export function useDebouncedUpdate(onUpdate: (id: string, changes: Partial<TaskInfo>) => void, delay = 300) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let pendingUpdates: { id: string; changes: Partial<TaskInfo> } | null = null

  const debouncedUpdate = (id: string, changes: Partial<TaskInfo>) => {
    pendingUpdates = { id, changes }

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      if (pendingUpdates) {
        onUpdate(pendingUpdates.id, pendingUpdates.changes)
        pendingUpdates = null
      }
      timeout = null
    }, delay)
  }

  const flush = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    if (pendingUpdates) {
      onUpdate(pendingUpdates.id, pendingUpdates.changes)
      pendingUpdates = null
    }
  }

  return {
    update: debouncedUpdate,
    flush,
  }
}

/**
 * Hook for managing "sticky" fields - fields that keep task visible
 * in current view until committed.
 *
 * Example: scheduledDate, status, projectId
 * These fields determine which view a task belongs to.
 * We want to buffer changes to these until user is done editing.
 */
export function useStickyFields(task: () => TaskInfo, onUpdate: (id: string, changes: Partial<TaskInfo>) => void) {
  // Fields that affect view membership
  const stickyFields: Array<keyof TaskInfo> = [
    "scheduledDate",
    "deadline",
    "status",
    "isSomeday",
    "listId",
    "headingId",
    "isEvening",
  ]

  const pendingChanges = usePendingChanges(task, onUpdate)

  // Update that checks if field is sticky
  const update = (changes: Partial<TaskInfo>) => {
    const sticky: Partial<TaskInfo> = {}
    const immediate: Partial<TaskInfo> = {}

    for (const [key, value] of Object.entries(changes)) {
      if (stickyFields.includes(key as keyof TaskInfo)) {
        ;(sticky as Record<string, unknown>)[key] = value
      } else {
        ;(immediate as Record<string, unknown>)[key] = value
      }
    }

    // Set sticky fields as pending
    if (Object.keys(sticky).length > 0) {
      pendingChanges.setPendingChanges(sticky)
    }

    // Commit immediate fields right away
    if (Object.keys(immediate).length > 0) {
      onUpdate(task().id, immediate)
    }
  }

  return {
    ...pendingChanges,
    update,
  }
}
