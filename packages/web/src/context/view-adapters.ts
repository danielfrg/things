/**
 * View Adapters
 *
 * These are thin wrappers around TaskRepository that provide view-specific
 * interfaces. They maintain backward compatibility with existing page components
 * while eliminating the code duplication in the old view contexts.
 *
 * Usage:
 *   const data = useInboxView();
 *   data.tasks // Get inbox tasks
 *   data.updateTask(id, updates) // Update task
 *
 * All actual state management happens in TaskRepository.
 */

import { useTaskRepository } from "./task-repository"
import { useSDK } from "./sdk"

// ================== INBOX VIEW ==================

export function useInboxView() {
  const repo = useTaskRepository()
  repo.ensureView("inbox")

  return {
    get tasks() {
      return repo.inboxTasks
    },
    get loading() {
      return repo.loading.inbox
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    createTask: repo.createTask,
    updateTask: repo.updateTask,
    completeTask: repo.completeTask,
    cancelTask: repo.cancelTask,
    uncancelTask: repo.uncancelTask,
    reorderTask: async (id: string, newPosition: number) => {
      const tasks = [...repo.inboxTasks]
      const idx = tasks.findIndex((t) => t.id === id)
      if (idx === -1) return false
      const [task] = tasks.splice(idx, 1)
      if (task) tasks.splice(newPosition, 0, task)
      return repo.reorderTasks(
        tasks.map((t) => t.id),
        undefined,
        { type: "inbox" },
      )
    },
    refetch: repo.refetchInbox,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
    convertToRepeat: repo.convertToRepeat,
  }
}

// ================== TODAY VIEW ==================

export function useTodayView() {
  const repo = useTaskRepository()
  repo.ensureView("today")

  return {
    get sections() {
      return repo.todaySections
    },
    get loading() {
      return repo.loading.today
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    updateTask: repo.updateTask,
    completeTask: repo.completeTask,
    cancelTask: repo.cancelTask,
    uncancelTask: repo.uncancelTask,
    reorderTasks: repo.reorderTasks,
    moveTask: repo.moveTask,
    refetch: repo.refetchToday,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
    convertToRepeat: repo.convertToRepeat,
  }
}

// ================== UPCOMING VIEW ==================

export function useUpcomingView() {
  const repo = useTaskRepository()
  repo.ensureView("upcoming")

  return {
    get sections() {
      return repo.upcomingSections
    },
    get loading() {
      return repo.loading.upcoming
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    updateTask: repo.updateTask,
    completeTask: repo.completeTask,
    cancelTask: repo.cancelTask,
    uncancelTask: repo.uncancelTask,
    reorderTasks: repo.reorderTasks,
    moveTask: repo.moveTask,
    updateTemplate: repo.updateTemplate,
    deleteTemplate: repo.deleteTemplate,
    refetch: repo.refetchUpcoming,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
    convertToRepeat: repo.convertToRepeat,
  }
}

// ================== ANYTIME VIEW ==================

export function useAnytimeView() {
  const repo = useTaskRepository()
  repo.ensureView("anytime")

  return {
    get sections() {
      return repo.anytimeSections
    },
    get loading() {
      return repo.loading.anytime
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    updateTask: repo.updateTask,
    completeTask: repo.completeTask,
    cancelTask: repo.cancelTask,
    uncancelTask: repo.uncancelTask,
    reorderTasks: repo.reorderTasks,
    moveTask: repo.moveTask,
    refetch: repo.refetchAnytime,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
    convertToRepeat: repo.convertToRepeat,
  }
}

// ================== SOMEDAY VIEW ==================

export function useSomedayView() {
  const repo = useTaskRepository()
  repo.ensureView("someday")

  return {
    get sections() {
      return repo.somedaySections
    },
    get loading() {
      return repo.loading.someday
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    updateTask: repo.updateTask,
    completeTask: repo.completeTask,
    cancelTask: repo.cancelTask,
    uncancelTask: repo.uncancelTask,
    reorderTasks: repo.reorderTasks,
    moveTask: repo.moveTask,
    refetch: repo.refetchSomeday,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
    convertToRepeat: repo.convertToRepeat,
  }
}

// ================== LOGBOOK VIEW ==================

export function useLogbookView() {
  const repo = useTaskRepository()
  repo.ensureView("logbook")
  const sdk = useSDK()

  const logCompletedToday = async (): Promise<{ success: boolean; count: number }> => {
    const { data, error } = await sdk.client.postApiV1TasksLogCompleted()
    if (error) {
      console.error("[LogbookView] Failed to log completed tasks:", error)
      return { success: false, count: 0 }
    }
    // Refetch logbook to show updated data
    repo.refetchLogbook()
    // Also refetch today to remove the logged tasks from "completed today"
    repo.refetchToday()
    return { success: true, count: data?.count ?? 0 }
  }

  const restoreFromLogbook = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await sdk.client.postApiV1TasksByIdRestoreFromLogbook({ id })
    if (error) {
      // Check if it's the "project completed" error
      const errorMessage =
        typeof error === "object" && error !== null && "error" in error
          ? (error as { error: string }).error
          : "Failed to restore task"
      console.error("[LogbookView] Failed to restore task:", errorMessage)
      return { success: false, error: errorMessage }
    }
    // Refetch views
    repo.refetchLogbook()
    repo.refetchToday()
    repo.refetchAnytime()
    return { success: true }
  }

  return {
    get tasks() {
      return repo.logbookTasks
    },
    get loading() {
      return repo.loading.logbook
    },
    get error() {
      return repo.error
    },
    get taskTags() {
      return repo.taskTags
    },
    get checklistItems() {
      return repo.checklistItems
    },

    restoreFromLogbook,
    updateTask: repo.updateTask,
    logCompletedToday,
    refetch: repo.refetchLogbook,

    // Tags & Checklists
    fetchTaskTags: repo.fetchTaskTags,
    addTagToTask: repo.addTagToTask,
    removeTagFromTask: repo.removeTagFromTask,
    fetchChecklistItems: repo.fetchChecklistItems,
    createChecklistItem: repo.createChecklistItem,
    updateChecklistItem: repo.updateChecklistItem,
    deleteChecklistItem: repo.deleteChecklistItem,
    reorderChecklistItems: repo.reorderChecklistItems,
  }
}
