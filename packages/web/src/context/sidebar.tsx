import { createEffect, createMemo, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "./context"
import type { TaskInfo } from "./data"
import { useEvent } from "./event"
import { useSDK } from "./sdk"

export type ProjectInfo = {
  id: string
  title: string
  notes: string | null
  status: string
  position: number
  areaId: string | null
  completedAt: string | null
  trashedAt: string | null
  createdAt: string
}

export type AreaInfo = {
  id: string
  title: string
  position: number
  createdAt: string
}

export type TagInfo = {
  id: string
  title: string
  position: number
  createdAt: string
}

export type HeadingInfo = {
  id: string
  title: string
  projectId: string
}

// Helper to get list type from ID prefix (for listId)
export type ListType = "area" | "project" | null

export function getListType(listId: string | null): ListType {
  if (!listId) return null
  if (listId.startsWith("area_")) return "area"
  if (listId.startsWith("prj_")) return "project"
  return null
}

// Helper to check if an ID is a heading
export function isHeadingId(id: string | null): boolean {
  return !!id && id.startsWith("hdg_")
}

// Helper to check if an ID is a project
export function isProjectId(id: string | null): boolean {
  return !!id && id.startsWith("prj_")
}

// Helper to check if an ID is an area
export function isAreaId(id: string | null): boolean {
  return !!id && id.startsWith("area_")
}

type SidebarStore = {
  projects: ProjectInfo[]
  areas: AreaInfo[]
  tags: TagInfo[]
  loading: boolean
  error: string | undefined
}

export const { use: useSidebarData, provider: SidebarDataProvider } = createSimpleContext({
  name: "SidebarData",
  init: () => {
    const sdk = useSDK()
    const event = useEvent()

    const [store, setStore] = createStore<SidebarStore>({
      projects: [],
      areas: [],
      tags: [],
      loading: true,
      error: undefined,
    })

    const fetchProjects = async () => {
      const { data, error } = await sdk.client.getApiV1Projects()
      if (error) {
        throw new Error(`Failed to fetch projects: ${error}`)
      }
      return data
    }

    const fetchAreas = async () => {
      const { data, error } = await sdk.client.getApiV1Areas()
      if (error) {
        throw new Error(`Failed to fetch areas: ${error}`)
      }
      return data
    }

    const fetchTags = async () => {
      const { data, error } = await sdk.client.getApiV1Tags()
      if (error) {
        throw new Error(`Failed to fetch tags: ${error}`)
      }
      return data
    }

    const fetchAll = async () => {
      if (!sdk.isReady) {
        setStore("loading", false)
        return
      }

      const empty = store.projects.length === 0 && store.areas.length === 0 && store.tags.length === 0
      if (empty) {
        setStore("loading", true)
      }
      setStore("error", undefined)

      try {
        const [projects, areas, tags] = await Promise.all([fetchProjects(), fetchAreas(), fetchTags()])
        setStore("projects", reconcile((projects ?? []) as ProjectInfo[]))
        setStore("areas", reconcile((areas ?? []) as AreaInfo[]))
        setStore("tags", reconcile((tags ?? []) as TagInfo[]))
      } catch (e) {
        console.error("[SidebarData] fetch error:", e)
        setStore("error", String(e))
      }
      setStore("loading", false)
    }

    // Listen for SSE events
    const unsubProjectCreate = event.on("project.created", (project) => {
      setStore("projects", (projects) => {
        if (projects.some((p) => p.id === project.id)) return projects
        return [...projects, project].sort((a, b) => a.position - b.position)
      })
    })

    const unsubProjectUpdate = event.on("project.updated", (project) => {
      setStore("projects", (projects) => {
        const index = projects.findIndex((p) => p.id === project.id)
        if (index === -1) return projects
        const updated = [...projects]
        updated[index] = project
        return updated.sort((a, b) => a.position - b.position)
      })
    })

    const unsubProjectDelete = event.on("project.deleted", ({ id }) => {
      setStore("projects", (projects) => projects.filter((p) => p.id !== id))
    })

    const unsubAreaCreate = event.on("area.created", (area) => {
      setStore("areas", (areas) => {
        if (areas.some((a) => a.id === area.id)) return areas
        return [...areas, area].sort((a, b) => a.position - b.position)
      })
    })

    const unsubAreaUpdate = event.on("area.updated", (area) => {
      setStore("areas", (areas) => {
        const index = areas.findIndex((a) => a.id === area.id)
        if (index === -1) return areas
        const updated = [...areas]
        updated[index] = area
        return updated.sort((a, b) => a.position - b.position)
      })
    })

    const unsubAreaDelete = event.on("area.deleted", ({ id }) => {
      setStore("areas", (areas) => areas.filter((a) => a.id !== id))
    })

    const unsubTagCreate = event.on("tag.created", (tag) => {
      setStore("tags", (tags) => {
        if (tags.some((t) => t.id === tag.id)) return tags
        return [...tags, tag].sort((a, b) => a.position - b.position)
      })
    })

    const unsubTagUpdate = event.on("tag.updated", (tag) => {
      setStore("tags", (tags) => {
        const index = tags.findIndex((t) => t.id === tag.id)
        if (index === -1) return tags
        const updated = [...tags]
        updated[index] = tag
        return updated.sort((a, b) => a.position - b.position)
      })
    })

    const unsubTagDelete = event.on("tag.deleted", ({ id }) => {
      setStore("tags", (tags) => tags.filter((t) => t.id !== id))
    })

    // On SSE reconnect, refetch all sidebar data to catch up on missed events
    const unsubReconnect = event.on("server.reconnected", () => {
      fetchAll()
      fetchTasks()
    })

    // ================== TASK PROGRESS ==================
    const [tasks, setTasks] = createStore<TaskInfo[]>([])

    const fetchTasks = async () => {
      if (!sdk.isReady) return
      const { data, error } = await sdk.client.getApiV1Tasks()
      if (error) return
      setTasks(reconcile((data ?? []) as TaskInfo[]))
    }

    const unsubTaskCreate = event.on("task.created", () => fetchTasks())
    const unsubTaskUpdate = event.on("task.updated", () => fetchTasks())
    const unsubTaskDelete = event.on("task.deleted", () => fetchTasks())

    const projectProgress = createMemo(() => {
      const map = new Map<string, number>()
      const counts = new Map<string, { total: number; completed: number }>()

      for (const task of tasks) {
        if (!task.listId || task.trashedAt) continue
        const c = counts.get(task.listId) ?? { total: 0, completed: 0 }
        c.total++
        if (task.completedAt) c.completed++
        counts.set(task.listId, c)
      }

      for (const [id, c] of counts) {
        map.set(id, c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0)
      }

      return map
    })

    onCleanup(() => {
      unsubProjectCreate()
      unsubProjectUpdate()
      unsubProjectDelete()
      unsubAreaCreate()
      unsubAreaUpdate()
      unsubAreaDelete()
      unsubTagCreate()
      unsubTagUpdate()
      unsubTagDelete()
      unsubTaskCreate()
      unsubTaskUpdate()
      unsubTaskDelete()
      unsubReconnect()
    })

    // Fetch when API key is available
    createEffect(() => {
      if (sdk.isReady) {
        fetchAll()
        fetchTasks()
      }
    })

    const updateProject = async (id: string, updates: Partial<ProjectInfo>) => {
      try {
        const { data, error } = await sdk.client.putApiV1ProjectsById({
          id,
          updateProject: {
            title: updates.title,
            notes: updates.notes,
            status: updates.status as "active" | "completed" | "trashed" | undefined,
            position: updates.position,
            areaId: updates.areaId,
          },
        })
        if (error) {
          throw new Error(`Failed to update project: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[SidebarData] update project error:", e)
        setStore("error", String(e))
        return null
      }
    }

    const updateArea = async (id: string, updates: Partial<AreaInfo>) => {
      try {
        const { data, error } = await sdk.client.putApiV1AreasById({
          id,
          updateArea: {
            title: updates.title,
            position: updates.position,
          },
        })
        if (error) {
          throw new Error(`Failed to update area: ${error}`)
        }
        return data
      } catch (e) {
        console.error("[SidebarData] update area error:", e)
        setStore("error", String(e))
        return null
      }
    }

    // Reorder projects within an area (or no area)
    const reorderProjects = async (projectIds: string[], areaId: string | null) => {
      // Optimistic update
      setStore("projects", (projects) => {
        const updated = projects.map((p) => {
          const newIndex = projectIds.indexOf(p.id)
          if (newIndex !== -1) {
            return { ...p, position: newIndex + 1, areaId }
          }
          return p
        })
        return updated.sort((a, b) => a.position - b.position)
      })

      // Update each project
      for (let i = 0; i < projectIds.length; i++) {
        await updateProject(projectIds[i], { position: i + 1, areaId })
      }
    }

    // Reorder areas
    const reorderAreas = async (areaIds: string[]) => {
      // Optimistic update
      setStore("areas", (areas) => {
        const updated = areas.map((a) => {
          const newIndex = areaIds.indexOf(a.id)
          if (newIndex !== -1) {
            return { ...a, position: newIndex + 1 }
          }
          return a
        })
        return updated.sort((a, b) => a.position - b.position)
      })

      // Update each area
      for (let i = 0; i < areaIds.length; i++) {
        await updateArea(areaIds[i], { position: i + 1 })
      }
    }

    // Computed: active projects sorted by position
    const activeProjects = () =>
      store.projects.filter((p) => p.status === "active" && !p.trashedAt).sort((a, b) => a.position - b.position)

    // Computed: projects without area
    const projectsWithoutArea = () => activeProjects().filter((p) => !p.areaId)

    // Computed: sorted areas
    const sortedAreas = () => [...store.areas].sort((a, b) => a.position - b.position)

    // Computed: areas with their projects
    const areasWithProjects = () =>
      sortedAreas().map((area) => ({
        ...area,
        projects: activeProjects().filter((p) => p.areaId === area.id),
      }))

    // Computed: sorted tags
    const sortedTags = () => [...store.tags].sort((a, b) => a.position - b.position)

    // ================== HIERARCHY HELPERS ==================
    // These help derive visual information from a task's listId/headingId

    /**
     * Get project by ID (searches all projects including completed/trashed for logbook display)
     */
    const getProject = (projectId: string): ProjectInfo | undefined => {
      return store.projects.find((p) => p.id === projectId)
    }

    /**
     * Get area by ID
     */
    const getArea = (areaId: string): AreaInfo | undefined => {
      return store.areas.find((a) => a.id === areaId)
    }

    /**
     * Get a display label for a task's list context (e.g., "Area > Project" or just "Project" or "Area")
     * Used in logbook and trash views for showing task context.
     *
     * With the new model:
     * - listId can be a project ID (prj_) or area ID (are_)
     * - headingId indicates grouping within a project, but we show project info, not heading
     */
    const getListLabel = (listId: string | null): string | null => {
      if (!listId) return null

      if (isProjectId(listId)) {
        const project = getProject(listId)
        if (!project) return null
        if (project.areaId) {
          const area = getArea(project.areaId)
          if (area) return `${area.title} > ${project.title}`
        }
        return project.title
      }

      if (isAreaId(listId)) {
        const area = getArea(listId)
        return area?.title ?? null
      }

      return null
    }

    return {
      get projects() {
        return store.projects
      },
      get areas() {
        return store.areas
      },
      get tags() {
        return store.tags
      },
      get loading() {
        return store.loading
      },
      get error() {
        return store.error
      },
      get activeProjects() {
        return activeProjects()
      },
      get projectsWithoutArea() {
        return projectsWithoutArea()
      },
      get sortedAreas() {
        return sortedAreas()
      },
      get areasWithProjects() {
        return areasWithProjects()
      },
      get sortedTags() {
        return sortedTags()
      },
      // Hierarchy helpers
      getProject,
      getArea,
      getListLabel,
      // Task data for progress and counts
      get allTasks() {
        return tasks
      },
      get projectProgress() {
        return projectProgress()
      },
      // Mutations
      updateProject,
      updateArea,
      reorderProjects,
      reorderAreas,
      refetch: fetchAll,
    }
  },
})
