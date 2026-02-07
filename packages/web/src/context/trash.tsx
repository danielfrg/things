import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "./context"
import { useEvent } from "./event"
import { useSDK } from "./sdk"
import type { ChecklistItemInfo, TaskTagInfo } from "./data"

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
  listId: string | null
  headingId: string | null
  isTemplate: boolean
  templateId: string | null
  completedAt: string | null
  trashedAt: string | null
  isLogged: boolean
  createdAt: string
  tags?: Array<{ id: string; title: string }>
}

type TrashStore = {
  tasks: TaskInfo[]
  loading: boolean
  error: string | undefined
  taskTags: Record<string, TaskTagInfo[]>
  checklistItems: Record<string, ChecklistItemInfo[]>
}

export const { use: useTrashData, provider: TrashDataProvider } = createSimpleContext({
  name: "TrashData",
  init: () => {
    const sdk = useSDK()
    const event = useEvent()

    const [store, setStore] = createStore<TrashStore>({
      tasks: [],
      loading: true,
      error: undefined,
      taskTags: {},
      checklistItems: {},
    })

    const fetchTrash = async () => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      setStore("loading", true)
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.getApiV1ViewsTrash()
        if (error) {
          throw new Error(`Failed to fetch trash: ${error}`)
        }
        const tasks = data?.sections?.[0]?.tasks ?? []
        setStore("tasks", reconcile(tasks as TaskInfo[]))
      } catch (e) {
        console.error("[TrashData] fetch error:", e)
        setStore("error", String(e))
      }
      setStore("loading", false)
    }

    // Listen for SSE task events
    const unsubCreate = event.on("task.created", (task) => {
      if (task.trashedAt || task.status === "trashed") {
        setStore("tasks", (tasks) => {
          if (tasks.some((t) => t.id === task.id)) return tasks
          return [task, ...tasks]
        })
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
      setStore("tasks", (tasks) => {
        const index = tasks.findIndex((t) => t.id === task.id)
        const belongsInTrash = task.trashedAt || task.status === "trashed"

        if (index === -1) {
          if (belongsInTrash) {
            return [task, ...tasks]
          }
          return tasks
        }
        if (!belongsInTrash) {
          return tasks.filter((t) => t.id !== task.id)
        }
        const updated = [...tasks]
        updated[index] = task
        return updated
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

    createEffect(() => {
      if (sdk.isReady) {
        fetchTrash()
      }
    })

    const restoreTask = async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await sdk.client.postApiV1TasksByIdRestore({ id })
        if (error) {
          // Check if it's the "project completed/trashed" error
          const errorMessage =
            typeof error === "object" && error !== null && "error" in error
              ? (error as { error: string }).error
              : "Failed to restore task"
          console.error("[TrashData] restore error:", errorMessage)
          return { success: false, error: errorMessage }
        }
        // Task will be removed from store via SSE event
        return { success: true }
      } catch (e) {
        console.error("[TrashData] restore error:", e)
        return { success: false, error: String(e) }
      }
    }

    const deleteTask = async (id: string) => {
      try {
        const { error } = await sdk.client.deleteApiV1TasksByIdPermanent({ id })
        if (error) {
          throw new Error(`Failed to delete task: ${error}`)
        }
        // Optimistically remove from store
        setStore("tasks", (tasks) => tasks.filter((t) => t.id !== id))
        return true
      } catch (e) {
        console.error("[TrashData] delete error:", e)
        setStore("error", String(e))
        return false
      }
    }

    const emptyTrash = async () => {
      const tasks = store.tasks
      for (const task of tasks) {
        await deleteTask(task.id)
      }
    }

    const updateTask = async (id: string, updates: Record<string, unknown>) => {
      try {
        const { error } = await sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            title: updates.title as string | undefined,
            notes: updates.notes as string | undefined,
            status: updates.status as "active" | "completed" | "trashed" | null | undefined,
            scheduledDate: updates.scheduledDate as string | undefined,
            deadline: updates.deadline as string | undefined,
            listId: updates.listId as string | null | undefined,
            headingId: (updates.headingId as string | null | undefined) ?? null,
            isEvening: updates.isEvening as boolean | undefined,
            isSomeday: updates.isSomeday as boolean | undefined,
            trashedAt: updates.trashedAt as string | undefined,
          },
        })
        if (error) {
          console.error("[TrashData] update error:", error)
          return null
        }
        // If the task was restored (trashedAt set to null), it will be removed via SSE
        return true
      } catch (e) {
        console.error("[TrashData] update error:", e)
        return null
      }
    }

    // Tag management
    const fetchTaskTags = async (taskId: string) => {
      try {
        const { data, error } = await sdk.client.getApiV1TasksByIdTags({ id: taskId })
        if (error) {
          console.error("[TrashData] Failed to fetch tags:", error)
          return
        }
        setStore("taskTags", taskId, data as TaskTagInfo[])
      } catch (e) {
        console.error("[TrashData] Failed to fetch tags:", e)
      }
    }

    const addTagToTask = async (taskId: string, tagId: string) => {
      try {
        const { error } = await sdk.client.postApiV1TasksByIdTagsByTagId({ id: taskId, tagId })
        if (error) {
          console.error("[TrashData] Failed to add tag:", error)
          return
        }
        await fetchTaskTags(taskId)
      } catch (e) {
        console.error("[TrashData] Failed to add tag:", e)
      }
    }

    const removeTagFromTask = async (taskId: string, tagId: string) => {
      try {
        const { error } = await sdk.client.deleteApiV1TasksByIdTagsByTagId({ id: taskId, tagId })
        if (error) {
          console.error("[TrashData] Failed to remove tag:", error)
          return
        }
        await fetchTaskTags(taskId)
      } catch (e) {
        console.error("[TrashData] Failed to remove tag:", e)
      }
    }

    // Checklist management
    const fetchChecklistItems = async (taskId: string) => {
      try {
        const { data, error } = await sdk.client.getApiV1TasksByTaskIdChecklist({ taskId })
        if (error) {
          console.error("[TrashData] Failed to fetch checklist items:", error)
          return
        }
        setStore("checklistItems", taskId, data as ChecklistItemInfo[])
      } catch (e) {
        console.error("[TrashData] Failed to fetch checklist items:", e)
      }
    }

    const createChecklistItem = async (
      taskId: string,
      item: { title: string; completed: boolean; position: number },
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
          console.error("[TrashData] Failed to create checklist item:", error)
          return null
        }
        await fetchChecklistItems(taskId)
        return data as ChecklistItemInfo
      } catch (e) {
        console.error("[TrashData] Failed to create checklist item:", e)
        return null
      }
    }

    const updateChecklistItem = async (
      taskId: string,
      itemId: string,
      changes: { title?: string; completed?: boolean; position?: number },
    ) => {
      try {
        const { error } = await sdk.client.putApiV1TasksByTaskIdChecklistById({
          taskId,
          id: itemId,
          updateChecklistItem: {
            title: changes.title,
            completed: changes.completed,
            position: changes.position,
          },
        })
        if (error) {
          console.error("[TrashData] Failed to update checklist item:", error)
          return
        }
        await fetchChecklistItems(taskId)
      } catch (e) {
        console.error("[TrashData] Failed to update checklist item:", e)
      }
    }

    const deleteChecklistItem = async (taskId: string, itemId: string) => {
      try {
        const { error } = await sdk.client.deleteApiV1TasksByTaskIdChecklistById({
          taskId,
          id: itemId,
        })
        if (error) {
          console.error("[TrashData] Failed to delete checklist item:", error)
          return
        }
        await fetchChecklistItems(taskId)
      } catch (e) {
        console.error("[TrashData] Failed to delete checklist item:", e)
      }
    }

    const reorderChecklistItems = async (taskId: string, items: { id: string; position: number }[]) => {
      try {
        // Use same approach as task-repository - update each item individually
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
        await fetchChecklistItems(taskId)
      } catch (e) {
        console.error("[TrashData] Failed to reorder checklist items:", e)
      }
    }

    return {
      get tasks() {
        return store.tasks
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },
      get taskTags() {
        return store.taskTags
      },
      get checklistItems() {
        return store.checklistItems
      },
      restoreTask,
      deleteTask,
      emptyTrash,
      updateTask,
      refetch: fetchTrash,
      // Tags
      fetchTaskTags,
      addTagToTask,
      removeTagFromTask,
      // Checklists
      fetchChecklistItems,
      createChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      reorderChecklistItems,
    }
  },
})
