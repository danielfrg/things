import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { Section } from "@/components/tasks/types"
import { createSimpleContext } from "./context"
import type { TaskInfo, TemplateInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"

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

    const [store, setStore] = createStore<AreaDataStore>({
      area: null,
      sections: [],
      projects: [],
      loading: true,
      error: undefined,
    })

    let refetchTimeout: ReturnType<typeof setTimeout> | null = null
    let pendingRefetch = false

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

      try {
        const { data, error } = await sdk.client.getApiV1ViewsAreaById({
          id: props.areaId,
        })
        if (error) {
          throw new Error(`Failed to fetch area: ${error}`)
        }
        setStore("area", data?.area ?? null)
        setStore("sections", reconcile((data?.sections as any) ?? []))
        setStore("projects", reconcile((data?.projects as any) ?? []))
      } catch (e) {
        console.error("[AreaData] fetch error:", e)
        setStore("error", String(e))
      }
      if (showLoading) {
        setStore("loading", false)
      }
    }

    const belongsInArea = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      // Task belongs in area if its listId is this areaId (directly in area, not in a project)
      return task.listId === props.areaId
    }

    // Listen for SSE task events
    const unsubCreate = event.on("task.created", (task) => {
      if (belongsInArea(task)) {
        debouncedFetch()
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
      // Check if task is currently in any section
      let isInSections = false
      for (const section of store.sections) {
        if (section.tasks.some((t) => t.id === task.id)) {
          isInSections = true
          break
        }
      }

      if (isInSections) {
        if (!belongsInArea(task)) {
          // Task was moved out of area - remove it immediately
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks.filter((t) => t.id !== task.id),
            })),
          )
        } else {
          // Update in place
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
        // Task moved into area - refetch
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

    // Listen for area updates
    const unsubAreaUpdate = event.on("area.updated", (area) => {
      if (area.id === props.areaId) {
        setStore("area", {
          id: area.id,
          title: area.title,
        })
      }
    })

    // Listen for project updates (might affect area's project list)
    const unsubProjectUpdate = event.on("project.updated", () => {
      debouncedFetch()
    })

    const unsubProjectCreate = event.on("project.created", () => {
      debouncedFetch()
    })

    const unsubProjectDelete = event.on("project.deleted", () => {
      debouncedFetch()
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubAreaUpdate()
      unsubProjectUpdate()
      unsubProjectCreate()
      unsubProjectDelete()
      if (refetchTimeout) clearTimeout(refetchTimeout)
    })

    createEffect(() => {
      if (sdk.isReady) {
        fetchArea(true)
      }
    })

    const updateTask = async (id: string, updates: Partial<TaskInfo>) => {
      setStore("error", undefined)

      // Optimistic update for isSomeday changes - move task between sections
      if (updates.isSomeday !== undefined) {
        setStore("sections", (sections) => {
          // Find the task and its current section
          let task: TaskInfo | undefined
          let fromSectionIndex = -1

          for (let i = 0; i < sections.length; i++) {
            const found = sections[i].tasks.find((t) => t.id === id)
            if (found) {
              task = { ...found, ...updates }
              fromSectionIndex = i
              break
            }
          }

          if (!task || fromSectionIndex === -1) return sections

          // Remove task from current section
          const withoutTask = sections.map((section, i) => {
            if (i !== fromSectionIndex) return section
            return { ...section, tasks: section.tasks.filter((t) => t.id !== id) }
          })

          if (updates.isSomeday) {
            // Moving to someday - find or create someday section
            const somedayIndex = withoutTask.findIndex((s) => s.isBacklog)
            if (somedayIndex >= 0) {
              // Add to existing someday section
              return withoutTask.map((section, i) => {
                if (i !== somedayIndex) return section
                return { ...section, tasks: [...section.tasks, task!] }
              })
            } else {
              // Create new someday section
              const newSomedaySection: Section = {
                id: "section:someday",
                title: "Someday",
                tasks: [task],
                areaId: props.areaId,
                isBacklog: true,
              }
              return [...withoutTask, newSomedaySection]
            }
          } else {
            // Moving from someday to unheaded section
            const unheadedIndex = withoutTask.findIndex((s) => s.id === "section:unheaded")
            if (unheadedIndex >= 0) {
              return withoutTask.map((section, i) => {
                if (i !== unheadedIndex) return section
                return { ...section, tasks: [...section.tasks, task!] }
              })
            } else {
              // Create unheaded section if it doesn't exist
              const newUnheadedSection: Section = {
                id: "section:unheaded",
                title: "",
                tasks: [task],
                areaId: props.areaId,
              }
              return [newUnheadedSection, ...withoutTask]
            }
          }
        })
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
            headingId: updates.headingId ?? null,
            isEvening: updates.isEvening,
            isSomeday: updates.isSomeday,
            trashedAt: updates.trashedAt,
          },
        })
        if (error) {
          throw new Error(`Failed to update task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[AreaData] update error:", e)
        setStore("error", String(e))
        fetchArea() // Revert on error
        return null
      }
    }

    const updateArea = async (updates: Partial<AreaInfo>) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("area", (a) => (a ? { ...a, ...updates } : a))

      try {
        const { data, error } = await sdk.client.putApiV1AreasById({
          id: props.areaId,
          updateArea: {
            title: updates.title,
          },
        })
        if (error) {
          throw new Error(`Failed to update area: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[AreaData] update area error:", e)
        setStore("error", String(e))
        fetchArea() // Revert on error
        return null
      }
    }

    const completeTask = async (id: string, completed: boolean) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completedAt: completed ? new Date().toISOString() : null,
                }
              : t,
          ),
        })),
      )

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
        console.error("[AreaData] complete error:", e)
        setStore("error", String(e))
        fetchArea() // Revert on error
        return null
      }
    }

    const cancelTask = async (id: string) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: "cancelled",
                  completedAt: new Date().toISOString(),
                }
              : t,
          ),
        })),
      )

      try {
        const { data, error } = await sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            status: "cancelled",
          },
        })
        if (error) {
          throw new Error(`Failed to cancel task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[AreaData] cancel error:", e)
        setStore("error", String(e))
        fetchArea() // Revert on error
        return null
      }
    }

    const uncancelTask = async (id: string) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: "active",
                  completedAt: null,
                }
              : t,
          ),
        })),
      )

      try {
        const { data, error } = await sdk.client.putApiV1TasksById({
          id,
          updateTask: {
            status: "active",
          },
        })
        if (error) {
          throw new Error(`Failed to uncancel task: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[AreaData] uncancel error:", e)
        setStore("error", String(e))
        fetchArea() // Revert on error
        return null
      }
    }

    const reorderTasks = async (taskIds: string[], sectionId?: string) => {
      // Optimistic update
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

      try {
        const { error } = await sdk.client.postApiV1TasksReorder({
          reorderTasks: {
            ids: taskIds,
            contextType: "area",
            contextId: props.areaId,
          },
        })
        if (error) {
          fetchArea() // Revert on error
          return false
        }
        return true
      } catch (e) {
        console.error("[AreaData] reorder error:", e)
        fetchArea()
        return false
      }
    }

    const moveTask = async (
      taskId: string,
      fromSectionId: string,
      toSectionId: string,
      newTaskIds: string[],
      updates: Partial<TaskInfo>,
    ) => {
      // Optimistic update
      setStore("sections", (sections) => {
        let task: TaskInfo | undefined

        const withoutTask = sections.map((section) => {
          if (section.id !== fromSectionId) return section
          const found = section.tasks.find((t) => t.id === taskId)
          if (found) task = { ...found, ...updates }
          return {
            ...section,
            tasks: section.tasks.filter((t) => t.id !== taskId),
          }
        })

        if (!task) return sections

        // Check if target section exists
        const targetExists = withoutTask.some((s) => s.id === toSectionId)

        // If moving to someday section that doesn't exist yet, create it
        if (!targetExists && (toSectionId === "section:someday" || updates.isSomeday)) {
          const newSomedaySection: Section = {
            id: "section:someday",
            title: "Someday",
            tasks: [{ ...task, position: 0 }],
            areaId: props.areaId,
            isBacklog: true,
          }
          return [...withoutTask, newSomedaySection]
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

      try {
        await Promise.all([
          sdk.client.putApiV1TasksById({
            id: taskId,
            updateTask: {
              title: updates.title,
              notes: updates.notes,
              status: updates.status as any,
              scheduledDate: updates.scheduledDate,
              deadline: updates.deadline,
              listId: updates.listId,
              headingId: updates.headingId ?? null,
              isEvening: updates.isEvening,
              isSomeday: updates.isSomeday,
            },
          }),
          sdk.client.postApiV1TasksReorder({
            reorderTasks: { ids: newTaskIds, contextType: "area", contextId: props.areaId },
          }),
        ])
        return true
      } catch (e) {
        console.error("[AreaData] move error:", e)
        fetchArea()
        return false
      }
    }

    const deleteArea = async (): Promise<{ success: boolean; error?: string }> => {
      setStore("error", undefined)

      try {
        const { error } = await sdk.client.deleteApiV1AreasById({
          id: props.areaId,
        })
        if (error) {
          // Extract error message from response
          const errorMessage =
            typeof error === "object" && error !== null && "error" in error
              ? (error as { error: string }).error
              : "Failed to delete area"
          return { success: false, error: errorMessage }
        }
        return { success: true }
      } catch (e) {
        console.error("[AreaData] delete area error:", e)
        setStore("error", String(e))
        return { success: false, error: String(e) }
      }
    }

    const getContentCount = async (): Promise<{ projectCount: number; taskCount: number }> => {
      try {
        const { data, error } = await sdk.client.getApiV1AreasByIdContentCount({
          id: props.areaId,
        })
        if (error || !data) {
          return { projectCount: 0, taskCount: 0 }
        }
        return { projectCount: data.projectCount, taskCount: data.taskCount }
      } catch (e) {
        console.error("[AreaData] get content count error:", e)
        return { projectCount: 0, taskCount: 0 }
      }
    }

    const updateTemplate = async (id: string, updates: Partial<TemplateInfo>) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: section.templates?.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      )

      try {
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
          throw new Error(`Failed to update template: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[AreaData] update template error:", e)
        setStore("error", String(e))
        fetchArea()
        return null
      }
    }

    const deleteTemplate = async (id: string) => {
      setStore("error", undefined)

      // Optimistic update - remove from sections
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: section.templates?.filter((t) => t.id !== id),
        })),
      )

      try {
        const { error } = await sdk.client.deleteApiV1RepeatingRulesById({
          id,
        })
        if (error) {
          throw new Error(`Failed to delete template: ${error}`)
        }
        return true
      } catch (e) {
        console.error("[AreaData] delete template error:", e)
        setStore("error", String(e))
        fetchArea()
        return false
      }
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
      updateTask,
      updateArea,
      deleteArea,
      getContentCount,
      completeTask,
      cancelTask,
      uncancelTask,
      reorderTasks,
      moveTask,
      updateTemplate,
      deleteTemplate,
      refetch: fetchArea,
    }
  },
})
