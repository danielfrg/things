import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "./context"
import type { TaskInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"
import { useTaskRepository } from "./task-repository"

type TrashStore = {
  tasks: TaskInfo[]
  loading: boolean
  error: string | undefined
}

export const { use: useTrashData, provider: TrashDataProvider } = createSimpleContext({
  name: "TrashData",
  init: () => {
    const sdk = useSDK()
    const event = useEvent()
    const repo = useTaskRepository()

    const [store, setStore] = createStore<TrashStore>({
      tasks: [],
      loading: true,
      error: undefined,
    })

    const fetchTrash = async () => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      setStore("loading", true)
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsTrash()
      if (error) {
        setStore("error", `Failed to fetch trash: ${error}`)
        setStore("loading", false)
        return
      }
      const tasks = data?.sections?.[0]?.tasks ?? []
      setStore("tasks", reconcile(tasks as TaskInfo[]))
      setStore("loading", false)
    }

    // ================== SSE EVENT HANDLERS ==================

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
        const trashed = task.trashedAt || task.status === "trashed"

        if (index === -1) {
          return trashed ? [task, ...tasks] : tasks
        }
        if (!trashed) {
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

    // On SSE reconnect, refetch trash to catch up on missed events
    const unsubReconnect = event.on("server.reconnected", () => {
      fetchTrash()
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubReconnect()
    })

    createEffect(() => {
      if (sdk.isReady) {
        fetchTrash()
      }
    })

    // ================== TRASH-SPECIFIC OPERATIONS ==================

    const restoreTask = async (id: string): Promise<{ success: boolean; error?: string }> => {
      const { error } = await sdk.client.postApiV1TasksByIdRestore({ id })
      if (error) {
        const msg =
          typeof error === "object" && error !== null && "error" in error
            ? (error as { error: string }).error
            : "Failed to restore task"
        return { success: false, error: msg }
      }
      return { success: true }
    }

    const deleteTask = async (id: string) => {
      const { error } = await sdk.client.deleteApiV1TasksByIdPermanent({ id })
      if (error) {
        setStore("error", `Failed to delete task: ${error}`)
        return false
      }
      setStore("tasks", (tasks) => tasks.filter((t) => t.id !== id))
      return true
    }

    const emptyTrash = async () => {
      const tasks = store.tasks
      for (const task of tasks) {
        await deleteTask(task.id)
      }
    }

    const updateTask = async (id: string, updates: Record<string, unknown>) => {
      return repo.updateTask(id, updates as Partial<TaskInfo>)
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

      // Trash-specific operations
      restoreTask,
      deleteTask,
      emptyTrash,
      updateTask,
      refetch: fetchTrash,

      // Tag & checklist operations (fully delegated to repo)
      get taskTags() {
        return repo.taskTags
      },
      get checklistItems() {
        return repo.checklistItems
      },
      fetchTaskTags: repo.fetchTaskTags,
      addTagToTask: repo.addTagToTask,
      removeTagFromTask: repo.removeTagFromTask,
      fetchChecklistItems: repo.fetchChecklistItems,
      createChecklistItem: repo.createChecklistItem,
      updateChecklistItem: repo.updateChecklistItem,
      deleteChecklistItem: repo.deleteChecklistItem,
      reorderChecklistItems: repo.reorderChecklistItems,
    }
  },
})
