import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { Section } from "@/components/tasks/types"
import { toast } from "@/lib/toast"
import { createSimpleContext } from "./context"
import type { TaskInfo, TemplateInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"

type ProjectInfo = {
  id: string
  title: string
  notes: string | null
  status: string
  areaId: string | null
}

type ProjectDataStore = {
  project: ProjectInfo | null
  sections: Section[]
  loading: boolean
  error: string | undefined
}

export const { use: useProjectData, provider: ProjectDataProvider } = createSimpleContext({
  name: "ProjectData",
  init: (props: { projectId: string }) => {
    const sdk = useSDK()
    const event = useEvent()

    const [store, setStore] = createStore<ProjectDataStore>({
      project: null,
      sections: [],
      loading: true,
      error: undefined,
    })

    let refetchTimeout: ReturnType<typeof setTimeout> | null = null
    let pendingRefetch = false

    // Flag to skip SSE updates during local reorder operations
    let isReordering = false

    const debouncedFetch = () => {
      if (refetchTimeout) {
        pendingRefetch = true
        return
      }

      fetchProject()

      refetchTimeout = setTimeout(() => {
        refetchTimeout = null
        if (pendingRefetch) {
          pendingRefetch = false
          fetchProject()
        }
      }, 300)
    }

    const fetchProject = async (showLoading = false) => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      if (showLoading) {
        setStore("loading", true)
      }
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.getApiV1ViewsProjectById({
          id: props.projectId,
        })
        if (error) {
          throw new Error(`Failed to fetch project: ${error}`)
        }
        setStore("project", data?.project as any)
        setStore("sections", reconcile((data?.sections ?? []) as any))
      } catch (e) {
        console.error("[ProjectData] fetch error:", e)
        setStore("error", String(e))
      }
      if (showLoading) {
        setStore("loading", false)
      }
    }

    const belongsInProject = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      return task.listId === props.projectId
    }

    // Listen for SSE task events
    const unsubCreate = event.on("task.created", (task) => {
      if (belongsInProject(task)) {
        debouncedFetch()
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
      // Skip position-only updates during local reorder to prevent flashing
      if (isReordering) {
        for (const section of store.sections) {
          const existing = section.tasks.find((t) => t.id === task.id)
          if (existing) {
            const isPositionOnly =
              existing.title === task.title &&
              existing.status === task.status &&
              existing.headingId === task.headingId &&
              existing.isSomeday === task.isSomeday
            if (isPositionOnly) return
          }
        }
      }

      // Check if task is currently in any section and find which one
      let currentSection: Section | undefined
      let currentTask: TaskInfo | undefined
      for (const section of store.sections) {
        const found = section.tasks.find((t) => t.id === task.id)
        if (found) {
          currentSection = section
          currentTask = found
          break
        }
      }

      const isInSections = !!currentSection

      if (isInSections && currentTask) {
        if (!belongsInProject(task)) {
          // Task was moved out of project - remove it immediately
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks.filter((t) => t.id !== task.id),
            })),
          )
        } else {
          // Check if the task should move to a different section
          // This happens when headingId changes or isSomeday changes
          const headingChanged = currentTask.headingId !== task.headingId
          const somedayChanged = currentTask.isSomeday !== task.isSomeday

          if (headingChanged || somedayChanged) {
            // Update in place first (optimistic), then refetch for correct grouping
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
            // Update in place within same section
            // Preserve position since SSE events send position: 0
            setStore("sections", (sections) =>
              sections.map((section) => ({
                ...section,
                tasks: section.tasks
                  .map((t) => (t.id === task.id ? { ...task, tags: task.tags ?? t.tags, position: t.position } : t))
                  .sort((a, b) => a.position - b.position),
              })),
            )
          }
        }
      } else if (belongsInProject(task)) {
        // Task moved into project - try to add to appropriate section
        const targetSection = store.sections.find(
          (s) => s.headingId === task.headingId || (!task.headingId && !s.headingId && !s.isBacklog),
        )

        if (targetSection) {
          // Add to existing section
          setStore("sections", (sections) =>
            sections.map((section) => {
              if (section.id === targetSection.id) {
                return {
                  ...section,
                  tasks: [...section.tasks, task].sort((a, b) => a.position - b.position),
                }
              }
              return section
            }),
          )
        } else {
          // Need to refetch to get correct section
          fetchProject()
        }
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

    // Listen for project updates
    const unsubProjectUpdate = event.on("project.updated", (project) => {
      if (project.id === props.projectId) {
        setStore("project", {
          id: project.id,
          title: project.title,
          notes: project.notes,
          status: project.status,
          areaId: project.areaId,
        })
      }
    })

    // Listen for heading updates
    const unsubHeadingUpdate = event.on("heading.updated", (heading) => {
      // Update section title if this heading belongs to current project
      setStore("sections", (sections) =>
        sections.map((section) => (section.headingId === heading.id ? { ...section, title: heading.title } : section)),
      )
    })

    // Listen for heading creation - refetch to get new section
    const unsubHeadingCreate = event.on("heading.created", (heading) => {
      if (heading.projectId === props.projectId) {
        debouncedFetch()
      }
    })

    // Listen for heading deletion - refetch to update sections
    const unsubHeadingDelete = event.on("heading.deleted", ({ projectId }) => {
      if (projectId === props.projectId) {
        debouncedFetch()
      }
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubProjectUpdate()
      unsubHeadingUpdate()
      unsubHeadingCreate()
      unsubHeadingDelete()
      if (refetchTimeout) clearTimeout(refetchTimeout)
    })

    createEffect(() => {
      if (sdk.isReady) {
        fetchProject(true)
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
            // Moving to backlog - find or create backlog section
            const backlogIndex = withoutTask.findIndex((s) => s.isBacklog)
            if (backlogIndex >= 0) {
              // Add to existing backlog section
              return withoutTask.map((section, i) => {
                if (i !== backlogIndex) return section
                return { ...section, tasks: [...section.tasks, task!] }
              })
            } else {
              // Create new backlog section
              const newBacklogSection: Section = {
                id: "section:backlog",
                title: "Someday",
                tasks: [task],
                projectId: props.projectId,
                isBacklog: true,
              }
              return [...withoutTask, newBacklogSection]
            }
          } else {
            // Moving from backlog to unheaded section
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
                projectId: props.projectId,
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
        console.error("[ProjectData] update error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
        return null
      }
    }

    const updateProject = async (updates: Partial<ProjectInfo>) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("project", (p) => (p ? { ...p, ...updates } : p))

      try {
        const { data, error } = await sdk.client.putApiV1ProjectsById({
          id: props.projectId,
          updateProject: {
            title: updates.title,
            notes: updates.notes,
            status: updates.status as "active" | "completed" | "trashed" | undefined,
            areaId: updates.areaId,
          },
        })
        if (error) {
          throw new Error(`Failed to update project: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[ProjectData] update project error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
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
        console.error("[ProjectData] complete error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
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
        console.error("[ProjectData] cancel error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
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
        console.error("[ProjectData] uncancel error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
        return null
      }
    }

    const reorderTasks = async (taskIds: string[], sectionId?: string) => {
      // Set flag to skip SSE position updates during reorder
      isReordering = true

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
            contextType: "project",
            contextId: props.projectId,
          },
        })
        if (error) {
          fetchProject() // Revert on error
          return false
        }
        return true
      } catch (e) {
        console.error("[ProjectData] reorder error:", e)
        fetchProject()
        return false
      } finally {
        isReordering = false
      }
    }

    const moveTask = async (
      taskId: string,
      fromSectionId: string,
      toSectionId: string,
      newTaskIds: string[],
      updates: Partial<TaskInfo>,
    ) => {
      // Set flag to skip SSE position updates during move
      isReordering = true

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

        // If moving to virtual backlog section that doesn't exist yet, create it
        if (!targetExists && (toSectionId === "section:backlog" || updates.isSomeday)) {
          const newBacklogSection: Section = {
            id: "section:backlog",
            title: "Someday",
            tasks: [{ ...task, position: 0 }],
            projectId: props.projectId,
            isBacklog: true,
          }
          return [...withoutTask, newBacklogSection]
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
        // With the new model:
        // - listId stays as the project ID (task stays in the same project)
        // - headingId changes to the target heading (or null for no heading)
        await Promise.all([
          sdk.client.putApiV1TasksById({
            id: taskId,
            updateTask: {
              title: updates.title,
              notes: updates.notes,
              status: updates.status as any,
              scheduledDate: updates.scheduledDate,
              deadline: updates.deadline,
              listId: props.projectId,
              headingId: updates.headingId ?? null,
              isEvening: updates.isEvening,
              isSomeday: updates.isSomeday,
            },
          }),
          sdk.client.postApiV1TasksReorder({
            reorderTasks: { ids: newTaskIds, contextType: "project", contextId: props.projectId },
          }),
        ])
        return true
      } catch (e) {
        console.error("[ProjectData] move error:", e)
        fetchProject()
        return false
      }
    }

    const updateHeading = async (headingId: string, title: string) => {
      setStore("error", undefined)

      // Optimistic update
      setStore("sections", (sections) =>
        sections.map((section) => (section.headingId === headingId ? { ...section, title } : section)),
      )

      try {
        const { data, error } = await sdk.client.putApiV1HeadingsById({
          id: headingId,
          updateHeading: {
            title,
          },
        })
        if (error) {
          throw new Error(`Failed to update heading: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[ProjectData] update heading error:", e)
        setStore("error", String(e))
        fetchProject() // Revert on error
        return null
      }
    }

    const createHeading = async (title: string, isBacklog = false) => {
      setStore("error", undefined)

      // Calculate position: place new headings before the backlog
      const sections = store.sections
      const regularHeadings = sections.filter((s) => s.headingId && !s.isBacklog)

      // Position should be after last regular heading but before backlog
      const position = regularHeadings.length

      try {
        const { data, error } = await sdk.client.postApiV1Headings({
          createHeading: {
            title,
            projectId: props.projectId,
            isBacklog,
            position,
          },
        })
        if (error) {
          throw new Error(`Failed to create heading: ${error}`)
        }
        // The heading.created event will trigger a refetch
        return data
      } catch (e) {
        console.error("[ProjectData] create heading error:", e)
        toast.error("Failed to create heading")
        setStore("error", String(e))
        return null
      }
    }

    const deleteHeading = async (headingId: string): Promise<{ success: boolean; error?: string }> => {
      setStore("error", undefined)

      try {
        const { error } = await sdk.client.deleteApiV1HeadingsById({
          id: headingId,
        })
        if (error) {
          // Extract error message from response
          const errorMessage =
            typeof error === "object" && error !== null && "error" in error
              ? (error as { error: string }).error
              : "Failed to delete heading"
          return { success: false, error: errorMessage }
        }
        // The heading.deleted event will trigger a refetch
        return { success: true }
      } catch (e) {
        console.error("[ProjectData] delete heading error:", e)
        setStore("error", String(e))
        return { success: false, error: String(e) }
      }
    }

    const moveHeading = async (headingId: string, direction: "up" | "down") => {
      setStore("error", undefined)

      // Get all regular headings (non-backlog)
      const sections = store.sections
      const headings = sections.filter((s) => s.headingId && !s.isBacklog)
      const currentIndex = headings.findIndex((s) => s.headingId === headingId)

      if (currentIndex === -1) return false

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= headings.length) return false

      try {
        // Swap positions
        const currentHeading = headings[currentIndex]
        const targetHeading = headings[newIndex]

        // Update both headings' positions
        await Promise.all([
          sdk.client.putApiV1HeadingsById({
            id: currentHeading.headingId!,
            updateHeading: {
              position: newIndex,
            },
          }),
          sdk.client.putApiV1HeadingsById({
            id: targetHeading.headingId!,
            updateHeading: {
              position: currentIndex,
            },
          }),
        ])

        // Refetch to get updated order
        await fetchProject()
        return true
      } catch (e) {
        console.error("[ProjectData] move heading error:", e)
        toast.error(`Failed to move heading ${direction}`)
        setStore("error", String(e))
        fetchProject() // Revert on error
        return false
      }
    }

    const getActiveTaskCount = async () => {
      try {
        const { data, error } = await sdk.client.getApiV1ProjectsByIdTaskCount({
          id: props.projectId,
        })
        if (error) {
          console.error("[ProjectData] get task count error:", error)
          return 0
        }
        return data?.count ?? 0
      } catch (e) {
        console.error("[ProjectData] get task count error:", e)
        return 0
      }
    }

    const completeProject = async () => {
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.postApiV1ProjectsByIdComplete({
          id: props.projectId,
        })
        if (error) {
          throw new Error(`Failed to complete project: ${error}`)
        }
        return { success: true, affectedTasks: data?.affectedTasks ?? 0 }
      } catch (e) {
        console.error("[ProjectData] complete project error:", e)
        setStore("error", String(e))
        return { success: false, affectedTasks: 0 }
      }
    }

    const deleteProject = async () => {
      setStore("error", undefined)

      try {
        const { data, error } = await sdk.client.deleteApiV1ProjectsById({
          id: props.projectId,
        })
        if (error) {
          throw new Error(`Failed to delete project: ${error}`)
        }
        return { success: true, affectedTasks: data?.affectedTasks ?? 0 }
      } catch (e) {
        console.error("[ProjectData] delete project error:", e)
        setStore("error", String(e))
        return { success: false, affectedTasks: 0 }
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
        console.error("[ProjectData] update template error:", e)
        setStore("error", String(e))
        fetchProject()
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
        console.error("[ProjectData] delete template error:", e)
        setStore("error", String(e))
        fetchProject()
        return false
      }
    }

    return {
      get project() {
        return store.project
      },
      get sections() {
        return store.sections
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },
      updateTask,
      updateProject,
      updateHeading,
      createHeading,
      deleteHeading,
      moveHeading,
      completeTask,
      cancelTask,
      uncancelTask,
      reorderTasks,
      moveTask,
      getActiveTaskCount,
      completeProject,
      deleteProject,
      updateTemplate,
      deleteTemplate,
      refetch: fetchProject,
    }
  },
})
