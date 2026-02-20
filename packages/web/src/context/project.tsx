import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import type { Section } from "@/components/tasks/types"
import { toast } from "@/lib/toast"
import { createSimpleContext } from "./context"
import type { TaskInfo, TemplateInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"
import { useTaskRepository } from "./task-repository"

type ProjectInfo = {
  id: string
  title: string
  notes: string | null
  status: string
  areaId: string | null
  progress: number
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
    const repo = useTaskRepository()

    const [store, setStore] = createStore<ProjectDataStore>({
      project: null,
      sections: [],
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

      const { data, error } = await sdk.client.getApiV1ViewsProjectById({
        id: props.projectId,
      })
      if (error) {
        setStore("error", `Failed to fetch project: ${error}`)
        if (showLoading) setStore("loading", false)
        return
      }
      setStore("project", (data?.project as ProjectInfo) ?? null)
      setStore("sections", reconcile((data?.sections ?? []) as Section[]))
      if (showLoading) {
        setStore("loading", false)
      }
    }

    const belongsInProject = (task: TaskInfo): boolean => {
      if (task.trashedAt) return false
      return task.listId === props.projectId
    }

    // ================== SSE EVENT HANDLERS ==================

    const unsubCreate = event.on("task.created", (task) => {
      if (belongsInProject(task)) {
        debouncedFetch()
      }
    })

    const unsubUpdate = event.on("task.updated", (task) => {
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

      let currentTask: TaskInfo | undefined
      for (const section of store.sections) {
        const found = section.tasks.find((t) => t.id === task.id)
        if (found) {
          currentTask = found
          break
        }
      }

      if (currentTask) {
        if (!belongsInProject(task)) {
          setStore("sections", (sections) =>
            sections.map((section) => ({
              ...section,
              tasks: section.tasks.filter((t) => t.id !== task.id),
            })),
          )
        } else {
          const headingChanged = currentTask.headingId !== task.headingId
          const somedayChanged = currentTask.isSomeday !== task.isSomeday

          if (headingChanged || somedayChanged) {
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
        }
      } else if (belongsInProject(task)) {
        const target = store.sections.find(
          (s) => s.headingId === task.headingId || (!task.headingId && !s.headingId && !s.isBacklog),
        )

        if (target) {
          setStore("sections", (sections) =>
            sections.map((section) => {
              if (section.id === target.id) {
                return { ...section, tasks: [...section.tasks, task].sort((a, b) => a.position - b.position) }
              }
              return section
            }),
          )
        } else {
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

    const unsubProjectUpdate = event.on("project.updated", (project) => {
      if (project.id === props.projectId) {
        setStore("project", (p) => ({
          id: project.id,
          title: project.title,
          notes: project.notes,
          status: project.status,
          areaId: project.areaId,
          progress: p?.progress ?? 0,
        }))
      }
    })

    const unsubHeadingUpdate = event.on("heading.updated", (heading) => {
      setStore("sections", (sections) =>
        sections.map((section) => (section.headingId === heading.id ? { ...section, title: heading.title } : section)),
      )
    })

    const unsubHeadingCreate = event.on("heading.created", (heading) => {
      if (heading.projectId === props.projectId) {
        debouncedFetch()
      }
    })

    const unsubHeadingDelete = event.on("heading.deleted", ({ projectId }) => {
      if (projectId === props.projectId) {
        debouncedFetch()
      }
    })

    const unsubReorder = event.on("tasks.reordered", ({ contextType, contextId, taskIds }) => {
      if (contextType !== "project" || contextId !== props.projectId) return
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

    // On SSE reconnect, refetch project data to catch up on missed events
    const unsubReconnect = event.on("server.reconnected", () => {
      fetchProject()
    })

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
      unsubProjectUpdate()
      unsubHeadingUpdate()
      unsubHeadingCreate()
      unsubHeadingDelete()
      unsubReorder()
      unsubReconnect()
      if (refetchTimeout) clearTimeout(refetchTimeout)
    })

    createEffect(() => {
      if (sdk.isReady) {
        fetchProject(true)
      }
    })

    // ================== PROJECT-SPECIFIC MUTATIONS ==================

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
            const backlogIdx = withoutTask.findIndex((s) => s.isBacklog)
            if (backlogIdx >= 0) {
              return withoutTask.map((section, i) => {
                if (i !== backlogIdx) return section
                return { ...section, tasks: [...section.tasks, task!] }
              })
            }
            return [
              ...withoutTask,
              {
                id: "section:backlog",
                title: "Someday",
                tasks: [task],
                projectId: props.projectId,
                isBacklog: true,
              },
            ]
          }

          const unheadedIdx = withoutTask.findIndex((s) => s.id === "section:unheaded")
          if (unheadedIdx >= 0) {
            return withoutTask.map((section, i) => {
              if (i !== unheadedIdx) return section
              return { ...section, tasks: [...section.tasks, task!] }
            })
          }
          return [{ id: "section:unheaded", title: "", tasks: [task], projectId: props.projectId }, ...withoutTask]
        })
      }

      const result = await repo.updateTask(id, updates)
      if (!result) fetchProject()
      return result
    }

    const updateProject = async (updates: Partial<ProjectInfo>) => {
      setStore("error", undefined)
      setStore("project", (p) => (p ? { ...p, ...updates } : p))

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
        setStore("error", `Failed to update project: ${error}`)
        fetchProject()
        return null
      }
      return data
    }

    const completeTask = async (id: string, completed: boolean) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            t.id === id ? { ...t, completedAt: completed ? new Date().toISOString() : null } : t,
          ),
        })),
      )

      const result = await repo.completeTask(id, completed)
      fetchProject()
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
      fetchProject()
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
      fetchProject()
      return result
    }

    const restoreFromLogbook = async (id: string): Promise<{ success: boolean; error?: string }> => {
      // Optimistically remove from logged section
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          tasks: section.isLogged ? section.tasks.filter((t) => t.id !== id) : section.tasks,
        })),
      )

      const { error } = await sdk.client.postApiV1TasksByIdRestoreFromLogbook({ id })
      if (error) {
        const msg =
          typeof error === "object" && error !== null && "error" in error
            ? (error as { error: string }).error
            : "Failed to restore task"
        fetchProject()
        return { success: false, error: msg }
      }
      fetchProject()
      return { success: true }
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
        reorderTasks: { ids: taskIds, contextType: "project", contextId: props.projectId },
      })
      isReordering = false

      if (error) {
        fetchProject()
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
      isReordering = true

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

        if (!targetExists && (toSectionId === "section:backlog" || updates.isSomeday)) {
          return [
            ...withoutTask,
            {
              id: "section:backlog",
              title: "Someday",
              tasks: [{ ...task, position: 0 }],
              projectId: props.projectId,
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
      isReordering = false

      if (updateResult.error || reorderResult.error) {
        fetchProject()
        return false
      }
      return true
    }

    // ================== HEADING OPERATIONS ==================

    const updateHeading = async (headingId: string, title: string) => {
      setStore("error", undefined)
      setStore("sections", (sections) =>
        sections.map((section) => (section.headingId === headingId ? { ...section, title } : section)),
      )

      const { error } = await sdk.client.putApiV1HeadingsById({
        id: headingId,
        updateHeading: { title },
      })
      if (error) {
        setStore("error", `Failed to update heading: ${error}`)
        fetchProject()
        return null
      }
      return true
    }

    const createHeading = async (title: string, isBacklog = false) => {
      setStore("error", undefined)

      const sections = store.sections
      const regularHeadings = sections.filter((s) => s.headingId && !s.isBacklog)
      const position = regularHeadings.length

      const { data, error } = await sdk.client.postApiV1Headings({
        createHeading: { title, projectId: props.projectId, isBacklog, position },
      })
      if (error) {
        toast.error("Failed to create heading")
        setStore("error", `Failed to create heading: ${error}`)
        return null
      }
      return data
    }

    const deleteHeading = async (headingId: string): Promise<{ success: boolean; error?: string }> => {
      setStore("error", undefined)

      const { error } = await sdk.client.deleteApiV1HeadingsById({ id: headingId })
      if (error) {
        const msg =
          typeof error === "object" && error !== null && "error" in error
            ? (error as { error: string }).error
            : "Failed to delete heading"
        return { success: false, error: msg }
      }
      return { success: true }
    }

    const moveHeading = async (headingId: string, direction: "up" | "down") => {
      setStore("error", undefined)

      const sections = store.sections
      const headings = sections.filter((s) => s.headingId && !s.isBacklog)
      const idx = headings.findIndex((s) => s.headingId === headingId)

      if (idx === -1) return false

      const target = direction === "up" ? idx - 1 : idx + 1
      if (target < 0 || target >= headings.length) return false

      const current = headings[idx]
      const other = headings[target]

      const [r1, r2] = await Promise.all([
        sdk.client.putApiV1HeadingsById({ id: current.headingId!, updateHeading: { position: target } }),
        sdk.client.putApiV1HeadingsById({ id: other.headingId!, updateHeading: { position: idx } }),
      ])

      if (r1.error || r2.error) {
        toast.error(`Failed to move heading ${direction}`)
        setStore("error", `Failed to move heading: ${r1.error || r2.error}`)
      }

      await fetchProject()
      return !r1.error && !r2.error
    }

    // ================== PROJECT-LEVEL OPERATIONS ==================

    const getActiveTaskCount = async () => {
      const { data, error } = await sdk.client.getApiV1ProjectsByIdTaskCount({ id: props.projectId })
      if (error) return 0
      return data?.count ?? 0
    }

    const completeProject = async () => {
      setStore("error", undefined)

      const { data, error } = await sdk.client.postApiV1ProjectsByIdComplete({ id: props.projectId })
      if (error) {
        setStore("error", `Failed to complete project: ${error}`)
        return { success: false, affectedTasks: 0 }
      }
      return { success: true, affectedTasks: data?.affectedTasks ?? 0 }
    }

    const deleteProject = async () => {
      setStore("error", undefined)

      const { data, error } = await sdk.client.deleteApiV1ProjectsById({ id: props.projectId })
      if (error) {
        setStore("error", `Failed to delete project: ${error}`)
        return { success: false, affectedTasks: 0 }
      }
      return { success: true, affectedTasks: data?.affectedTasks ?? 0 }
    }

    const updateTemplate = async (id: string, updates: Partial<TemplateInfo>) => {
      setStore("sections", (sections) =>
        sections.map((section) => ({
          ...section,
          templates: section.templates?.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      )

      const result = await repo.updateTemplate(id, updates)
      if (!result) fetchProject()
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
      if (!result) fetchProject()
      return result
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

      // Task mutations (delegate to repo for API calls)
      updateTask,
      completeTask,
      cancelTask,
      uncancelTask,
      restoreFromLogbook,
      reorderTasks,
      moveTask,

      // Project-specific operations
      updateProject,
      updateHeading,
      createHeading,
      deleteHeading,
      moveHeading,
      getActiveTaskCount,
      completeProject,
      deleteProject,

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

      refetch: fetchProject,
    }
  },
})
