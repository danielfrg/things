import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { A, useLocation, useNavigate } from "@solidjs/router"
import { isToday } from "date-fns"
import type { JSX } from "solid-js"
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { isTaskData } from "@/components/dnd/task-data"
import {
  BookCheckIcon,
  CalendarIcon,
  InboxIcon,
  LayersIcon,
  PlusIcon,
  Settings2Icon,
  SomedayIcon,
  TodayStarIcon,
  Trash2Icon,
} from "@/components/icons"
import { DraggableSidebarList } from "@/components/layout/sidebar-items"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { TaskInfo } from "@/context/data"
import { useEvent } from "@/context/event"
import { useSDK } from "@/context/sdk"
import { useSidebarData } from "@/context/sidebar"
import { cn, formatLocalDate, isDateOverdue, parseLocalDate } from "@/lib/utils"

interface NavItemProps {
  to: string
  icon: () => JSX.Element
  iconColor?: string
  label: string
  count?: number
  secondary?: boolean
  dropType?: "inbox" | "today" | "someday" | "anytime" | "upcoming"
  onTaskDrop?: (taskId: string, dropType: string) => void
}

type NavDropState = "idle" | "over"

function NavItem(props: NavItemProps) {
  const location = useLocation()
  const isActive = () => location.pathname === props.to
  const [dropState, setDropState] = createSignal<NavDropState>("idle")
  let ref: HTMLAnchorElement | undefined

  // Setup drop target if dropType is provided
  createEffect(() => {
    if (!props.dropType || !ref) return

    const cleanup = dropTargetForElements({
      element: ref,
      canDrop: ({ source }) => isTaskData(source.data),
      onDragEnter: ({ source }) => {
        if (isTaskData(source.data)) {
          setDropState("over")
        }
      },
      onDragLeave: () => {
        setDropState("idle")
      },
      onDrop: ({ source }) => {
        setDropState("idle")
        if (isTaskData(source.data) && props.onTaskDrop && props.dropType) {
          props.onTaskDrop(source.data.taskId, props.dropType)
        }
      },
    })

    onCleanup(cleanup)
  })

  return (
    <A
      ref={ref}
      href={props.to}
      class={cn(
        "group flex items-center gap-3 mx-2 px-2 py-1.5 rounded-md text-[13px] font-semibold transition-colors",
        "hover:bg-sidebar-accent",
        isActive() && "bg-sidebar-accent",
        props.secondary && "text-muted-foreground",
        dropState() === "over" && "bg-sidebar-accent ring-2 ring-things-blue ring-inset",
      )}
    >
      <span
        class={cn(
          "w-5 h-5 flex items-center justify-center",
          props.secondary ? "text-muted-foreground" : props.iconColor,
        )}
      >
        {props.icon()}
      </span>
      <span class={cn("flex-1 truncate", props.secondary ? "text-muted-foreground" : "text-sidebar-foreground")}>
        {props.label}
      </span>
      {props.count !== undefined && props.count > 0 && <span class="text-xs text-muted-foreground">{props.count}</span>}
    </A>
  )
}

function SidebarContent() {
  const navigate = useNavigate()
  const sdk = useSDK()
  const sidebar = useSidebarData()
  const event = useEvent()

  // Subscribe to task events to update counts - store full TaskInfo for optimistic updates
  const [allTasks, setAllTasks] = createStore<TaskInfo[]>([])

  // Fetch all tasks for counting
  const fetchTasksForCounts = async () => {
    if (!sdk.isReady) return

    try {
      const { data, error } = await sdk.client.getApiV1Tasks()
      if (error) {
        console.error("[Sidebar] fetch tasks error:", error)
        return
      }
      setAllTasks(data as any)
    } catch (e) {
      console.error("[Sidebar] fetch tasks error:", e)
    }
  }

  // Fetch on mount and when API key changes
  createEffect(() => {
    if (sdk.isReady) {
      fetchTasksForCounts()
    }
  })

  // Subscribe to task events
  createEffect(() => {
    const unsubCreate = event.on("task.created", () => fetchTasksForCounts())
    const unsubUpdate = event.on("task.updated", () => fetchTasksForCounts())
    const unsubDelete = event.on("task.deleted", () => fetchTasksForCounts())

    onCleanup(() => {
      unsubCreate()
      unsubUpdate()
      unsubDelete()
    })
  })

  const isDateToday = (dateStr: string | null): boolean => {
    if (!dateStr) return false
    return isToday(parseLocalDate(dateStr))
  }

  const counts = createMemo(() => {
    return allTasks.reduce(
      (acc, task) => {
        if (task.trashedAt) return acc
        if (task.completedAt) return acc

        // Inbox: status is null (unprocessed)
        if (task.status === null) {
          acc.inbox++
        }

        // Today: not completed and has overdue/today scheduled or deadline
        const due =
          isDateOverdue(task.scheduledDate) ||
          isDateToday(task.scheduledDate) ||
          isDateOverdue(task.deadline) ||
          isDateToday(task.deadline)
        if (due) acc.today++

        return acc
      },
      { inbox: 0, today: 0 },
    )
  })

  // Compute project progress
  const projectProgress = createMemo(() => {
    const progressMap = new Map<string, number>()
    const taskCounts = new Map<string, { total: number; completed: number }>()

    for (const task of allTasks) {
      if (!task.listId || task.trashedAt) continue

      const counts = taskCounts.get(task.listId) ?? {
        total: 0,
        completed: 0,
      }
      counts.total++
      if (task.completedAt) {
        counts.completed++
      }
      taskCounts.set(task.listId, counts)
    }

    for (const [projectId, counts] of taskCounts) {
      const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
      progressMap.set(projectId, progress)
    }

    return progressMap
  })

  const handleReorderProjects = (projectIds: string[], areaId: string | null) => {
    sidebar.reorderProjects(projectIds, areaId)
  }

  const handleReorderAreas = (areaIds: string[]) => {
    sidebar.reorderAreas(areaIds)
  }

  const handleNewProject = async () => {
    const position = sidebar.activeProjects.length + 1

    try {
      const { data, error } = await sdk.client.postApiV1Projects({
        createProject: {
          title: "New Project",
          status: "active",
          position,
        },
      })

      if (!error && data) {
        navigate(`/project/${data.id}`)
      }
    } catch (e) {
      console.error("[Sidebar] create project error:", e)
    }
  }

  const handleNewArea = async () => {
    const position = sidebar.sortedAreas.length + 1

    try {
      await sdk.client.postApiV1Areas({
        createArea: {
          title: "New Area",
          position,
        },
      })
    } catch (e) {
      console.error("[Sidebar] create area error:", e)
    }
  }

  // Handle task drops onto navigation items
  const handleTaskDrop = async (taskId: string, dropType: string) => {
    // Find the task in our store for optimistic update
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    const updates: Partial<TaskInfo> = {}

    switch (dropType) {
      case "inbox":
        // Move to inbox: set status to null, clear organization
        updates.status = null
        updates.listId = null
        updates.scheduledDate = null
        updates.isEvening = false
        updates.isSomeday = false
        break
      case "today": {
        // Schedule for today - set status to active
        updates.status = "active"
        updates.scheduledDate = formatLocalDate(new Date())
        updates.isEvening = false
        updates.isSomeday = false
        break
      }
      case "upcoming": {
        // Schedule for tomorrow - set status to active
        updates.status = "active"
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        updates.scheduledDate = formatLocalDate(tomorrow)
        updates.isEvening = false
        updates.isSomeday = false
        break
      }
      case "anytime":
        // Set status to active, clear scheduled date
        updates.status = "active"
        updates.scheduledDate = null
        updates.isEvening = false
        updates.isSomeday = false
        break
      case "someday":
        // Set status to active, set isSomeday flag, clear scheduled date
        updates.status = "active"
        updates.isSomeday = true
        updates.scheduledDate = null
        updates.isEvening = false
        break
    }

    // Emit optimistic update immediately
    const optimisticTask: TaskInfo = { ...task, ...updates }
    event.emit("task.updated", optimisticTask)

    // When clearing organization (inbox/anytime/someday), set listId to null
    let listIdToSend: string | null | undefined = undefined
    if (updates.listId === null) {
      listIdToSend = null
    }

    try {
      await sdk.client.putApiV1TasksById({
        id: taskId,
        updateTask: {
          status: updates.status as "active" | "completed" | "trashed" | null | undefined,
          listId: listIdToSend,
          headingId: listIdToSend === null ? null : undefined,
          scheduledDate: updates.scheduledDate,
          isEvening: updates.isEvening,
          isSomeday: updates.isSomeday,
        },
      })
    } catch (e) {
      console.error("[Sidebar] task drop error:", e)
      // On error, the SSE will eventually correct the state
    }
  }

  // Handle task drops onto projects
  const handleProjectTaskDrop = async (taskId: string, projectId: string, _areaId: string | undefined) => {
    // Find the task in our store for optimistic update
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    // Emit optimistic update immediately
    const optimisticTask: TaskInfo = {
      ...task,
      status: "active",
      listId: projectId,
      headingId: null,
      isSomeday: false,
    }
    event.emit("task.updated", optimisticTask)

    try {
      await sdk.client.putApiV1TasksById({
        id: taskId,
        updateTask: {
          status: "active",
          listId: projectId,
          headingId: null,
          isSomeday: false,
        },
      })
    } catch (e) {
      console.error("[Sidebar] project task drop error:", e)
    }
  }

  // Handle task drops onto areas (no specific project)
  const handleAreaTaskDrop = async (taskId: string, areaId: string) => {
    // Find the task in our store for optimistic update
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    // Emit optimistic update immediately
    const optimisticTask: TaskInfo = {
      ...task,
      status: "active",
      listId: areaId,
      headingId: null,
      isSomeday: false,
    }
    event.emit("task.updated", optimisticTask)

    try {
      const { error } = await sdk.client.putApiV1TasksById({
        id: taskId,
        updateTask: {
          status: "active",
          listId: areaId,
          headingId: null,
          isSomeday: false,
        },
      })

      if (error) {
        console.error("[Sidebar] area task drop failed:", error)
      }
    } catch (e) {
      console.error("[Sidebar] area task drop error:", e)
    }
  }

  return (
    <aside class="w-64 bg-sidebar flex flex-col h-full border-r border-sidebar-border">
      <div class="h-8 flex-shrink-0" />

      <div class="flex-1 min-h-0 overflow-auto">
        <div class="pb-2 pt-1">
          {/* Navigation items */}
          <div class="space-y-0.5 mb-4">
            <NavItem
              to="/inbox"
              icon={() => <InboxIcon class="w-5 h-5" />}
              iconColor="text-things-blue"
              label="Inbox"
              count={counts().inbox}
              dropType="inbox"
              onTaskDrop={handleTaskDrop}
            />
            <NavItem
              to="/today"
              icon={() => <TodayStarIcon class="w-5 h-5" />}
              iconColor="text-things-yellow"
              label="Today"
              count={counts().today}
              dropType="today"
              onTaskDrop={handleTaskDrop}
            />
            <NavItem
              to="/upcoming"
              icon={() => <CalendarIcon class="w-5 h-5" />}
              iconColor="text-things-pink"
              label="Upcoming"
              dropType="upcoming"
              onTaskDrop={handleTaskDrop}
            />
            <NavItem
              to="/anytime"
              icon={() => <LayersIcon class="w-5 h-5" />}
              iconColor="text-things-teal"
              label="Anytime"
              dropType="anytime"
              onTaskDrop={handleTaskDrop}
            />
            <NavItem
              to="/someday"
              icon={() => <SomedayIcon class="w-5 h-5" />}
              iconColor="text-things-beige"
              label="Someday"
              dropType="someday"
              onTaskDrop={handleTaskDrop}
            />
          </div>

          {/* Projects and Areas */}
          <Show when={!sidebar.loading}>
            <Show when={sidebar.projectsWithoutArea.length > 0 || sidebar.areasWithProjects.length > 0}>
              <div class="pt-3">
                <DraggableSidebarList
                  projectsWithoutArea={sidebar.projectsWithoutArea}
                  areasWithProjects={sidebar.areasWithProjects}
                  projectProgress={projectProgress}
                  onReorderProjects={handleReorderProjects}
                  onReorderAreas={handleReorderAreas}
                  onTaskDrop={handleProjectTaskDrop}
                  onAreaTaskDrop={handleAreaTaskDrop}
                />
              </div>
            </Show>
          </Show>
        </div>
      </div>

      <div class="flex-shrink-0 border-t border-sidebar-border bg-sidebar px-2 h-[52px] flex items-center">
        <div class="flex items-center justify-between w-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              class="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Create"
            >
              <PlusIcon class="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleNewProject}>New Project</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleNewArea}>New Area</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <A
            href="/logbook"
            class="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Logbook"
          >
            <BookCheckIcon class="w-5 h-5" />
          </A>

          <A
            href="/trash"
            class="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Trash"
          >
            <Trash2Icon class="w-5 h-5" />
          </A>

          <A
            href="/settings"
            class="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Settings"
          >
            <Settings2Icon class="w-5 h-5" />
          </A>
        </div>
      </div>
    </aside>
  )
}

export function Sidebar() {
  return <SidebarContent />
}
