import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { A, useLocation, useNavigate } from "@solidjs/router"
import { isToday } from "date-fns"
import type { Accessor, JSX, ParentProps } from "solid-js"
import { createContext, createEffect, createMemo, createSignal, onCleanup, onMount, Show, useContext } from "solid-js"
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

const SIDEBAR_STORAGE_KEY = "sidebar:state"
const MOBILE_BREAKPOINT = 768

type SidebarContextValue = {
  isMobile: Accessor<boolean>
  open: Accessor<boolean>
  openMobile: Accessor<boolean>
  setOpen: (value: boolean) => void
  setOpenMobile: (value: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>()

export function useSidebarState() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarState must be used within SidebarProvider")
  }
  return context
}

function PanelLeftIcon(props: { class?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

export function SidebarTrigger(props: { class?: string }) {
  const sidebar = useSidebarState()

  return (
    <Show when={sidebar.isMobile()}>
      <button
        type="button"
        onClick={() => sidebar.setOpenMobile(true)}
        class={cn(
          "flex items-center justify-center gap-1.5 px-4 py-1 min-w-[100px] h-9 text-[13px] font-medium rounded-full",
          "text-muted-foreground border border-transparent hover:border-border transition-colors",
          props.class,
        )}
        aria-label="Open Sidebar"
      >
        <PanelLeftIcon class="w-5 h-5 md:w-4 md:h-4" />
      </button>
    </Show>
  )
}

interface NavItemProps {
  to: string
  icon: () => JSX.Element
  iconColor?: string
  label: string
  count?: number
  secondary?: boolean
  dropType?: "inbox" | "today" | "someday" | "anytime" | "upcoming"
  onTaskDrop?: (taskId: string, dropType: string) => void
  onClick?: () => void
}

type NavDropState = "idle" | "over"

function NavItem(props: NavItemProps) {
  const location = useLocation()
  const isActive = () => location.pathname === props.to
  const [dropState, setDropState] = createSignal<NavDropState>("idle")
  let ref: HTMLAnchorElement | undefined

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
      onClick={props.onClick}
      class={cn(
        "group flex items-center gap-3 mx-2 px-2 py-2.5 md:py-1.5 rounded-md text-lg md:text-[13px] font-semibold transition-colors",
        "hover:bg-sidebar-accent",
        isActive() && "bg-sidebar-accent",
        props.secondary && "text-muted-foreground",
        dropState() === "over" && "bg-sidebar-accent ring-2 ring-things-blue ring-inset",
      )}
    >
      <span
        class={cn(
          "w-6 h-6 md:w-5 md:h-5 flex items-center justify-center",
          props.secondary ? "text-muted-foreground" : props.iconColor,
        )}
      >
        {props.icon()}
      </span>
      <span class={cn("flex-1 truncate", props.secondary ? "text-muted-foreground" : "text-sidebar-foreground")}>
        {props.label}
      </span>
      {props.count !== undefined && props.count > 0 && (
        <span class="text-base md:text-xs text-muted-foreground">{props.count}</span>
      )}
    </A>
  )
}

function SidebarContent() {
  const navigate = useNavigate()
  const sdk = useSDK()
  const sidebarData = useSidebarData()
  const event = useEvent()
  const sidebar = useSidebarState()

  const [allTasks, setAllTasks] = createStore<TaskInfo[]>([])

  const fetchTasksForCounts = async () => {
    if (!sdk.isReady) return

    try {
      const { data, error } = await sdk.client.getApiV1Tasks()
      if (error) {
        console.error("[Sidebar] fetch tasks error:", error)
        return
      }
      setAllTasks(data as TaskInfo[])
    } catch (e) {
      console.error("[Sidebar] fetch tasks error:", e)
    }
  }

  createEffect(() => {
    if (sdk.isReady) {
      fetchTasksForCounts()
    }
  })

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

        if (task.status === null) {
          acc.inbox++
        }

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

  const projectProgress = createMemo(() => {
    const progressMap = new Map<string, number>()
    const taskCounts = new Map<string, { total: number; completed: number }>()

    for (const task of allTasks) {
      if (!task.listId || task.trashedAt) continue

      const c = taskCounts.get(task.listId) ?? { total: 0, completed: 0 }
      c.total++
      if (task.completedAt) {
        c.completed++
      }
      taskCounts.set(task.listId, c)
    }

    for (const [projectId, c] of taskCounts) {
      const progress = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
      progressMap.set(projectId, progress)
    }

    return progressMap
  })

  const handleReorderProjects = (projectIds: string[], areaId: string | null) => {
    sidebarData.reorderProjects(projectIds, areaId)
  }

  const handleReorderAreas = (areaIds: string[]) => {
    sidebarData.reorderAreas(areaIds)
  }

  const handleNewProject = async () => {
    const position = sidebarData.activeProjects.length + 1

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
    const position = sidebarData.sortedAreas.length + 1

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

  const handleTaskDrop = async (taskId: string, dropType: string) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    const updates: Partial<TaskInfo> = {}

    switch (dropType) {
      case "inbox":
        updates.status = null
        updates.listId = null
        updates.scheduledDate = null
        updates.isEvening = false
        updates.isSomeday = false
        break
      case "today": {
        updates.status = "active"
        updates.scheduledDate = formatLocalDate(new Date())
        updates.isEvening = false
        updates.isSomeday = false
        break
      }
      case "upcoming": {
        updates.status = "active"
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        updates.scheduledDate = formatLocalDate(tomorrow)
        updates.isEvening = false
        updates.isSomeday = false
        break
      }
      case "anytime":
        updates.status = "active"
        updates.scheduledDate = null
        updates.isEvening = false
        updates.isSomeday = false
        break
      case "someday":
        updates.status = "active"
        updates.isSomeday = true
        updates.scheduledDate = null
        updates.isEvening = false
        break
    }

    const optimisticTask: TaskInfo = { ...task, ...updates }
    event.emit("task.updated", optimisticTask)

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
    }
  }

  const handleProjectTaskDrop = async (taskId: string, projectId: string, _areaId: string | undefined) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

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

  const handleAreaTaskDrop = async (taskId: string, areaId: string) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

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

  const closeMobileIfOpen = () => {
    if (sidebar.isMobile() && sidebar.openMobile()) {
      sidebar.setOpenMobile(false)
    }
  }

  const SidebarInner = () => (
    <>
      <div class="h-8 flex-shrink-0" />

      <div class="flex-1 min-h-0 overflow-auto">
        <div class="pb-2 pt-1">
          <div class="space-y-0.5 mb-4">
            <NavItem
              to="/inbox"
              icon={() => <InboxIcon class="w-5 h-5" />}
              iconColor="text-things-blue"
              label="Inbox"
              count={counts().inbox}
              dropType="inbox"
              onTaskDrop={handleTaskDrop}
              onClick={closeMobileIfOpen}
            />
            <NavItem
              to="/today"
              icon={() => <TodayStarIcon class="w-5 h-5" />}
              iconColor="text-things-yellow"
              label="Today"
              count={counts().today}
              dropType="today"
              onTaskDrop={handleTaskDrop}
              onClick={closeMobileIfOpen}
            />
            <NavItem
              to="/upcoming"
              icon={() => <CalendarIcon class="w-5 h-5" />}
              iconColor="text-things-pink"
              label="Upcoming"
              dropType="upcoming"
              onTaskDrop={handleTaskDrop}
              onClick={closeMobileIfOpen}
            />
            <NavItem
              to="/anytime"
              icon={() => <LayersIcon class="w-5 h-5" />}
              iconColor="text-things-teal"
              label="Anytime"
              dropType="anytime"
              onTaskDrop={handleTaskDrop}
              onClick={closeMobileIfOpen}
            />
            <NavItem
              to="/someday"
              icon={() => <SomedayIcon class="w-5 h-5" />}
              iconColor="text-things-beige"
              label="Someday"
              dropType="someday"
              onTaskDrop={handleTaskDrop}
              onClick={closeMobileIfOpen}
            />
          </div>

          <Show when={!sidebarData.loading}>
            <Show when={sidebarData.projectsWithoutArea.length > 0 || sidebarData.areasWithProjects.length > 0}>
              <div class="pt-3">
                <DraggableSidebarList
                  projectsWithoutArea={sidebarData.projectsWithoutArea}
                  areasWithProjects={sidebarData.areasWithProjects}
                  projectProgress={projectProgress}
                  onReorderProjects={handleReorderProjects}
                  onReorderAreas={handleReorderAreas}
                  onTaskDrop={handleProjectTaskDrop}
                  onAreaTaskDrop={handleAreaTaskDrop}
                  onLinkClick={closeMobileIfOpen}
                />
              </div>
            </Show>
          </Show>
        </div>
      </div>

      <div class="flex-shrink-0 border-t border-sidebar-border bg-sidebar px-2 min-h-[52px] flex items-center pb-[env(safe-area-inset-bottom)]">
        <div class="flex items-center justify-between w-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              class="p-2 rounded-md text-muted-foreground border border-transparent hover:border-toolbar-border transition-colors"
              aria-label="Create"
            >
              <PlusIcon class="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleNewProject}>New Project</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleNewArea}>New Area</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <A
            href="/logbook"
            onClick={closeMobileIfOpen}
            class="p-2 rounded-md text-muted-foreground border border-transparent hover:border-toolbar-border transition-colors"
            aria-label="Logbook"
          >
            <BookCheckIcon class="w-4 h-4" />
          </A>

          <A
            href="/trash"
            onClick={closeMobileIfOpen}
            class="p-2 rounded-md text-muted-foreground border border-transparent hover:border-toolbar-border transition-colors"
            aria-label="Trash"
          >
            <Trash2Icon class="w-4 h-4" />
          </A>

          <A
            href="/settings"
            onClick={closeMobileIfOpen}
            class="p-2 rounded-md text-muted-foreground border border-transparent hover:border-toolbar-border transition-colors"
            aria-label="Settings"
          >
            <Settings2Icon class="w-4 h-4" />
          </A>
        </div>
      </div>
    </>
  )

  return (
    <Show
      when={sidebar.isMobile()}
      fallback={
        <>
          {/* Spacer div that changes width based on open state */}
          <div
            class={cn(
              "relative h-full bg-transparent transition-[width] duration-200 ease-linear flex-shrink-0",
              sidebar.open() ? "w-64" : "w-0",
            )}
          />

          {/* Fixed sidebar that slides in/out */}
          <aside
            class={cn(
              "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border",
              "flex flex-col transition-[left] duration-200 ease-linear z-10",
              sidebar.open() ? "left-0" : "-left-64",
            )}
          >
            <SidebarInner />

            {/* Hover rail on right edge to collapse */}
            <button
              type="button"
              class="absolute right-0 top-0 h-full w-1 z-20 hover:bg-sidebar-accent/50 transition-colors cursor-w-resize"
              onClick={() => sidebar.setOpen(false)}
              aria-label="Collapse Sidebar"
            />
          </aside>

          {/* Hover rail on left edge to expand */}
          <Show when={!sidebar.open()}>
            <button
              type="button"
              class="fixed left-0 top-0 h-full w-2 z-20 hover:bg-sidebar-accent/50 transition-colors cursor-e-resize"
              onClick={() => sidebar.setOpen(true)}
              aria-label="Expand Sidebar"
            />
          </Show>
        </>
      }
    >
      {/* Mobile: Overlay sidebar */}
      <>
        <Show when={sidebar.openMobile()}>
          <button
            type="button"
            class="fixed inset-0 z-40 bg-black/80 animate-in fade-in-0 duration-200 cursor-default"
            onClick={() => sidebar.setOpenMobile(false)}
            aria-label="Close Sidebar"
          />
        </Show>

        <aside
          class={cn(
            "fixed left-0 top-0 h-full w-full bg-sidebar z-50",
            "flex flex-col transition-transform duration-200 ease-out",
            sidebar.openMobile() ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarInner />
        </aside>
      </>
    </Show>
  )
}

export function SidebarProvider(props: ParentProps) {
  const [isMobile, setIsMobile] = createSignal(false)
  const [open, setOpen] = createSignal(true)
  const [openMobile, setOpenMobile] = createSignal(false)

  onMount(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved === "false") {
        setOpen(false)
      }
    } catch {
      // localStorage not available
    }
  })

  // Mobile detection
  createEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (!mobile && openMobile()) {
        setOpenMobile(false)
      }
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    onCleanup(() => window.removeEventListener("resize", checkMobile))
  })

  // Persist state
  createEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open()))
    } catch {
      // localStorage not available
    }
  })

  // Keyboard shortcut (Cmd/Ctrl+B)
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
  })

  const toggle = () => {
    if (isMobile()) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }

  // Update iOS theme-color when mobile sidebar opens/closes
  createEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
    if (!meta) return
    const isDark = document.documentElement.classList.contains("dark")
    if (openMobile()) {
      meta.setAttribute("content", isDark ? "#1d1f22" : "#f8f9f9")
    } else {
      meta.setAttribute("content", isDark ? "#23262a" : "#ffffff")
    }
  })

  const value: SidebarContextValue = {
    isMobile,
    open,
    openMobile,
    setOpen,
    setOpenMobile,
    toggle,
  }

  return <SidebarContext.Provider value={value}>{props.children}</SidebarContext.Provider>
}

export function Sidebar() {
  return <SidebarContent />
}
