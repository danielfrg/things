import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "./context"
import { useEvent } from "./event"
import { useSDK } from "./sdk"

// Simple tag info for inline display
export type SimpleTagInfo = {
  id: string
  title: string
}

// Task info type - uses the new List model
// listId: which List (Project or Area) does this task belong to?
// headingId: which Heading within the List (if any)?
export type TaskInfo = {
  id: string
  title: string
  notes: string | null
  status: string | null
  type: string
  isSomeday: boolean
  scheduledDate: string | null
  deadline: string | null
  isEvening: boolean
  position: number
  // List hierarchy
  listId: string | null
  headingId: string | null
  // Template fields
  isTemplate: boolean
  templateId: string | null
  completedAt: string | null
  trashedAt: string | null
  isLogged: boolean
  createdAt: string
  tags?: SimpleTagInfo[]
}

export type TaskTagInfo = {
  id: string
  title: string
  position: number
  createdAt: string
}

// Checklist item type
export type ChecklistItemInfo = {
  id: string
  title: string
  completed: boolean
  position: number
  taskId: string
  createdAt: string
}

// Template info type (templates are now tasks with isTemplate=true)
// This is used for displaying templates in the Upcoming view
export type TemplateInfo = {
  id: string
  title: string
  notes: string | null
  rrule: string
  nextOccurrence: string
  status: string
  listId: string | null
  headingId: string | null
  createdAt: string
}

type DataStore = {
  tasks: TaskInfo[]
  taskTags: Record<string, TaskTagInfo[]> // taskId -> tags
  checklistItems: Record<string, ChecklistItemInfo[]> // taskId -> checklist items
  loading: boolean
  error: string | undefined
}

export const { use: useData, provider: DataProvider } = createSimpleContext({
  name: "Data",
  init: () => {
    const sdk = useSDK()
    const event = useEvent()

    const [store, setStore] = createStore<DataStore>({
      tasks: [],
      taskTags: {},
      checklistItems: {},
      loading: true,
      error: undefined,
    })

    // Listen for SSE task events
    const unsubCreate = event.on("task.created", (task) => {
      // Only add if it matches inbox criteria (status is null)
      if (task.status === null) {
        setStore("tasks", (tasks) => {
          // Check if already exists
          if (tasks.some((t) => t.id === task.id)) return tasks
          return [...tasks, task].sort((a, b) => a.position - b.position)
        })
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
      setStore("tasks", (tasks) => {
        const index = tasks.findIndex((t) => t.id === task.id)
        // Check if task still belongs in inbox (status is null)
        const belongsInInbox = task.status === null

        if (index === -1) {
          // Task not in list - add if it now belongs in inbox
          if (belongsInInbox) {
            return [...tasks, task].sort((a, b) => a.position - b.position)
          }
          return tasks
        }
        // Task is in list
        if (!belongsInInbox) {
          // Remove if it no longer belongs in inbox
          return tasks.filter((t) => t.id !== task.id)
        }
        // Update in place
        const updated = [...tasks]
        updated[index] = task
        return updated.sort((a, b) => a.position - b.position)
      })
    })

    const unsubDelete = event.on("task.deleted", ({ id }) => {
      setStore("tasks", (tasks) => tasks.filter((t) => t.id !== id))
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
    })

    const fetchInbox = async () => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      setStore("loading", true)
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.getApiV1ViewsInbox()
        if (error) {
          throw new Error(`Failed to fetch inbox: ${error}`)
        }
        const tasks = data?.sections?.[0]?.tasks ?? []
        setStore("tasks", reconcile(tasks as TaskInfo[]))
      } catch (e) {
        console.error("[Data] fetch error:", e)
        setStore("error", String(e))
      }
      setStore("loading", false)
    }

    // Fetch when API key is available
    createEffect(() => {
      if (sdk.isReady) {
        fetchInbox()
      }
    })

    const createTask = async (title: string) => {
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.postApiV1Tasks({
          createTask: {
            title,
            // New task has null status = inbox
          },
        })
        if (error) {
          throw new Error(`Failed to create task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[Data] create error:", e)
        setStore("error", String(e))
        return null
      }
    }

    const updateTask = async (id: string, updates: Partial<TaskInfo>) => {
      setStore("error", undefined)

      // Optimistic update
      if (updates.trashedAt) {
        // Remove from list immediately if trashing
        setStore("tasks", (tasks) => tasks.filter((t) => t.id !== id))
      } else {
        setStore("tasks", (tasks) => tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)))
      }

      try {
        const { data, error } = await sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            title: updates.title,
            notes: updates.notes,
            status: updates.status as any,
            scheduledDate: updates.scheduledDate,
            deadline: updates.deadline,
            listId: updates.listId,
            headingId: updates.headingId,
            isEvening: updates.isEvening,
            trashedAt: updates.trashedAt,
          },
        })
        if (error) {
          throw new Error(`Failed to update task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[Data] update error:", e)
        setStore("error", String(e))
        // Revert on error
        fetchInbox()
        return null
      }
    }

    const completeTask = async (id: string, completed: boolean) => {
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.postApiV1TasksByIdComplete({
          id,
          completeTask: {
            completed,
          },
        })
        if (error) {
          throw new Error(`Failed to complete task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[Data] complete error:", e)
        setStore("error", String(e))
        return null
      }
    }

    const deleteTask = async (id: string) => {
      setStore("error", undefined)

      try {
        const { error } = await sdk.client.deleteApiV1TasksById({ id })
        if (error) {
          throw new Error(`Failed to delete task: ${error}`)
        }
        return true
      } catch (e) {
        console.error("[Data] delete error:", e)
        setStore("error", String(e))
        return false
      }
    }

    const reorderTask = async (id: string, newPosition: number) => {
      // Optimistically update positions locally
      const currentTasks = [...store.tasks]
      const taskIndex = currentTasks.findIndex((t) => t.id === id)
      if (taskIndex === -1) return false

      const [task] = currentTasks.splice(taskIndex, 1)
      currentTasks.splice(newPosition, 0, task!)
      const reordered = currentTasks.map((t, i) => ({ ...t, position: i }))
      setStore("tasks", reconcile(reordered))

      try {
        const { error } = await sdk.client.postApiV1TasksReorder({
          reorderTasks: {
            ids: reordered.map((t) => t.id),
            contextType: "inbox",
          },
        })
        if (error) {
          // Revert on error
          fetchInbox()
          return false
        }
        return true
      } catch (e) {
        console.error("[Data] reorder error:", e)
        fetchInbox()
        return false
      }
    }

    const fetchTaskTags = async (taskId: string): Promise<TaskTagInfo[]> => {
      try {
        const { data, error } = await sdk.client.getApiV1TasksByIdTags({
          id: taskId,
        })
        if (error) return []
        const tags = data ?? []
        setStore("taskTags", taskId, tags as TaskTagInfo[])
        return tags as TaskTagInfo[]
      } catch {
        return []
      }
    }

    const addTagToTask = async (taskId: string, tagId: string) => {
      try {
        const { error } = await sdk.client.postApiV1TasksByIdTagsByTagId({
          id: taskId,
          tagId,
        })
        if (error) {
          throw new Error("Failed to add tag")
        }
        // Refresh task tags after adding
        await fetchTaskTags(taskId)
        return true
      } catch (e) {
        console.error("[Data] add tag error:", e)
        return false
      }
    }

    const removeTagFromTask = async (taskId: string, tagId: string) => {
      // Optimistic update - remove from local state
      setStore("taskTags", taskId, (tags) => (tags ?? []).filter((t) => t.id !== tagId))

      try {
        const { error } = await sdk.client.deleteApiV1TasksByIdTagsByTagId({
          id: taskId,
          tagId,
        })
        if (error) {
          // Revert on error
          await fetchTaskTags(taskId)
          return false
        }
        return true
      } catch (e) {
        console.error("[Data] remove tag error:", e)
        await fetchTaskTags(taskId)
        return false
      }
    }

    const getTaskTags = (taskId: string): TaskTagInfo[] => {
      return store.taskTags[taskId] ?? []
    }

    // Checklist item functions
    const fetchChecklistItems = async (taskId: string): Promise<ChecklistItemInfo[]> => {
      try {
        const { data, error } = await sdk.client.getApiV1TasksByTaskIdChecklist({ taskId })
        if (error) return []
        const items = data ?? []
        setStore("checklistItems", taskId, items as ChecklistItemInfo[])
        return items as ChecklistItemInfo[]
      } catch {
        return []
      }
    }

    const getChecklistItems = (taskId: string): ChecklistItemInfo[] => {
      return store.checklistItems[taskId] ?? []
    }

    const createChecklistItem = async (
      taskId: string,
      item: {
        title: string
        completed: boolean
        position: number
      },
    ): Promise<ChecklistItemInfo | null> => {
      try {
        const { data, error } = await sdk.client.postApiV1TasksByTaskIdChecklist({
          taskId,
          createChecklistItem: {
            title: item.title,
            completed: item.completed,
            position: item.position,
          },
        })
        if (error) {
          return null
        }
        const created = data as ChecklistItemInfo
        setStore("checklistItems", taskId, (items) =>
          [...(items ?? []), created].sort((a, b) => a.position - b.position),
        )
        return created
      } catch (e) {
        console.error("[Data] create checklist item error:", e)
        return null
      }
    }

    const updateChecklistItem = async (
      taskId: string,
      itemId: string,
      changes: Partial<ChecklistItemInfo>,
    ): Promise<ChecklistItemInfo | null> => {
      // Optimistic update
      setStore("checklistItems", taskId, (items) =>
        (items ?? []).map((i) => (i.id === itemId ? { ...i, ...changes } : i)),
      )

      try {
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
          // Revert on error
          await fetchChecklistItems(taskId)
          return null
        }
        return data as ChecklistItemInfo
      } catch (e) {
        console.error("[Data] update checklist item error:", e)
        await fetchChecklistItems(taskId)
        return null
      }
    }

    const deleteChecklistItem = async (taskId: string, itemId: string): Promise<boolean> => {
      // Optimistic update
      setStore("checklistItems", taskId, (items) => (items ?? []).filter((i) => i.id !== itemId))

      try {
        const { error } = await sdk.client.deleteApiV1TasksByTaskIdChecklistById({
          taskId,
          id: itemId,
        })
        if (error) {
          // Revert on error
          await fetchChecklistItems(taskId)
          return false
        }
        return true
      } catch (e) {
        console.error("[Data] delete checklist item error:", e)
        await fetchChecklistItems(taskId)
        return false
      }
    }

    const reorderChecklistItems = async (
      taskId: string,
      items: { id: string; position: number }[],
    ): Promise<boolean> => {
      // Optimistic update - update positions in current items
      setStore("checklistItems", taskId, (current) =>
        (current ?? []).map((item) => {
          const reordered = items.find((i) => i.id === item.id)
          return reordered ? { ...item, position: reordered.position } : item
        }),
      )

      // Update each item's position on the server
      try {
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
      } catch (e) {
        console.error("[Data] reorder checklist items error:", e)
        await fetchChecklistItems(taskId)
        return false
      }
    }

    const convertToRepeat = async (taskId: string, rrule: string, startDate: string) => {
      try {
        const { data, error } = await sdk.client.postApiV1RepeatingRulesFromTask({
          taskId,
          rrule,
          startDate,
        })
        if (error) {
          throw new Error("Failed to convert task to repeat")
        }
        // Remove task from list - it's been trashed/converted
        setStore("tasks", (tasks) => tasks.filter((t) => t.id !== taskId))
        return data
      } catch (e) {
        console.error("[Data] convert to repeat error:", e)
        return null
      }
    }

    return {
      get tasks() {
        return store.tasks
      },
      get taskTags() {
        return store.taskTags
      },
      get checklistItems() {
        return store.checklistItems
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },
      createTask,
      updateTask,
      completeTask,
      deleteTask,
      reorderTask,
      refetch: fetchInbox,
      fetchTaskTags,
      addTagToTask,
      removeTagFromTask,
      getTaskTags,
      fetchChecklistItems,
      getChecklistItems,
      createChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      reorderChecklistItems,
      convertToRepeat,
    }
  },
})
