import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { attachClosestEdge, type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { format, isToday, isYesterday } from "date-fns"
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { getTaskData, isTaskData } from "@/components/dnd/task-data"
import {
  EveningIcon,
  FlagIcon,
  InfoIcon,
  ListChecksIcon,
  RepeatIcon,
  RestoreIcon,
  TodayStarIcon,
  Trash2Icon,
} from "@/components/icons"
import { CalendarPopover } from "@/components/ui/calendar-popover"
import { DatePicker } from "@/components/ui/date-picker"
import { EditableText } from "@/components/ui/editable-text"
import { MovePicker, MovePickerContent } from "@/components/ui/move-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProseEditor } from "@/components/ui/prose-editor"
import { RepeatPicker } from "@/components/ui/repeat-picker"
import { TagPicker } from "@/components/ui/tag-picker"
import { TaskCheckbox } from "@/components/ui/task-checkbox"
import { ToolbarButton } from "@/components/ui/toolbar-button"
import { Button } from "@/components/ui/button"
import type { ChecklistItemInfo, TaskInfo, TaskTagInfo } from "@/context/data"
import { useStickyFields } from "@/context/pending-changes"
import { useSidebarData } from "@/context/sidebar"
import { cn, formatTaskDate } from "@/lib/utils"
import { ChecklistEditor, type ChecklistItem } from "./checklist-editor"
import { ItemDetailLayout } from "./item-detail-layout"
import { TaskMetadata } from "./task-metadata"

type TaskState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; dragging: DOMRect }
  | { type: "is-dragging" }
  | { type: "is-dragging-and-left-self" }
  | { type: "is-over"; dragging: DOMRect; closestEdge: Edge }

const idle: TaskState = { type: "idle" }

function TaskShadow(props: { dragging: DOMRect }) {
  return <div class="flex-shrink-0 rounded-md bg-secondary/80" style={{ height: `${props.dragging.height}px` }} />
}

function TaskPreview(props: { task: TaskInfo; dragging: DOMRect; isSomeday?: boolean }) {
  const isCompleted = () => !!props.task.completedAt
  return (
    <div
      class="group flex items-center gap-2 px-4 md:px-2 py-3 md:py-2 md:rounded-md w-full text-left overflow-hidden bg-background shadow-lg border border-border"
      style={{
        width: `${props.dragging.width}px`,
        height: `${props.dragging.height}px`,
      }}
    >
      <TaskCheckbox checked={isCompleted()} dashed={props.isSomeday} />
      <span
        class={cn(
          "flex-1 min-w-0 text-lg md:text-[15px] leading-tight truncate",
          isCompleted() ? "line-through text-muted-foreground" : "text-foreground",
        )}
      >
        {props.task.title}
      </span>
    </div>
  )
}

export type TaskCardProps = {
  task: TaskInfo
  expanded: boolean
  autoCommitSticky?: boolean
  onComplete: (id: string, completed: boolean) => void
  onCancel?: (id: string) => void
  onUncancel?: (id: string) => void
  onUpdate: (id: string, updates: Partial<TaskInfo>) => void
  onExpand: (id: string) => void
  onSelect?: (id: string, event: MouseEvent) => void
  isSomeday?: boolean
  selected?: boolean
  scheduleDatePickerOpen?: boolean
  onScheduleDatePickerClose?: () => void
  movePickerOpen?: boolean
  onMovePickerClose?: () => void
  projects?: Array<{ id: string; title: string; areaId?: string | null }>
  areas?: Array<{ id: string; title: string }>
  hideScheduledDate?: boolean
  showTodayStar?: boolean
  showCompletedDate?: boolean
  // Trash view specific props
  isTrashView?: boolean
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
  tags?: TaskTagInfo[]
  onTagAdd?: (taskId: string, tagId: string) => void
  onTagRemove?: (taskId: string, tagId: string) => void
  onFetchTags?: (taskId: string) => void
  onConvertToRepeat?: (taskId: string, rrule: string, startDate: string) => void
  checklistItems?: ChecklistItemInfo[]
  onFetchChecklistItems?: (taskId: string) => void
  onCreateChecklistItem?: (taskId: string, item: Omit<ChecklistItem, "id">) => Promise<ChecklistItemInfo | null>
  onUpdateChecklistItem?: (taskId: string, itemId: string, changes: Partial<ChecklistItem>) => void
  onDeleteChecklistItem?: (taskId: string, itemId: string) => void
  onReorderChecklistItems?: (taskId: string, items: { id: string; position: number }[]) => void
}

export function TaskCard(props: TaskCardProps) {
  let outerRef: HTMLDivElement | undefined
  let cardRef: HTMLDivElement | undefined
  let titleRef: HTMLInputElement | undefined
  const [state, setState] = createSignal<TaskState>(idle)
  const [showInfo, setShowInfo] = createSignal(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
  const sidebar = useSidebarData()

  // Pending changes buffer - prevents task from disappearing while editing
  // "Sticky" fields (scheduledDate, deadline, status, projectId, areaId, isEvening)
  // are buffered until commit, while other fields update immediately
  const stickyChanges = useStickyFields(
    () => props.task,
    (id, changes) => props.onUpdate(id, changes),
  )

  const commitSticky = () => {
    if (!props.autoCommitSticky) return
    if (props.expanded) return
    stickyChanges.commit()
  }

  // Get the effective task with pending changes merged for display
  const effectiveTask = () => stickyChanges.effectiveTask()

  const isCompleted = () => !!props.task.completedAt
  const isCancelled = () => props.task.status === "cancelled"
  const hasNotes = () => Boolean(props.task.notes?.trim())

  // Get project or area name for subtitle display (used in logbook/trash)
  // Uses listId to look up the display label
  const getProjectOrAreaName = () => {
    // Use the sidebar's helper to get display label from listId
    return sidebar.getListLabel(props.task.listId)
  }

  // Get the listId for MovePicker display
  const getListId = () => {
    return props.task.listId ?? null
  }

  // Local state for notes to avoid re-render on every keystroke
  const [localNotes, setLocalNotes] = createSignal(props.task.notes ?? "")

  // Sync local notes when task changes (different task selected)
  let lastTaskId = props.task.id
  createEffect(() => {
    if (props.task.id !== lastTaskId) {
      lastTaskId = props.task.id
      setLocalNotes(props.task.notes ?? "")
    }
  })

  // Use tags from task if available (from API), otherwise fall back to prop tags
  const effectiveTags = () => {
    if (props.task.tags && props.task.tags.length > 0) {
      // Convert SimpleTagInfo to TaskTagInfo-like objects
      return props.task.tags.map((t) => ({
        id: t.id,
        title: t.title,
        position: 0,
        createdAt: "",
      }))
    }
    return props.tags ?? []
  }

  // Focus title when task expands
  createEffect(() => {
    if (props.expanded && titleRef) {
      // Small delay to ensure the element is visible after animation
      setTimeout(() => titleRef?.focus(), 50)
    }
  })

  // Fetch tags when task expands
  createEffect(() => {
    if (props.expanded && props.onFetchTags) {
      props.onFetchTags(props.task.id)
    }
  })

  // Fetch checklist items when task expands
  createEffect(() => {
    if (props.expanded && props.onFetchChecklistItems) {
      props.onFetchChecklistItems(props.task.id)
    }
  })

  // Commit pending changes when card collapses (expanded -> collapsed)
  // Track previous expanded state to detect collapse
  let wasExpanded = props.expanded
  createEffect(() => {
    const isExpanded = props.expanded
    if (wasExpanded && !isExpanded) {
      // Card just collapsed - delay commit so the collapse animation
      // isn't interrupted by store updates replacing the task object
      setTimeout(() => stickyChanges.commit(), 300)
    }
    wasExpanded = isExpanded
  })

  // Handle Escape key to collapse the card
  createEffect(() => {
    if (!props.expanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close if a popover is open (let it handle the escape)
        const target = e.target as HTMLElement
        if (target.closest("[data-radix-popper-content-wrapper]")) return
        if (target.closest('[role="dialog"]')) return
        if (target.closest("[data-kb-menu]")) return

        props.onExpand(props.task.id) // Toggle to collapse
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  // Handle double click to expand
  const handleDoubleClick = (e: MouseEvent) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement
    if (target.closest("button")) return
    if (target.closest("input")) return
    if (target.closest("textarea")) return
    if (target.closest(".prose-editor")) return
    if (target.closest('[role="dialog"]')) return

    // Prevent event from bubbling/being handled multiple times
    e.stopPropagation()
    props.onExpand(props.task.id)
  }

  // Handle click outside to collapse
  createEffect(() => {
    if (!props.expanded) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Ignore clicks inside the card
      if (cardRef?.contains(target)) {
        // But close popovers if clicking inside card but outside popovers
        if (!target.closest('[role="dialog"]')) {
          setShowInfo(false)
          setShowDeleteConfirm(false)
        }
        return
      }

      // Ignore clicks on popovers, dialogs, etc.
      if (target.closest("[data-radix-popper-content-wrapper]")) return
      if (target.closest('[role="dialog"]')) return
      if (target.closest("[data-kb-menu]")) return

      props.onExpand(props.task.id) // Toggle to collapse
    }

    // Use mousedown to catch clicks before they might be stopped
    document.addEventListener("mousedown", handleClickOutside)

    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside)
    })
  })

  // Setup drag and drop
  createEffect(() => {
    const outer = outerRef
    const card = cardRef
    const task = props.task
    if (!outer || !card) return

    // Don't allow dragging when expanded
    if (props.expanded) return

    const cleanup = combine(
      draggable({
        element: card,
        getInitialData() {
          return getTaskData(task, card.getBoundingClientRect())
        },
        onGenerateDragPreview({ nativeSetDragImage, location }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: card,
              input: location.current.input,
            }),
            render({ container }) {
              setState({
                type: "preview",
                container,
                dragging: card.getBoundingClientRect(),
              })
            },
          })
        },
        onDragStart() {
          setState({ type: "is-dragging" })
          // Select task on drag start (single selection, no modifiers)
          props.onSelect?.(task.id, {
            shiftKey: false,
            metaKey: false,
            ctrlKey: false,
            button: 0,
          } as MouseEvent)
        },
        onDrop() {
          setState(idle)
        },
      }),
      dropTargetForElements({
        element: outer,
        getIsSticky: () => true,
        canDrop: ({ source }) => isTaskData(source.data),
        getData({ input }) {
          return attachClosestEdge(getTaskData(task, card.getBoundingClientRect()), {
            element: outer,
            input,
            allowedEdges: ["top", "bottom"],
          })
        },
        onDragEnter({ source, self }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) return

          const closestEdge = extractClosestEdge(self.data)
          if (!closestEdge) return

          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          })
        },
        onDrag({ source, self }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) return

          const closestEdge = extractClosestEdge(self.data)
          if (!closestEdge) return

          const current = state()
          if (current.type === "is-over" && current.closestEdge === closestEdge) {
            return
          }
          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          })
        },
        onDragLeave({ source }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) {
            setState({ type: "is-dragging-and-left-self" })
            return
          }
          setState(idle)
        },
        onDrop() {
          setState(idle)
        },
      }),
    )

    onCleanup(cleanup)
  })

  const outerClass = () => {
    if (state().type === "is-dragging-and-left-self") return "hidden"
    return "flex-shrink-0"
  }

  // Handle single click to select task - use onMouseDown for modifier key detection
  const handleMouseDown = (e: MouseEvent) => {
    if (!props.expanded && props.onSelect && e.button === 0) {
      props.onSelect(props.task.id, e)
    }
  }

  // Header content - checkbox and title
  const headerContent = () => (
    <div
      class={cn(
        "flex items-center gap-2 px-4 transition-all duration-300 ease-in-out group/row",
        props.expanded ? "pt-4 pb-2" : "py-3 md:py-2 md:cursor-grab md:rounded-md",
        !props.expanded && props.selected && "bg-task-selected",
        !props.expanded && !props.selected && "hover:bg-secondary/50",
        // In trash view, disable grab cursor
        props.isTrashView && !props.expanded && "md:cursor-default",
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Checkbox - in trash view, show visual state only (no click action) */}
      <Show
        when={props.isTrashView}
        fallback={
          <TaskCheckbox
            checked={isCompleted()}
            cancelled={isCancelled()}
            dashed={props.isSomeday}
            onChange={(checked) => props.onComplete(props.task.id, checked)}
            onCancel={props.onCancel ? () => props.onCancel!(props.task.id) : undefined}
            onUncancel={props.onUncancel ? () => props.onUncancel!(props.task.id) : undefined}
          />
        }
      >
        <TaskCheckbox checked={isCompleted()} cancelled={isCancelled()} disabled />
      </Show>

      {/* Trashed date - shown when collapsed in trash view */}
      <Show when={!props.expanded && props.isTrashView && props.task.trashedAt}>
        <span class="w-14 shrink-0 text-center text-[13px] font-medium text-things-blue">
          {(() => {
            const d = new Date(props.task.trashedAt!)
            if (isToday(d)) return "Today"
            if (isYesterday(d)) return "Yesterday"
            return format(d, "MMM d")
          })()}
        </span>
      </Show>

      {/* Completed date - shown when collapsed in logbook view */}
      <Show when={!props.expanded && props.showCompletedDate && !props.isTrashView && props.task.completedAt}>
        <span class="w-14 shrink-0 text-center text-[13px] font-medium text-things-blue">
          {(() => {
            const d = new Date(props.task.completedAt!)
            if (isToday(d)) return "Today"
            if (isYesterday(d)) return "Yesterday"
            return format(d, "MMM d")
          })()}
        </span>
      </Show>

      {/* Today star or Evening moon - shown when collapsed and task is scheduled for today */}
      <Show
        when={
          !props.expanded &&
          props.showTodayStar &&
          formatTaskDate(props.task.scheduledDate) === "Today" &&
          !isCompleted()
        }
      >
        <Show when={props.task.isEvening} fallback={<TodayStarIcon class="w-3.5 h-3.5 shrink-0" />}>
          <EveningIcon class="w-3.5 h-3.5 shrink-0" />
        </Show>
      </Show>

      <Show
        when={props.expanded}
        fallback={
          <div class="flex-1 min-w-0">
            <span
              class={cn(
                "text-lg md:text-[15px] leading-tight truncate block",
                // Don't strikethrough in logbook/trash view
                !props.showCompletedDate && !props.isTrashView && (isCompleted() || isCancelled())
                  ? "line-through text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {effectiveTask().title}
            </span>
            {/* Project/Area subtitle - shown in logbook/trash view */}
            <Show when={(props.showCompletedDate || props.isTrashView) && getProjectOrAreaName()}>
              <span class="text-[12px] text-muted-foreground block truncate">{getProjectOrAreaName()}</span>
            </Show>
          </div>
        }
      >
        <EditableText
          ref={(el) => {
            titleRef = el
          }}
          value={effectiveTask().title}
          onChange={(title) => {
            if (title.trim()) {
              stickyChanges.setPendingChanges({ title })
            }
          }}
          onEnter={() => props.onExpand(props.task.id)}
          placeholder="Task title"
          class={cn(
            "flex-1 text-lg md:text-[15px] leading-tight",
            // Don't strikethrough in logbook/trash view
            !props.showCompletedDate && !props.isTrashView && (isCompleted() || isCancelled())
              ? "line-through text-muted-foreground"
              : "text-foreground",
          )}
        />
      </Show>

      {/* Metadata shown when collapsed (not in logbook/trash view) */}
      <Show when={!props.expanded && !props.showCompletedDate && !props.isTrashView}>
        <TaskMetadata
          scheduledDate={props.task.scheduledDate}
          deadline={props.task.deadline}
          notes={props.task.notes}
          hideScheduledDate={props.hideScheduledDate}
          templateId={props.task.templateId}
          tags={effectiveTags()}
          showTodayStar={props.showTodayStar}
          checklistItems={props.checklistItems?.map((i) => ({
            completed: i.completed,
          }))}
        />
      </Show>

      {/* Restore/Delete buttons - shown on hover in trash view when collapsed */}
      <Show when={!props.expanded && props.isTrashView}>
        <div class="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              props.onRestore?.(props.task.id)
            }}
          >
            <RestoreIcon class="w-3.5 h-3.5 mr-1" />
            Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation()
              props.onDelete?.(props.task.id)
            }}
          >
            Delete
          </Button>
        </div>
      </Show>
    </div>
  )

  const hasSchedule = () => Boolean(effectiveTask().scheduledDate || effectiveTask().isSomeday)
  const hasDeadline = () => Boolean(effectiveTask().deadline)

  const onScheduleChange = (date: string | undefined, isEvening?: boolean) => {
    if (props.showCompletedDate && date) {
      stickyChanges.update({
        scheduledDate: date,
        isEvening: isEvening ?? false,
        completedAt: null,
        isLogged: false,
        status: "active",
      })
      commitSticky()
    } else if (props.isTrashView && date) {
      stickyChanges.update({
        scheduledDate: date,
        isEvening: isEvening ?? false,
        trashedAt: null,
        status: "active",
      })
      commitSticky()
    } else {
      stickyChanges.update({
        scheduledDate: date ?? null,
        isEvening: isEvening ?? false,
      })
      commitSticky()
    }
  }

  const onScheduleClear = () => {
    stickyChanges.update({
      scheduledDate: null,
      isEvening: false,
      isSomeday: false,
    })
    commitSticky()
  }

  const onDeadlineChange = (date: string | undefined) => {
    stickyChanges.update({ deadline: date ?? null })
    commitSticky()
  }

  const onDeadlineClear = () => {
    stickyChanges.update({ deadline: null })
    commitSticky()
  }

  const onSomedaySelect = () => {
    stickyChanges.update({
      isSomeday: true,
      scheduledDate: null,
      isEvening: false,
    })
    commitSticky()
  }

  const onMoveChange = (listId: string | null, moveToInbox?: boolean) => {
    if (moveToInbox) {
      stickyChanges.update({
        status: null,
        listId: null,
        headingId: null,
        scheduledDate: null,
        isEvening: false,
        isSomeday: false,
      })
      commitSticky()
    } else {
      stickyChanges.update({
        status: "active",
        listId,
        headingId: null,
      })
      commitSticky()
    }
  }

  // Left side: active indicators (shown when values are set)
  const toolbarInfo = () => (
    <>
      {/* Schedule date indicator */}
      <Show when={hasSchedule()}>
        <DatePicker
          value={effectiveTask().scheduledDate ?? undefined}
          onChange={onScheduleChange}
          onClear={onScheduleClear}
          placeholder="When"
          showSomeday
          showEvening
          isEvening={effectiveTask().isEvening}
          isSomeday={effectiveTask().isSomeday}
          onSomedaySelect={onSomedaySelect}
        />
      </Show>
      {/* Deadline indicator */}
      <Show when={hasDeadline()}>
        <DatePicker
          value={effectiveTask().deadline ?? undefined}
          onChange={onDeadlineChange}
          onClear={onDeadlineClear}
          placeholder="Deadline"
          icon={<FlagIcon class="h-4 w-4 md:h-3.5 md:w-3.5 text-things-pink" />}
          title="Deadline"
        />
      </Show>
      {/* Repeat indicator if task was spawned from a template */}
      <Show when={props.task.templateId}>
        <div class="inline-flex items-center gap-1 h-9 md:h-6 px-2 rounded text-base md:text-[12px] text-muted-foreground">
          <RepeatIcon class="h-4 w-4 md:h-3.5 md:w-3.5 opacity-70" />
          <span>Repeating</span>
        </div>
      </Show>
    </>
  )

  // Right side: icon-only action buttons + info/delete
  const actionsContent = () => {
    let infoButtonRef: HTMLButtonElement | undefined
    let deleteButtonRef: HTMLButtonElement | undefined

    return (
      <>
        {/* Schedule button - only when no date set */}
        <Show when={!hasSchedule()}>
          <DatePicker
            value={undefined}
            onChange={onScheduleChange}
            placeholder="When"
            showSomeday
            showEvening
            isEvening={effectiveTask().isEvening}
            isSomeday={false}
            onSomedaySelect={onSomedaySelect}
          />
        </Show>
        {/* Add checklist button - only show if no checklist items exist */}
        <Show when={!isCompleted() && (props.checklistItems?.length ?? 0) === 0 && props.onCreateChecklistItem}>
          <ToolbarButton
            class="w-8 md:w-6 justify-center px-0"
            onClick={(e) => {
              ;(e.currentTarget as HTMLButtonElement).blur()
              props.onCreateChecklistItem?.(props.task.id, {
                title: "",
                completed: false,
                position: 1,
              })
            }}
            icon={<ListChecksIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />}
          />
        </Show>
        {/* Tags */}
        <Show when={props.onTagAdd && props.onTagRemove && !isCompleted()}>
          <TagPicker
            selectedTagIds={effectiveTags().map((t) => t.id)}
            tags={sidebar.sortedTags}
            onAdd={(tagId) => props.onTagAdd?.(props.task.id, tagId)}
            onRemove={(tagId) => props.onTagRemove?.(props.task.id, tagId)}
            disabled={isCompleted()}
          />
        </Show>
        {/* Move button */}
        <MovePicker
          listId={getListId()}
          onChangeListId={onMoveChange}
          projects={sidebar.activeProjects}
          areas={sidebar.sortedAreas}
          isInbox={effectiveTask().status === null}
        />
        {/* Deadline button - only when no deadline set */}
        <Show when={!hasDeadline()}>
          <DatePicker
            value={undefined}
            onChange={onDeadlineChange}
            placeholder="Deadline"
            icon={<FlagIcon class="h-4 w-4 md:h-3.5 md:w-3.5" />}
            title="Deadline"
          />
        </Show>
        {/* Repeat picker - only show if task doesn't have a template yet */}
        <Show when={!props.task.templateId && !isCompleted() && props.onConvertToRepeat}>
          <RepeatPicker
            value={undefined}
            startDate={props.task.scheduledDate ?? undefined}
            onChange={(rrule, startDate) => {
              if (rrule) {
                props.onConvertToRepeat?.(props.task.id, rrule, startDate)
              }
            }}
            onClear={() => {}}
            placeholder="Repeat"
            disabled={isCompleted()}
          />
        </Show>
        <div class="relative">
          <button
            ref={infoButtonRef}
            type="button"
            class="flex items-center justify-center w-8 h-8 md:w-6 md:h-6 rounded text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowInfo(!showInfo())
            }}
          >
            <InfoIcon class="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>

          {/* Info popover */}
          <Show when={showInfo() && infoButtonRef}>
            <Portal>
              <div
                role="dialog"
                class="fixed w-auto max-w-xs p-2.5 bg-popover rounded-lg shadow-xl border border-border text-[11px] z-[100]"
                style={{
                  right: `${window.innerWidth - infoButtonRef!.getBoundingClientRect().right}px`,
                  bottom: `${window.innerHeight - infoButtonRef!.getBoundingClientRect().top + 8}px`,
                }}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
              >
                <div class="space-y-1 text-foreground/80">
                  <div class="whitespace-nowrap">
                    <span class="text-muted-foreground">Created:</span>{" "}
                    {format(new Date(props.task.createdAt), "PPP p")}
                  </div>
                  <Show when={props.task.completedAt}>
                    <div class="whitespace-nowrap">
                      <span class="text-muted-foreground">Completed:</span>{" "}
                      {format(new Date(props.task.completedAt!), "PPP p")}
                    </div>
                  </Show>
                  <Show when={props.task.templateId}>
                    <div class="whitespace-nowrap">
                      <span class="text-muted-foreground">From template:</span>{" "}
                      <a
                        href={`/upcoming?template=${props.task.templateId}`}
                        class="text-things-blue hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowInfo(false)
                        }}
                      >
                        View template
                      </a>
                    </div>
                  </Show>
                  <div class="whitespace-nowrap">
                    <span class="text-muted-foreground">ID:</span>{" "}
                    <code class="bg-secondary px-1 py-0.5 rounded select-all">{props.task.id}</code>
                  </div>
                </div>
              </div>
            </Portal>
          </Show>
        </div>

        <div class="relative">
          <button
            ref={deleteButtonRef}
            type="button"
            class="flex items-center justify-center w-8 h-8 md:w-6 md:h-6 rounded text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(!showDeleteConfirm())
            }}
          >
            <Trash2Icon class="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>

          {/* Delete confirmation popover */}
          <Show when={showDeleteConfirm() && deleteButtonRef}>
            <Portal>
              <div
                role="dialog"
                class="fixed w-40 p-2.5 bg-popover rounded-lg shadow-xl border border-border z-[100]"
                style={{
                  right: `${window.innerWidth - deleteButtonRef!.getBoundingClientRect().right}px`,
                  bottom: `${window.innerHeight - deleteButtonRef!.getBoundingClientRect().top + 8}px`,
                }}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
              >
                <p class="text-[12px] text-muted-foreground text-center mb-2">Are you sure?</p>
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onUpdate(props.task.id, {
                      trashedAt: new Date().toISOString(),
                      status: "trashed",
                    })
                    setShowDeleteConfirm(false)
                    props.onExpand(props.task.id) // Close the task details
                  }}
                >
                  Delete
                </button>
              </div>
            </Portal>
          </Show>
        </div>
      </>
    )
  }

  // Drop indicators
  const beforeCard = () => (
    <Show when={state().type === "is-over" && (state() as { closestEdge: Edge }).closestEdge === "top"}>
      <TaskShadow dragging={(state() as { dragging: DOMRect }).dragging} />
    </Show>
  )

  const afterCard = () => (
    <Show when={state().type === "is-over" && (state() as { closestEdge: Edge }).closestEdge === "bottom"}>
      <TaskShadow dragging={(state() as { dragging: DOMRect }).dragging} />
    </Show>
  )

  return (
    <>
      <div
        ref={(el) => {
          outerRef = el
        }}
        class={outerClass()}
      >
        {beforeCard()}
        <ItemDetailLayout
          expanded={props.expanded}
          header={headerContent()}
          toolbar={toolbarInfo()}
          actions={actionsContent()}
          cardRef={(el) => {
            cardRef = el
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* Notes */}
          <Show when={hasNotes() || props.expanded}>
            <ProseEditor
              value={localNotes()}
              placeholder="Notes"
              disabled={!props.expanded}
              isEditing={props.expanded}
              onChange={setLocalNotes}
              onBlur={() => {
                const trimmed = localNotes().trim()
                if (trimmed !== (props.task.notes ?? "")) {
                  props.onUpdate(props.task.id, { notes: trimmed || null })
                }
              }}
              class="min-h-[80px] max-h-[200px] overflow-y-auto"
            />
          </Show>

          {/* Checklist */}
          <Show
            when={
              props.expanded &&
              props.onCreateChecklistItem &&
              props.onUpdateChecklistItem &&
              props.onDeleteChecklistItem &&
              props.onReorderChecklistItems
            }
          >
            <ChecklistEditor
              taskId={props.task.id}
              items={props.checklistItems ?? []}
              variant="inline"
              disabled={isCompleted()}
              onCreateItem={(item) =>
                props.onCreateChecklistItem ? props.onCreateChecklistItem(props.task.id, item) : Promise.resolve(null)
              }
              onUpdateItem={(itemId, changes) => props.onUpdateChecklistItem?.(props.task.id, itemId, changes)}
              onDeleteItem={(itemId) => props.onDeleteChecklistItem?.(props.task.id, itemId)}
              onReorderItems={(items) =>
                props.onReorderChecklistItems?.(
                  props.task.id,
                  items.map((i) => ({ id: i.id, position: i.position })),
                )
              }
            />
          </Show>

          {/* Tags display */}
          <Show when={effectiveTags().length > 0}>
            <div class="mx-1 m-0 flex flex-wrap gap-1.5">
              <For each={effectiveTags()}>
                {(tag) => (
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] bg-[#c8e2d6] text-[#1e7d58]">
                    {tag.title}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </ItemDetailLayout>
        {afterCard()}
      </div>

      {/* Drag preview */}
      <Show when={state().type === "preview"}>
        <Portal mount={(state() as { container: HTMLElement }).container}>
          <TaskPreview
            task={props.task}
            dragging={(state() as { dragging: DOMRect }).dragging}
            isSomeday={props.isSomeday}
          />
        </Portal>
      </Show>

      {/* Schedule date picker (opened via Ctrl+S hotkey) */}
      <Show when={!props.expanded && props.scheduleDatePickerOpen && cardRef}>
        <Popover
          open={props.scheduleDatePickerOpen}
          onOpenChange={(open) => !open && props.onScheduleDatePickerClose?.()}
        >
          <PopoverTrigger
            as="div"
            class="absolute opacity-0 pointer-events-none"
            style={{
              top: `${cardRef!.getBoundingClientRect().top + window.scrollY}px`,
              left: `${cardRef!.getBoundingClientRect().left}px`,
            }}
          />
          <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl">
            <CalendarPopover
              value={props.task.scheduledDate ?? undefined}
              onChange={(date, isEvening) => {
                props.onUpdate(props.task.id, {
                  scheduledDate: date ?? null,
                  isEvening: isEvening ?? false,
                })
                props.onScheduleDatePickerClose?.()
              }}
              showSomeday
              onSomedaySelect={() => {
                props.onUpdate(props.task.id, {
                  scheduledDate: null,
                  isSomeday: true,
                  isEvening: false,
                })
                props.onScheduleDatePickerClose?.()
              }}
              isSomeday={props.task.isSomeday}
              showEvening
              isEvening={props.task.isEvening ?? false}
              onClose={props.onScheduleDatePickerClose}
            />
          </PopoverContent>
        </Popover>
      </Show>

      {/* Move picker (opened via Ctrl+D hotkey) */}
      <Show when={!props.expanded && props.movePickerOpen && cardRef}>
        <Popover open={props.movePickerOpen} onOpenChange={(open) => !open && props.onMovePickerClose?.()}>
          <PopoverTrigger
            as="div"
            class="absolute opacity-0 pointer-events-none"
            style={{
              top: `${cardRef!.getBoundingClientRect().top + window.scrollY}px`,
              left: `${cardRef!.getBoundingClientRect().left}px`,
            }}
          />
          <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl">
            <MovePickerContent
              listId={props.task.listId}
              onChangeListId={(listId, moveToInbox) => {
                if (moveToInbox) {
                  props.onUpdate(props.task.id, {
                    status: null,
                    listId: null,
                    headingId: null,
                    isSomeday: false,
                  })
                } else {
                  props.onUpdate(props.task.id, {
                    status: "active",
                    listId,
                    headingId: null,
                  })
                }
                props.onMovePickerClose?.()
              }}
              projects={props.projects ?? []}
              areas={props.areas ?? []}
              onClose={props.onMovePickerClose}
            />
          </PopoverContent>
        </Popover>
      </Show>
    </>
  )
}
