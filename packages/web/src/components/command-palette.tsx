import { useNavigate } from "@solidjs/router"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import {
  ArchiveIcon,
  BookCheckIcon,
  CalendarIcon,
  InboxIcon,
  LayersIcon,
  SearchIcon,
  TodayStarIcon,
  Trash2Icon,
} from "@/components/icons"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { TaskInfo } from "@/context/data"
import { useSDK } from "@/context/sdk"
import { useSidebarData } from "@/context/sidebar"
import { cn, parseLocalDate } from "@/lib/utils"

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

type CommandItem = {
  id: string
  type: "view" | "task" | "project" | "area"
  title: string
  subtitle?: string
  route: string
  taskId?: string
  icon?: () => HTMLElement
}

const itemClass = "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"

export function CommandPalette(props: CommandPaletteProps) {
  const navigate = useNavigate()
  const sdk = useSDK()
  const sidebar = useSidebarData()
  const [search, setSearch] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [allTasks, setAllTasks] = createSignal<TaskInfo[]>([])

  // Reset search and fetch tasks when the palette opens
  createEffect(() => {
    if (props.open) {
      setSearch("")
      setSelectedIndex(0)
      if (sdk.isReady) {
        fetchAllTasks()
      }
    }
  })

  const fetchAllTasks = async () => {
    try {
      const { data, error } = await sdk.client.getApiV1Tasks()
      if (error) {
        console.error("[CommandPalette] Failed to fetch tasks:", error)
        return
      }
      setAllTasks((data as TaskInfo[]) ?? [])
    } catch (e) {
      console.error("[CommandPalette] Error fetching tasks:", e)
    }
  }

  // Static views
  const views: CommandItem[] = [
    { id: "inbox", type: "view", title: "Inbox", route: "/inbox" },
    { id: "today", type: "view", title: "Today", route: "/today" },
    { id: "upcoming", type: "view", title: "Upcoming", route: "/upcoming" },
    { id: "anytime", type: "view", title: "Anytime", route: "/anytime" },
    { id: "someday", type: "view", title: "Someday", route: "/someday" },
    { id: "logbook", type: "view", title: "Logbook", route: "/logbook" },
    { id: "trash", type: "view", title: "Trash", route: "/trash" },
  ]

  // Get task route based on its properties
  const getTaskRoute = (task: TaskInfo) => {
    if (task.listId) {
      const isProject = sidebar.activeProjects.some((p) => p.id === task.listId)
      if (isProject) {
        return `/project/${task.listId}`
      }
      const isArea = sidebar.sortedAreas.some((a) => a.id === task.listId)
      if (isArea) {
        return `/area/${task.listId}`
      }
      return `/project/${task.listId}`
    }
    if (task.scheduledDate) {
      const date = parseLocalDate(task.scheduledDate)
      const today = new Date()
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return "/today"
      }
      return "/upcoming"
    }
    // Inbox: status is null
    if (task.status === null) return "/inbox"
    // Someday: has isSomeday flag
    if (task.isSomeday) return "/someday"
    // Everything else with status "active" is in anytime
    return "/anytime"
  }

  // All searchable items
  const allItems = createMemo(() => {
    const items: CommandItem[] = [...views]

    // Add active tasks (not completed, not trashed)
    const activeTasks = allTasks().filter((t) => !t.trashedAt && t.status !== "completed")
    for (const task of activeTasks) {
      items.push({
        id: `task-${task.id}`,
        type: "task",
        title: task.title,
        route: getTaskRoute(task),
        taskId: task.id,
      })
    }

    // Add active projects
    for (const project of sidebar.activeProjects) {
      items.push({
        id: `project-${project.id}`,
        type: "project",
        title: project.title,
        route: `/project/${project.id}`,
      })
    }

    // Add areas
    for (const area of sidebar.sortedAreas) {
      items.push({
        id: `area-${area.id}`,
        type: "area",
        title: area.title,
        route: `/area/${area.id}`,
      })
    }

    return items
  })

  // Filtered items based on search
  const filteredItems = createMemo(() => {
    const query = search().toLowerCase()
    if (!query) return allItems()
    return allItems().filter((item) => item.title.toLowerCase().includes(query))
  })

  // Group items by type
  const groupedItems = createMemo(() => {
    const items = filteredItems()
    const groups: { type: string; label: string; items: CommandItem[] }[] = []

    const viewItems = items.filter((i) => i.type === "view")
    if (viewItems.length > 0) {
      groups.push({ type: "view", label: "Views", items: viewItems })
    }

    const taskItems = items.filter((i) => i.type === "task")
    if (taskItems.length > 0) {
      groups.push({ type: "task", label: "Tasks", items: taskItems })
    }

    const projectItems = items.filter((i) => i.type === "project")
    if (projectItems.length > 0) {
      groups.push({ type: "project", label: "Projects", items: projectItems })
    }

    const areaItems = items.filter((i) => i.type === "area")
    if (areaItems.length > 0) {
      groups.push({ type: "area", label: "Areas", items: areaItems })
    }

    return groups
  })

  // Flat list for keyboard navigation
  const flatItems = createMemo(() => groupedItems().flatMap((g) => g.items))

  const goToItem = (item: CommandItem) => {
    const search = item.taskId ? `?task=${item.taskId}` : ""
    navigate(item.route + search)
    props.onClose()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = flatItems()
    if (items.length === 0) return

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1))
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      }
      case "Enter": {
        e.preventDefault()
        const item = items[selectedIndex()]
        if (item) goToItem(item)
        break
      }
      case "Escape": {
        e.preventDefault()
        props.onClose()
        break
      }
    }
  }

  // Reset selection when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setSelectedIndex(0)
  }

  const renderIcon = (item: CommandItem) => {
    switch (item.type) {
      case "view": {
        switch (item.id) {
          case "inbox":
            return <InboxIcon class="size-4 opacity-60" />
          case "today":
            return <TodayStarIcon class="size-4 opacity-60" />
          case "upcoming":
            return <CalendarIcon class="size-4 opacity-60" />
          case "anytime":
            return <LayersIcon class="size-4 opacity-60" />
          case "someday":
            return <ArchiveIcon class="size-4 opacity-60" />
          case "logbook":
            return <BookCheckIcon class="size-4 opacity-60" />
          case "trash":
            return <Trash2Icon class="size-4 opacity-60" />
          default:
            return null
        }
      }
      case "task":
        return <div class="size-4 rounded-full border-2 border-things-blue flex-shrink-0" />
      case "project":
        return <div class="size-4 rounded-full border-2 border-things-blue flex-shrink-0" />
      case "area":
        return (
          <div class="size-4 rounded bg-things-green flex items-center justify-center">
            <div class="size-2 rounded-sm bg-white/90" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        position="top"
        showCloseButton={false}
        class="p-0 gap-0 sm:max-w-[560px] bg-popover-dark border-popover-dark-border overflow-hidden"
      >
        {/* Search input */}
        <div class="p-2 pb-0">
          <div class="flex items-center gap-2 bg-input/30 border border-input/30 rounded-lg px-3 h-10">
            <SearchIcon class="size-4 shrink-0 opacity-50 text-popover-dark-muted" />
            <input
              type="text"
              placeholder="Search tasks, projects, areas..."
              class="flex-1 bg-transparent text-sm text-popover-dark-foreground placeholder:text-popover-dark-muted outline-none"
              value={search()}
              onInput={(e) => handleSearchChange(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              autofocus
            />
          </div>
        </div>

        {/* Results */}
        <div class="max-h-[400px] overflow-y-auto p-2">
          <Show
            when={flatItems().length > 0}
            fallback={<div class="py-8 text-center text-sm text-popover-dark-muted">No results found.</div>}
          >
            <For each={groupedItems()}>
              {(group, groupIndex) => (
                <>
                  <Show when={groupIndex() > 0}>
                    <div class="h-px bg-popover-dark-border my-2" />
                  </Show>
                  <div class="px-2 py-1.5 text-xs font-medium text-popover-dark-muted">{group.label}</div>
                  <For each={group.items}>
                    {(item) => {
                      const index = () => flatItems().indexOf(item)
                      const isSelected = () => index() === selectedIndex()
                      return (
                        <button
                          type="button"
                          class={cn(
                            itemClass,
                            "w-full text-left text-popover-dark-foreground",
                            isSelected() ? "bg-popover-dark-accent" : "hover:bg-popover-dark-accent/50",
                          )}
                          onClick={() => goToItem(item)}
                          onMouseEnter={() => setSelectedIndex(index())}
                        >
                          {renderIcon(item)}
                          <div class="flex-1 min-w-0">
                            <div class="truncate">{item.title}</div>
                            <Show when={item.subtitle}>
                              <div class="text-xs text-popover-dark-muted truncate">{item.subtitle}</div>
                            </Show>
                          </div>
                          <span class="text-xs text-popover-dark-muted capitalize">{item.type}</span>
                        </button>
                      )
                    }}
                  </For>
                </>
              )}
            </For>
          </Show>
        </div>

        {/* Footer with keyboard hints */}
        <div class="px-4 py-2 border-t border-popover-dark-border flex items-center gap-4 text-popover-dark-muted text-xs">
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">↑↓</kbd>
            <span>Navigate</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">↵</kbd>
            <span>Open</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">esc</kbd>
            <span>Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
