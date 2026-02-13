import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { Section } from "@/components/tasks/types"
import { formatLocalDate, parseLocalDate } from "@/lib/utils"
import { createSimpleContext } from "./context"
import { useEvent } from "./event"
import { useSDK } from "./sdk"

import type { ChecklistItemInfo, TaskInfo, TaskTagInfo, TemplateInfo } from "./data"

/**
 * TaskRepository - Centralized store for all task-related data.
 *
 * This context provides:
 * - Normalized task storage (Record<string, TaskInfo>)
 * - Centralized SSE event handling
 * - All task mutations (update, complete, reorder, move)
 * - Tag and checklist management
 * - View-specific data via selectors
 *
 * Views use createMemo selectors to derive their data from this store.
 */

type TaskStore = {
  // Normalized task storage - single source of truth
  tasks: Record<string, TaskInfo>
  // Tags per task
  taskTags: Record<string, TaskTagInfo[]>
  // Checklist items per task
  checklistItems: Record<string, ChecklistItemInfo[]>
  // View sections (cached from server for proper grouping)
  viewSections: {
    inbox: Section[]
    today: Section[]
    upcoming: Section[]
    anytime: Section[]
    someday: Section[]
    logbook: Section[]
  }
  // Templates for upcoming view
  templates: Record<string, TemplateInfo>
  // Loading states
  loading: {
    inbox: boolean
    today: boolean
    upcoming: boolean
    anytime: boolean
    someday: boolean
    logbook: boolean
  }
  // Errors
  error: string | undefined
}

export const { use: useTaskRepository, provider: TaskRepositoryProvider } = createSimpleContext({
  name: "TaskRepository",
  init: () => {
    const sdk = useSDK()
    const event = useEvent()

    const [store, setStore] = createStore<TaskStore>({
      tasks: {},
      taskTags: {},
      checklistItems: {},
      viewSections: {
        inbox: [],
        today: [],
        upcoming: [],
        anytime: [],
        someday: [],
        logbook: [],
      },
      templates: {},
      loading: {
        inbox: true,
        today: true,
        upcoming: true,
        anytime: true,
        someday: true,
        logbook: true,
      },
      error: undefined,
    })

    // Track which views have been fetched at least once (for lazy loading)
    const fetched = new Set<keyof TaskStore["viewSections"]>()

    // Debounce helper for SSE events
    const createDebouncer = (fn: () => void, delay = 300) => {
      let timeout: ReturnType<typeof setTimeout> | null = null
      let pending = false

      return () => {
        if (timeout) {
          pending = true
          return
        }

        fn()

        timeout = setTimeout(() => {
          timeout = null
          if (pending) {
            pending = false
            fn()
          }
        }, delay)
      }
    }

    // ================== VIEW FETCHERS ==================

    const fetchInbox = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "inbox", false)
        return
      }

      fetched.add("inbox")
      if (showLoading) setStore("loading", "inbox", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsInbox()
      if (error) {
        setStore("error", `Failed to fetch inbox: ${error}`)
        setStore("loading", "inbox", false)
        return
      }

      const sections = data?.sections ?? []
      setStore("viewSections", "inbox", reconcile(sections as any))

      // Normalize tasks into store
      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
      }

      setStore("loading", "inbox", false)
    }

    const fetchToday = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "today", false)
        return
      }

      fetched.add("today")
      if (showLoading) setStore("loading", "today", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsToday()
      if (error) {
        setStore("error", `Failed to fetch today: ${error}`)
        setStore("loading", "today", false)
        return
      }

      const sections = data?.sections ?? []
      setStore("viewSections", "today", reconcile(sections as any))

      // Normalize tasks
      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
      }

      setStore("loading", "today", false)
    }

    const fetchUpcoming = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "upcoming", false)
        return
      }

      fetched.add("upcoming")
      if (showLoading) setStore("loading", "upcoming", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsUpcoming()
      if (error) {
        setStore("error", `Failed to fetch upcoming: ${error}`)
        setStore("loading", "upcoming", false)
        return
      }

      // Convert days to sections format
      const sections: Section[] = ((data?.days ?? []) as any[]).map(
        (day: {
          id: string
          label: string
          tasks: TaskInfo[]
          templates: TemplateInfo[]
          date: string | null
          isLater?: boolean
        }) => ({
          id: day.id,
          title: day.label,
          tasks: day.tasks,
          templates: day.templates ?? [],
          dateStr: day.date ?? undefined,
          isLater: day.isLater ?? false,
        }),
      )
      setStore("viewSections", "upcoming", reconcile(sections))

      // Normalize tasks and templates
      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
        for (const template of section.templates ?? []) {
          setStore("templates", template.id, template)
        }
      }

      setStore("loading", "upcoming", false)
    }

    const fetchAnytime = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "anytime", false)
        return
      }

      fetched.add("anytime")
      if (showLoading) setStore("loading", "anytime", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsAnytime()
      if (error) {
        setStore("error", `Failed to fetch anytime: ${error}`)
        setStore("loading", "anytime", false)
        return
      }

      const sections = data?.sections ?? []
      setStore("viewSections", "anytime", reconcile(sections as any))

      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
      }

      setStore("loading", "anytime", false)
    }

    const fetchSomeday = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "someday", false)
        return
      }

      fetched.add("someday")
      if (showLoading) setStore("loading", "someday", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsSomeday()
      if (error) {
        setStore("error", `Failed to fetch someday: ${error}`)
        setStore("loading", "someday", false)
        return
      }

      const sections = data?.sections ?? []
      setStore("viewSections", "someday", reconcile(sections as any))

      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
      }

      setStore("loading", "someday", false)
    }

    const fetchLogbook = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", "logbook", false)
        return
      }

      fetched.add("logbook")
      if (showLoading) setStore("loading", "logbook", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsLogbook()
      if (error) {
        setStore("error", `Failed to fetch logbook: ${error}`)
        setStore("loading", "logbook", false)
        return
      }

      const sections = data?.sections ?? []
      setStore("viewSections", "logbook", reconcile(sections as any))

      for (const section of sections) {
        for (const task of section.tasks) {
          setStore("tasks", task.id, task)
        }
      }

      setStore("loading", "logbook", false)
    }

    // Debounced fetchers for SSE events
    const debouncedFetchInbox = createDebouncer(() => fetchInbox())
    const debouncedFetchToday = createDebouncer(() => fetchToday())
    const debouncedFetchUpcoming = createDebouncer(() => fetchUpcoming())
    const debouncedFetchAnytime = createDebouncer(() => fetchAnytime())
    const debouncedFetchSomeday = createDebouncer(() => fetchSomeday())
    const debouncedFetchLogbook = createDebouncer(() => fetchLogbook())

    // ================== VIEW FILTERS ==================

    const belongsInInbox = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      // Inbox = status is null (unprocessed)
      return task.status === null
    }

    const belongsInToday = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false

      const todayStr = formatLocalDate(new Date())
      const todayDate = parseLocalDate(todayStr)

      // Completed today
      if (task.status === "completed") {
        if (!task.completedAt) return false
        const completedDate = new Date(task.completedAt)
        const completedStr = formatLocalDate(completedDate)
        return completedStr === todayStr
      }

      // Scheduled for today or overdue
      if (task.scheduledDate) {
        const scheduled = parseLocalDate(task.scheduledDate)
        if (scheduled <= todayDate) return true
      }

      // Deadline is today or overdue
      if (task.deadline) {
        const deadline = parseLocalDate(task.deadline)
        if (deadline <= todayDate) return true
      }

      return false
    }

    const belongsInUpcoming = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      if (!task.scheduledDate && !task.deadline) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const dateStr = task.scheduledDate || task.deadline
      if (!dateStr) return false

      const [year, month, day] = dateStr.split("-").map(Number)
      const taskDate = new Date(year, month - 1, day)

      return taskDate >= tomorrow
    }

    const belongsInAnytime = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      // Anytime = active, not someday, unscheduled
      // Includes both organized (project/area) and unorganized tasks
      return task.status === "active" && !task.isSomeday && !task.scheduledDate
    }

    const belongsInSomeday = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      // Someday = active, isSomeday flag is true, unscheduled
      return task.status === "active" && task.isSomeday && !task.scheduledDate
    }

    // ================== SSE EVENT HANDLERS ==================

    const handleTaskCreated = (task: TaskInfo) => {
      // Add to normalized store
      setStore("tasks", task.id, task)

      // Trigger appropriate view refetches (only for loaded views)
      if (belongsInInbox(task)) refetchIfLoaded("inbox")
      if (belongsInToday(task)) refetchIfLoaded("today")
      if (belongsInUpcoming(task)) refetchIfLoaded("upcoming")
      if (belongsInAnytime(task)) refetchIfLoaded("anytime")
      if (belongsInSomeday(task)) refetchIfLoaded("someday")
    }

    // Helper: only refetch a view if it has been loaded at least once
    const refetchIfLoaded = (view: keyof TaskStore["viewSections"]) => {
      if (!fetched.has(view)) return
      const refetchers: Record<keyof TaskStore["viewSections"], () => void> = {
        inbox: debouncedFetchInbox,
        today: debouncedFetchToday,
        upcoming: debouncedFetchUpcoming,
        anytime: debouncedFetchAnytime,
        someday: debouncedFetchSomeday,
        logbook: debouncedFetchLogbook,
      }
      refetchers[view]()
    }

    const handleTaskUpdated = (task: TaskInfo) => {
      // Capture previous state before overwriting
      const previous = store.tasks[task.id]

      // Update normalized store, preserving existing tags
      setStore("tasks", task.id, (existing) => ({
        ...task,
        tags: task.tags ?? existing?.tags,
      }))

      // Update in all view sections, preserving existing tags
      const updateInSections = (viewKey: keyof TaskStore["viewSections"]) => {
        setStore("viewSections", viewKey, (sections) =>
          sections.map((section) => ({
            ...section,
            tasks: section.tasks
              .map((t) => (t.id === task.id ? { ...task, tags: task.tags ?? t.tags, position: t.position } : t))
              .sort((a, b) => a.position - b.position),
          })),
        )
      }

      // Optimistic in-place update in loaded views
      if (fetched.has("inbox")) updateInSections("inbox")
      if (fetched.has("today")) updateInSections("today")
      if (fetched.has("upcoming")) updateInSections("upcoming")
      if (fetched.has("anytime")) updateInSections("anytime")
      if (fetched.has("someday")) updateInSections("someday")
      if (fetched.has("logbook")) updateInSections("logbook")

      // Targeted refetch: only views the task belongs to now or previously belonged to
      const views = ["inbox", "today", "upcoming", "anytime", "someday"] as const
      const belongs: Record<string, (t: TaskInfo) => boolean> = {
        inbox: belongsInInbox,
        today: belongsInToday,
        upcoming: belongsInUpcoming,
        anytime: belongsInAnytime,
        someday: belongsInSomeday,
      }

      for (const view of views) {
        const now = belongs[view]!(task)
        const before = previous ? belongs[view]!(previous) : false
        if (now || before) refetchIfLoaded(view)
      }
    }

    const handleTaskDeleted = ({ id }: { id: string }) => {
      // Remove from normalized store
      setStore("tasks", id, undefined as unknown as TaskInfo)

      // Remove from all view sections
      const removeFromSections = (viewKey: keyof TaskStore["viewSections"]) => {
        setStore("viewSections", viewKey, (sections) =>
          sections.map((section) => ({
            ...section,
            tasks: section.tasks.filter((t) => t.id !== id),
          })),
        )
      }

      removeFromSections("inbox")
      removeFromSections("today")
      removeFromSections("upcoming")
      removeFromSections("anytime")
      removeFromSections("someday")
      removeFromSections("logbook")
    }

    const handleTasksReordered = ({
      contextType,
      contextId,
      taskIds,
    }: {
      contextType: string
      contextId: string | null
      taskIds: string[]
    }) => {
      // Map context type to view key
      const contextToView: Record<string, keyof TaskStore["viewSections"]> = {
        inbox: "inbox",
        today: "today",
        upcoming: "upcoming",
        anytime: "anytime",
        someday: "someday",
        logbook: "logbook",
      }

      const viewKey = contextToView[contextType]
      if (!viewKey) {
        // For project/area contexts, just refetch the relevant views
        debouncedFetchAnytime()
        debouncedFetchSomeday()
        return
      }

      // Reorder tasks in the matching view
      setStore("viewSections", viewKey, (sections) => {
        // For views with a single flat section (inbox, logbook), or date-based sections (upcoming)
        return sections.map((section) => {
          // For upcoming, only reorder the section with matching date
          if (viewKey === "upcoming" && section.dateStr !== contextId) {
            return section
          }

          // Build task map from current section
          const taskMap = new Map(section.tasks.map((t) => [t.id, t]))

          // Reorder based on taskIds, keeping only tasks that exist in this section
          const reordered = taskIds
            .map((id, index) => {
              const task = taskMap.get(id)
              return task ? { ...task, position: index } : undefined
            })
            .filter((t): t is TaskInfo => t !== undefined)

          // If no tasks matched, return section unchanged
          if (reordered.length === 0) {
            return section
          }

          return { ...section, tasks: reordered }
        })
      })
    }

    const handleTaskMoved = ({
      task,
      fromSectionId,
      toSectionId,
      newTaskIds,
      contextType,
    }: {
      task: TaskInfo
      fromSectionId: string
      toSectionId: string
      newTaskIds: string[]
      contextType?: "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook"
      contextId?: string | null
    }) => {
      // Update normalized store with the moved task's new data
      setStore("tasks", task.id, task)

      // Helper to apply move to a view's sections
      const applyMoveToSections = (sections: Section[]): Section[] => {
        return sections.map((section) => {
          if (section.id === fromSectionId) {
            // Remove task from source section
            return {
              ...section,
              tasks: section.tasks.filter((t) => t.id !== task.id),
            }
          }

          if (section.id === toSectionId) {
            // Add task to destination section and reorder
            const taskMap = new Map(section.tasks.map((t) => [t.id, t]))
            taskMap.set(task.id, task)

            const reordered = newTaskIds
              .map((id, index) => {
                const t = taskMap.get(id)
                return t ? { ...t, position: index } : undefined
              })
              .filter((t): t is TaskInfo => t !== undefined)

            return { ...section, tasks: reordered }
          }

          return section
        })
      }

      // Apply to the appropriate view based on context type
      const viewKey = contextType ?? "today"
      if (
        viewKey === "inbox" ||
        viewKey === "today" ||
        viewKey === "upcoming" ||
        viewKey === "anytime" ||
        viewKey === "someday" ||
        viewKey === "logbook"
      ) {
        setStore("viewSections", viewKey, applyMoveToSections)
      }
    }

    const handleTemplateUpdated = (template: TemplateInfo) => {
      setStore("templates", template.id, template)
      // Refetch upcoming to get proper section placement
      debouncedFetchUpcoming()
    }

    const handleTemplateDeleted = ({ id }: { id: string }) => {
      setStore("templates", id, undefined as unknown as TemplateInfo)
      setStore("viewSections", "upcoming", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: (section.templates ?? []).filter((t) => t.id !== id),
        })),
      )
    }

    // Subscribe to SSE events
    const unsubCreate = event.on("task.created", handleTaskCreated)
    const unsubUpdate = event.on("task.updated", handleTaskUpdated)
    const unsubDelete = event.on("task.deleted", handleTaskDeleted)
    const unsubReorder = event.on("tasks.reordered", handleTasksReordered)
    const unsubMove = event.on("task.moved", handleTaskMoved)
    const unsubRuleCreate = event.on("repeatingRule.created", () => debouncedFetchUpcoming())
    const unsubRuleUpdate = event.on("repeatingRule.updated", handleTemplateUpdated)
    const unsubRuleDelete = event.on("repeatingRule.deleted", handleTemplateDeleted)

    // On SSE reconnect, refetch all loaded views to catch up on missed events
    const unsubReconnect = event.on("server.reconnected", () => {
      refetchIfLoaded("inbox")
      refetchIfLoaded("today")
      refetchIfLoaded("upcoming")
      refetchIfLoaded("anytime")
      refetchIfLoaded("someday")
      refetchIfLoaded("logbook")
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubReorder()
      unsubMove()
      unsubRuleCreate()
      unsubRuleUpdate()
      unsubRuleDelete()
      unsubReconnect()
    })

    // Initial fetch - only load today (default route) and inbox (needed for sidebar badge)
    // Other views are lazy-loaded on first access via ensureView()
    createEffect(() => {
      if (sdk.isReady) {
        fetchToday(true)
        fetchInbox(true)
      }
    })

    // Lazy-load a view on first access
    type ViewKey = keyof TaskStore["viewSections"]
    const fetchers: Record<ViewKey, (showLoading?: boolean) => Promise<void>> = {
      inbox: fetchInbox,
      today: fetchToday,
      upcoming: fetchUpcoming,
      anytime: fetchAnytime,
      someday: fetchSomeday,
      logbook: fetchLogbook,
    }

    const ensureView = (view: ViewKey) => {
      if (!fetched.has(view) && sdk.isReady) {
        fetched.add(view)
        fetchers[view](true)
      }
    }

    // ================== MUTATIONS ==================

    const updateTask = async (id: string, updates: Partial<TaskInfo>) => {
      setStore("error", undefined)

      // Get current task for rollback
      const current = store.tasks[id]

      // Optimistic update to normalized store
      if (updates.trashedAt) {
        // Remove from all views when trashing
        handleTaskDeleted({ id })
      } else if (current) {
        setStore("tasks", id, { ...current, ...updates })
        // Also update in view sections
        handleTaskUpdated({ ...current, ...updates })
      }

      const { data, error } = await sdk.client.putApiV1TasksById({
        id,
        updateTask: {
          title: updates.title,
          notes: updates.notes,
          status: updates.status as "active" | "completed" | "trashed" | null | undefined,
          scheduledDate: updates.scheduledDate,
          deadline: updates.deadline,
          listId: updates.listId,
          headingId: updates.headingId,
          isEvening: updates.isEvening,
          isSomeday: updates.isSomeday,
          trashedAt: updates.trashedAt,
        },
      })

      if (error) {
        // Revert on error
        if (current) {
          setStore("tasks", id, current)
        }
        setStore("error", `Failed to update task: ${error}`)
        // Refetch affected loaded views to restore correct state
        refetchIfLoaded("inbox")
        refetchIfLoaded("today")
        refetchIfLoaded("upcoming")
        refetchIfLoaded("anytime")
        refetchIfLoaded("someday")
        return null
      }

      return data
    }

    const completeTask = async (id: string, completed: boolean) => {
      setStore("error", undefined)

      const current = store.tasks[id]
      const optimistic = {
        ...current,
        completedAt: completed ? new Date().toISOString() : null,
      }

      // Optimistic update
      if (current) {
        setStore("tasks", id, optimistic)
        handleTaskUpdated(optimistic)
      }

      const { data, error } = await sdk.client.postApiV1TasksByIdComplete({
        id,
        completeTask: {
          completed,
        },
      })

      if (error) {
        if (current) {
          setStore("tasks", id, current)
        }
        setStore("error", `Failed to complete task: ${error}`)
        return null
      }

      return data
    }

    const cancelTask = async (id: string) => {
      setStore("error", undefined)

      const current = store.tasks[id]
      const optimistic: TaskInfo = {
        ...current!,
        status: "cancelled",
        completedAt: new Date().toISOString(),
      }

      // Optimistic update
      if (current) {
        setStore("tasks", id, optimistic)
        handleTaskUpdated(optimistic)
      }

      const { data, error } = await sdk.client.putApiV1TasksById({
        id,
        updateTask: {
          status: "cancelled",
        },
      })

      if (error) {
        if (current) {
          setStore("tasks", id, current)
          handleTaskUpdated(current)
        }
        setStore("error", `Failed to cancel task: ${error}`)
        return null
      }

      return data
    }

    const uncancelTask = async (id: string) => {
      setStore("error", undefined)

      const current = store.tasks[id]
      const optimistic: TaskInfo = {
        ...current!,
        status: "active",
        completedAt: null,
      }

      // Optimistic update
      if (current) {
        setStore("tasks", id, optimistic)
        handleTaskUpdated(optimistic)
      }

      const { data, error } = await sdk.client.putApiV1TasksById({
        id,
        updateTask: {
          status: "active",
        },
      })

      if (error) {
        if (current) {
          setStore("tasks", id, current)
          handleTaskUpdated(current)
        }
        setStore("error", `Failed to uncancel task: ${error}`)
        return null
      }

      return data
    }

    const reorderTasks = async (
      taskIds: string[],
      sectionId?: string,
      explicitContext?: { type: "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook"; id?: string },
    ) => {
      // Use explicit context if provided, otherwise determine from section
      let contextType: "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook" | undefined =
        explicitContext?.type
      let contextId: string | undefined = explicitContext?.id

      // Optimistic reorder within a specific view section
      if (sectionId) {
        // If we have an explicit context type, only search that view
        // Otherwise search all views (for backwards compatibility)
        const viewsToSearch: Array<keyof TaskStore["viewSections"]> = contextType
          ? [contextType]
          : (Object.keys(store.viewSections) as Array<keyof TaskStore["viewSections"]>)

        for (const viewKey of viewsToSearch) {
          const sections = store.viewSections[viewKey]
          const sectionIdx = sections.findIndex((s) => s.id === sectionId)
          if (sectionIdx !== -1) {
            // Found the section - set contextType if not already set
            if (!contextType) {
              contextType = viewKey
            }

            // For upcoming view, extract dateStr as contextId if not already set
            if (viewKey === "upcoming" && !contextId) {
              const section = sections[sectionIdx]
              if (section?.dateStr) {
                contextId = section.dateStr
              }
            }

            // Apply optimistic update
            setStore("viewSections", viewKey, sectionIdx, "tasks", (tasks) => {
              const taskMap = new Map(tasks.map((t) => [t.id, t]))
              return taskIds
                .map((taskId, index) => {
                  const task = taskMap.get(taskId)
                  return task ? { ...task, position: index } : undefined
                })
                .filter((t): t is TaskInfo => t !== undefined)
            })
            break
          }
        }
      }

      // Special handling for inbox (flat task list)
      if (contextType === "inbox" && !sectionId) {
        const allInboxTasks = store.viewSections.inbox.flatMap((s) => s.tasks)
        const taskMap = new Map(allInboxTasks.map((t) => [t.id, t]))
        const reorderedTasks = taskIds
          .map((taskId, index) => {
            const task = taskMap.get(taskId)
            return task ? { ...task, position: index } : undefined
          })
          .filter((t): t is TaskInfo => t !== undefined)

        if (store.viewSections.inbox.length > 0) {
          setStore("viewSections", "inbox", 0, "tasks", reorderedTasks)
        }
      }

      const { error } = await sdk.client.postApiV1TasksReorder({
        reorderTasks: {
          ids: taskIds,
          contextType,
          contextId,
        },
      })

      if (error) {
        // Refetch affected loaded views on error
        refetchIfLoaded("inbox")
        refetchIfLoaded("today")
        refetchIfLoaded("upcoming")
        refetchIfLoaded("anytime")
        refetchIfLoaded("someday")
        return false
      }

      return true
    }

    // Type for move updates - uses listId/headingId directly
    type MoveUpdates = Partial<TaskInfo> & {
      listId?: string | null
      headingId?: string | null
      contextType?: "inbox" | "today" | "upcoming" | "anytime" | "someday"
    }

    const moveTask = async (
      taskId: string,
      fromSectionId: string,
      toSectionId: string,
      newTaskIds: string[],
      updates: MoveUpdates,
    ) => {
      // Determine which view we're in
      // Use explicit contextType if provided, otherwise infer from updates
      const contextType: "inbox" | "today" | "upcoming" | "anytime" | "someday" =
        updates.contextType ?? (updates.scheduledDate !== undefined ? "upcoming" : "today")

      // Helper to apply optimistic move to a view's sections
      const applyOptimisticMove = (sections: Section[]): Section[] => {
        let task: TaskInfo | undefined

        // Remove from source section and capture the task
        const withoutTask = sections.map((section) => {
          if (section.id !== fromSectionId) return section
          const found = section.tasks.find((t) => t.id === taskId)
          if (found) task = { ...found, ...updates }
          return {
            ...section,
            tasks: section.tasks.filter((t) => t.id !== taskId),
          }
        })

        if (!task) {
          return sections
        }

        // Add to target section in the right order with updated positions
        return withoutTask.map((section) => {
          if (section.id !== toSectionId) return section
          const taskMap = new Map(section.tasks.map((t) => [t.id, t]))
          taskMap.set(taskId, task!)
          const reordered = newTaskIds
            .map((id, index) => {
              const t = taskMap.get(id)
              return t ? { ...t, position: index } : undefined
            })
            .filter((t): t is TaskInfo => t !== undefined)
          return { ...section, tasks: reordered }
        })
      }

      // Apply optimistic update to the appropriate view
      setStore("viewSections", contextType, applyOptimisticMove)

      // Use the dedicated move endpoint which publishes task.moved SSE event
      const { error } = await sdk.client.postApiV1TasksByIdMove({
        id: taskId,
        moveTask: {
          fromSectionId,
          toSectionId,
          newTaskIds,
          listId: updates.listId,
          headingId: updates.headingId,
          isEvening: updates.isEvening,
          scheduledDate: updates.scheduledDate,
          contextType,
        },
      })

      if (error) {
        refetchIfLoaded("inbox")
        refetchIfLoaded("today")
        refetchIfLoaded("upcoming")
        refetchIfLoaded("anytime")
        refetchIfLoaded("someday")
        return false
      }

      return true
    }

    const createTask = async (
      title: string,
      options?: { isSomeday?: boolean; scheduledDate?: string; listId?: string | null; headingId?: string | null },
    ) => {
      setStore("error", undefined)

      // If any organization is provided, set status to "active", otherwise null (inbox)
      const hasOrganization = options?.scheduledDate || options?.listId || options?.isSomeday

      const { data, error } = await sdk.client.postApiV1Tasks({
        createTask: {
          title,
          status: hasOrganization ? "active" : null,
          isSomeday: options?.isSomeday ?? false,
          scheduledDate: options?.scheduledDate,
          listId: options?.listId ?? null,
          headingId: options?.headingId ?? null,
        },
      })

      if (error) {
        setStore("error", `Failed to create task: ${error}`)
        return null
      }

      // SSE will handle adding to views
      return data
    }

    // ================== TAG & CHECKLIST OPERATIONS ==================

    const fetchTaskTags = async (taskId: string) => {
      const { data, error } = await sdk.client.getApiV1TasksByIdTags({
        id: taskId,
      })
      if (error) return []
      const tags = data ?? []
      setStore("taskTags", taskId, tags as any)
      return tags
    }

    const addTagToTask = async (taskId: string, tagId: string) => {
      const { error } = await sdk.client.postApiV1TasksByIdTagsByTagId({
        id: taskId,
        tagId,
      })
      if (error) return false
      await fetchTaskTags(taskId)
      return true
    }

    const removeTagFromTask = async (taskId: string, tagId: string) => {
      // Optimistic update
      setStore("taskTags", taskId, (tags) => (tags ?? []).filter((t) => t.id !== tagId))

      const { error } = await sdk.client.deleteApiV1TasksByIdTagsByTagId({
        id: taskId,
        tagId,
      })

      if (error) {
        await fetchTaskTags(taskId)
        return false
      }
      return true
    }

    const fetchChecklistItems = async (taskId: string) => {
      const { data, error } = await sdk.client.getApiV1TasksByTaskIdChecklist({
        taskId,
      })
      if (error) return []
      const items = data ?? []
      setStore("checklistItems", taskId, items as any)
      return items
    }

    const createChecklistItem = async (
      taskId: string,
      item: { title: string; completed: boolean; position: number },
    ) => {
      const { data, error } = await sdk.client.postApiV1TasksByTaskIdChecklist({
        taskId,
        createChecklistItem: {
          title: item.title,
          completed: item.completed,
          position: item.position,
        },
      })
      if (error) return null
      const created = data
      setStore("checklistItems", taskId, (items) =>
        [...(items ?? []), created as any].sort((a, b) => a.position - b.position),
      )
      return created
    }

    const updateChecklistItem = async (taskId: string, itemId: string, changes: Partial<ChecklistItemInfo>) => {
      // Optimistic update
      setStore("checklistItems", taskId, (items) =>
        (items ?? []).map((i) => (i.id === itemId ? { ...i, ...changes } : i)),
      )

      const { data, error } = await sdk.client.putApiV1TasksByTaskIdChecklistById({
        taskId,
        id: itemId,
        updateChecklistItem: {
          title: changes.title,
          completed: changes.completed,
          position: changes.position,
        },
      })

      if (error) {
        await fetchChecklistItems(taskId)
        return null
      }
      return data
    }

    const deleteChecklistItem = async (taskId: string, itemId: string) => {
      // Optimistic update
      setStore("checklistItems", taskId, (items) => (items ?? []).filter((i) => i.id !== itemId))

      const { error } = await sdk.client.deleteApiV1TasksByTaskIdChecklistById({
        taskId,
        id: itemId,
      })

      if (error) {
        await fetchChecklistItems(taskId)
        return false
      }
      return true
    }

    const reorderChecklistItems = async (taskId: string, items: { id: string; position: number }[]) => {
      // Optimistic update
      setStore("checklistItems", taskId, (current) =>
        (current ?? []).map((item) => {
          const reordered = items.find((i) => i.id === item.id)
          return reordered ? { ...item, position: reordered.position } : item
        }),
      )

      await Promise.all(
        items.map((item) =>
          sdk.client.putApiV1TasksByTaskIdChecklistById({
            taskId,
            id: item.id,
            updateChecklistItem: {
              position: item.position,
            },
          }),
        ),
      )
      return true
    }

    const convertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
      const { data, error } = await sdk.client.postApiV1RepeatingRulesFromTask({
        taskId,
        rrule,
        startDate,
      })
      if (error) return null
      return data
    }

    // ================== TEMPLATE OPERATIONS ==================

    const updateTemplate = async (id: string, updates: Partial<TemplateInfo>) => {
      // Optimistic update
      const current = store.templates[id]
      if (current) {
        setStore("templates", id, { ...current, ...updates })
      }

      const { data, error } = await sdk.client.putApiV1RepeatingRulesById({
        id,
        updateRepeatingRule: {
          title: updates.title,
          notes: updates.notes,
          rrule: updates.rrule,
          nextOccurrence: updates.nextOccurrence,
          status: updates.status as "active" | "paused" | undefined,
          listId: updates.listId,
          headingId: updates.headingId,
        },
      })

      if (error) {
        if (current) setStore("templates", id, current)
        fetchUpcoming()
        return null
      }
      return data
    }

    const deleteTemplate = async (id: string) => {
      // Optimistic update
      handleTemplateDeleted({ id })

      const { error } = await sdk.client.deleteApiV1RepeatingRulesById({
        id,
      })

      if (error) {
        fetchUpcoming()
        return false
      }
      return true
    }

    return {
      // Normalized stores
      get tasks() {
        return store.tasks
      },
      get taskTags() {
        return store.taskTags
      },
      get checklistItems() {
        return store.checklistItems
      },
      get templates() {
        return store.templates
      },

      // View sections (for components that need grouped data)
      get inboxSections() {
        return store.viewSections.inbox
      },
      get todaySections() {
        return store.viewSections.today
      },
      get upcomingSections() {
        return store.viewSections.upcoming
      },
      get anytimeSections() {
        return store.viewSections.anytime
      },
      get somedaySections() {
        return store.viewSections.someday
      },
      get logbookSections() {
        return store.viewSections.logbook
      },

      // Loading states
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },

      // Flat task lists for simple views
      get inboxTasks() {
        return store.viewSections.inbox.flatMap((s) => s.tasks)
      },
      get logbookTasks() {
        return store.viewSections.logbook.flatMap((s) => s.tasks)
      },

      // Mutations
      createTask,
      updateTask,
      completeTask,
      cancelTask,
      uncancelTask,
      reorderTasks,
      moveTask,

      // Tags & Checklists
      fetchTaskTags,
      addTagToTask,
      removeTagFromTask,
      fetchChecklistItems,
      createChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      reorderChecklistItems,
      convertToRepeat,

      // Templates
      updateTemplate,
      deleteTemplate,

      // Lazy loading
      ensureView,

      // Refetch helpers
      refetchInbox: () => fetchInbox(),
      refetchToday: () => fetchToday(),
      refetchUpcoming: () => fetchUpcoming(),
      refetchAnytime: () => fetchAnytime(),
      refetchSomeday: () => fetchSomeday(),
      refetchLogbook: () => fetchLogbook(),
    }
  },
})
