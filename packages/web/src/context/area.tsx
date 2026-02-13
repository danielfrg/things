import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { Section } from "@/components/tasks/types"
import { createSimpleContext } from "./context"
import type { TaskInfo, TemplateInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"
import { useTaskRepository } from "./task-repository"

type AreaInfo = {
  id: string
  title: string
}

type AreaProjectInfo = {
  id: string
  title: string
  taskCount: number
  progress: number
}

type AreaDataStore = {
  area: AreaInfo | null
  sections: Section[]
  projects: AreaProjectInfo[]
  loading: boolean
  error: string | undefined
}

export const { use: useAreaData, provider: AreaDataProvider } = createSimpleContext({
  name: "AreaData",
  init: (props: { areaId: string }) => {
    const sdk = useSDK()
    const event = useEvent()
    const repo = useTaskRepository()

    const [store, setStore] = createStore<AreaDataStore>({
      area: null,
      sections: [],
      projects: [],
      loading: true,
      error: undefined,
    })

    let refetchTimeout: ReturnType<typeof setTimeout> | null = null
    let pendingRefetch = false
    let isReordering = false

    const debouncedFetch = () => {
      if (refetchTimeout) {
        pendingRefetch = true
        return
      }

      fetchArea()

      refetchTimeout = setTimeout(() => {
        refetchTimeout = null
        if (pendingRefetch) {
          pendingRefetch = false
          fetchArea()
        }
      }, 300)
    }

    const fetchArea = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      if (showLoading) {
        setStore("loading", true)
      }
      setStore("error", undefined)

      const { data, error } = await sdk.client.getApiV1ViewsAreaById({
        id: props.areaId,
      })
      if (error) {
        setStore("error", `Failed to fetch area: ${error}`)
        if (showLoading) setStore("loading", false)
        return
      }
      setStore("area", data?.area ?? null)
      setStore("sections", reconcile((data?.sections as Section[]) ?? []))
      setStore("projects", reconcile((data?.projects as AreaProjectInfo[]) ?? []))
      if (showLoading) {
        setStore("loading", false)
      }
    }

    const belongsInArea = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      return task.listId === props.areaId
    }

    // ================== SSE EVENT HANDLERS ==================

    const unsubCreate = event.on("task.created", (task) => {
      if (belongsInArea(task)) {
        debouncedFetch()
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
      let currentTask: TaskInfo | undefined
      for (const section of store.sections) {
        const found = section.tasks.find((t) => t.id === task.id)
        if (found) {
          currentTask = found
          break
        }
      }

      if (currentTask) {
        if (!belongsInArea(task)) {
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks.filter((t) => t.id !== task.id),
            })),
          )
        } else if (currentTask.isSomeday !== task.isSomeday) {
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks.map((t) =>
                t.id === task.id ? { ...task, tags: task.tags ?? t.tags, position: t.position } : t,
              ),
            })),
          )
          debouncedFetch()
        } else {
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks
                .map((t) => (t.id === task.id ? { ...task, tags: task.tags ?? t.tags, position: t.position } : t))
                .sort((a, b) => a.position - b.position),
            })),
          )
        }
      } else if (belongsInArea(task)) {
        debouncedFetch()
      }
    })

    const unsubDelete = event.on("task.deleted", ({ id }) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.filter((t) => t.id !== id),
        })),
      )
    })

    const unsubAreaUpdate = event.on("area.updated", (area) => {
      if (area.id === props.areaId) {
        setStore("area", { id: area.id, title: area.title })
      }
    })

    const unsubProjectUpdate = event.on("project.updated", () => debouncedFetch())
    const unsubProjectCreate = event.on("project.created", () => debouncedFetch())
    const unsubProjectDelete = event.on("project.deleted", () => debouncedFetch())

    const unsubReorder = event.on("tasks.reordered", ({ contextType, contextId, taskIds }) => {
      if (contextType !== "area" || contextId !== props.areaId) return
      if (isReordering) return

      setStore("sections", (sections) =>
        sections.map((section) => {
          const taskMap = new Map(section.tasks.map((t) => [t.id, t]))
          const reordered = taskIds
            .map((id, index) => {
              const task = taskMap.get(id)
              return task ? { ...task, position: index } : undefined
            })
            .filter((t): t is TaskInfo => t !== undefined)

          if (reordered.length === 0) return section
          return { ...section, tasks: reordered }
        }),
      )
    })

    // On SSE reconnect, refetch area data to catch up on missed events
    const unsubReconnect = event.on("server.reconnected", () => {
      fetchArea()
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubAreaUpdate()
      unsubProjectUpdate()
      unsubProjectCreate()
      unsubProjectDelete()
      unsubReorder()
      unsubReconnect()
      if (refetchTimeout) clearTimeout(refetchTimeout)
    })

    createEffect(() => {
      if (sdk.isReady) {
        fetchArea(true)
      }
    })

    // ================== AREA-SPECIFIC MUTATIONS ==================

    const updateTask = async (id: string, updates: Partial<TaskInfo>) => {
      setStore("error", undefined)

      // Optimistic update for isSomeday changes - move task between sections
      if (updates.isSomeday !== undefined) {
        setStore("sections", (sections) => {
          let task: TaskInfo | undefined
          let fromIdx = -1

          for (let i = 0; i < sections.length; i++) {
            const found = sections[i].tasks.find((t) => t.id === id)
            if (found) {
              task = { ...found, ...updates }
              fromIdx = i
              break
            }
          }

          if (!task || fromIdx === -1) return sections

          const withoutTask = sections.map((section, i) => {
            if (i !== fromIdx) return section
            return { ...section, tasks: section.tasks.filter((t) => t.id !== id) }
          })

          if (updates.isSomeday) {
            const somedayIdx = withoutTask.findIndex((s) => s.isBacklog)
            if (somedayIdx >= 0) {
              return withoutTask.map((section, i) => {
                if (i !== somedayIdx) return section
                return { ...section, tasks: [...section.tasks, task!] }
              })
            }
            return [
              ...withoutTask,
              { id: "section:someday", title: "Someday", tasks: [task], areaId: props.areaId, isBacklog: true },
            ]
          }

          const unheadedIdx = withoutTask.findIndex((s) => s.id === "section:unheaded")
          if (unheadedIdx >= 0) {
            return withoutTask.map((section, i) => {
              if (i !== unheadedIdx) return section
              return { ...section, tasks: [...section.tasks, task!] }
            })
          }
          return [{ id: "section:unheaded", title: "", tasks: [task], areaId: props.areaId }, ...withoutTask]
        })
      }

      const result = await repo.updateTask(id, updates)
      if (!result) {
        fetchArea()
      }
      return result
    }

    const updateArea = async (updates: Partial<AreaInfo>) => {
      setStore("error", undefined)
      setStore("area", (a) => (a ? { ...a, ...updates } : a))

      const { data, error } = await sdk.client.putApiV1AreasById({
        id: props.areaId,
        updateArea: { title: updates.title },
      })
      if (error) {
        setStore("error", `Failed to update area: ${error}`)
        fetchArea()
        return null
      }
      return data
    }

    const completeTask = async (id: string, completed: boolean) => {
      // Optimistic update in local sections
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id ? { ...t, completedAt: completed ? new Date().toISOString() : null } : t,
          ),
        })),
      )

      const result = await repo.completeTask(id, completed)
      if (!result) fetchArea()
      return result
    }

    const cancelTask = async (id: string) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id ? { ...t, status: "cancelled", completedAt: new Date().toISOString() } : t,
          ),
        })),
      )

      const result = await repo.cancelTask(id)
      if (!result) fetchArea()
      return result
    }

    const uncancelTask = async (id: string) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) => (t.id === id ? { ...t, status: "active", completedAt: null } : t)),
        })),
      )

      const result = await repo.uncancelTask(id)
      if (!result) fetchArea()
      return result
    }

    const reorderTasks = async (taskIds: string[], sectionId?: string) => {
      isReordering = true

      if (sectionId) {
        setStore("sections", (sections) =>
          sections.map((section) => {
            if (section.id !== sectionId) return section
            const taskMap = new Map(section.tasks.map((t) => [t.id, t]))
            const reordered = taskIds
              .map((id, index) => {
                const task = taskMap.get(id)
                return task ? { ...task, position: index } : undefined
              })
              .filter((t): t is TaskInfo => t !== undefined)
            return { ...section, tasks: reordered }
          }),
        )
      }

      const { error } = await sdk.client.postApiV1TasksReorder({
        reorderTasks: { ids: taskIds, contextType: "area", contextId: props.areaId },
      })
      isReordering = false

      if (error) {
        fetchArea()
        return false
      }
      return true
    }

    const moveTask = async (
      taskId: string,
      fromSectionId: string,
      toSectionId: string,
      newTaskIds: string[],
      updates: Partial<TaskInfo>,
    ) => {
      setStore("sections", (sections) => {
        let task: TaskInfo | undefined

        const withoutTask = sections.map((section) => {
          if (section.id !== fromSectionId) return section
          const found = section.tasks.find((t) => t.id === taskId)
          if (found) task = { ...found, ...updates }
          return { ...section, tasks: section.tasks.filter((t) => t.id !== taskId) }
        })

        if (!task) return sections

        const targetExists = withoutTask.some((s) => s.id === toSectionId)

        if (!targetExists && (toSectionId === "section:someday" || updates.isSomeday)) {
          return [
            ...withoutTask,
            {
              id: "section:someday",
              title: "Someday",
              tasks: [{ ...task, position: 0 }],
              areaId: props.areaId,
              isBacklog: true,
            },
          ]
        }

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
      })

      const [updateResult, reorderResult] = await Promise.all([
        sdk.client.putApiV1TasksById({
          id: taskId,
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
          },
        }),
        sdk.client.postApiV1TasksReorder({
          reorderTasks: { ids: newTaskIds, contextType: "area", contextId: props.areaId },
        }),
      ])

      if (updateResult.error || reorderResult.error) {
        fetchArea()
        return false
      }
      return true
    }

    const deleteArea = async (): Promise<{ success: boolean; error?: string }> => {
      setStore("error", undefined)

      const { error } = await sdk.client.deleteApiV1AreasById({ id: props.areaId })
      if (error) {
        const msg =
          typeof error === "object" && error !== null && "error" in error
            ? (error as { error: string }).error
            : "Failed to delete area"
        return { success: false, error: msg }
      }
      return { success: true }
    }

    const getContentCount = async (): Promise<{ projectCount: number; taskCount: number }> => {
      const { data, error } = await sdk.client.getApiV1AreasByIdContentCount({ id: props.areaId })
      if (error || !data) return { projectCount: 0, taskCount: 0 }
      return { projectCount: data.projectCount, taskCount: data.taskCount }
    }

    const updateTemplate = async (id: string, updates: Partial<TemplateInfo>) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: section.templates?.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      )

      const result = await repo.updateTemplate(id, updates)
      if (!result) fetchArea()
      return result
    }

    const deleteTemplate = async (id: string) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: section.templates?.filter((t) => t.id !== id),
        })),
      )

      const result = await repo.deleteTemplate(id)
      if (!result) fetchArea()
      return result
    }

    return {
      get area() {
        return store.area
      },
      get sections() {
        return store.sections
      },
      get projects() {
        return store.projects
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },

      // Task mutations (delegate to repo for API calls)
      updateTask,
      completeTask,
      cancelTask,
      uncancelTask,
      reorderTasks,
      moveTask,

      // Area-specific operations
      updateArea,
      deleteArea,
      getContentCount,

      // Template operations (delegate to repo)
      updateTemplate,
      deleteTemplate,

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
      convertToRepeat: repo.convertToRepeat,

      refetch: fetchArea,
    }
  },
})
