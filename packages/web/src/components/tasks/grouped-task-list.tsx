import { dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import type { Accessor } from "solid-js"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { BatchActionBar } from "@/components/batch-action-bar"
import { getSectionData, isSectionData, isTaskData } from "@/components/dnd/task-data"
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  SomedayIcon,
  Trash2Icon,
} from "@/components/icons"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditableText } from "@/components/ui/editable-text"
import { ProjectProgressIcon } from "@/components/ui/project-progress-icon"
import { useSidebarData } from "@/context/sidebar"
import { useMultiSelect } from "@/lib/hooks/useMultiSelect"
import { useTaskKeyboardNav } from "@/lib/hooks/useTaskKeyboardNav"
import { cn } from "@/lib/utils"
import { TaskCardList } from "./task-card-list"
import { TemplateCard } from "./template-card"
import type {
  GroupedTaskListProps,
  Section,
  TaskEnhancementProps,
  TaskMoveInfo,
  TemplateEnhancementProps,
} from "./types"

function getDayOfMonth(dateStr: string): string {
  const parts = dateStr.split("-")
  return String(Number(parts[2]))
}

// Heading section header (for project view)
function HeadingHeader(props: {
  section: Section
  onHeadingEdit?: (headingId: string, title: string) => void
  onHeadingDelete?: (headingId: string) => void
  onHeadingMoveUp?: (headingId: string) => void
  onHeadingMoveDown?: (headingId: string) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  const [isHovered, setIsHovered] = createSignal(false)

  const handleTitleChange = (title: string) => {
    if (props.section.headingId && props.onHeadingEdit && title) {
      props.onHeadingEdit(props.section.headingId, title)
    }
  }

  const handleDelete = () => {
    if (props.section.headingId && props.onHeadingDelete) {
      props.onHeadingDelete(props.section.headingId)
    }
  }

  const handleMoveUp = () => {
    if (props.section.headingId && props.onHeadingMoveUp) {
      props.onHeadingMoveUp(props.section.headingId)
    }
  }

  const handleMoveDown = () => {
    if (props.section.headingId && props.onHeadingMoveDown) {
      props.onHeadingMoveDown(props.section.headingId)
    }
  }

  return (
    <div class="mb-2 px-4" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div class="flex items-center gap-2 border-b border-section-border pb-2 relative">
        <Show when={props.section.isBacklog}>
          <SomedayIcon class="w-4 h-4 shrink-0" />
        </Show>
        <Show when={props.section.isRepeated}>
          <RepeatIcon class="w-4 h-4 shrink-0" />
        </Show>
        <Show
          when={props.section.headingId && props.onHeadingEdit}
          fallback={<span class="text-lg md:text-[15px] font-bold text-things-blue">{props.section.title}</span>}
        >
          <EditableText
            value={props.section.title}
            onChange={handleTitleChange}
            placeholder="Heading"
            class="flex-1 text-lg md:text-[15px] font-bold text-things-blue"
          />
        </Show>

        {/* Triple dot menu - always rendered but invisible on hover */}
        <Show when={props.section.headingId && !props.section.isBacklog}>
          <DropdownMenu>
            <DropdownMenuTrigger
              class={cn(
                "ml-auto p-0.5 hover:bg-muted rounded transition-opacity z-10",
                isHovered() ? "opacity-100" : "opacity-0",
              )}
            >
              <MoreHorizontalIcon class="w-3.5 h-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <Show when={props.canMoveUp}>
                <DropdownMenuItem onSelect={handleMoveUp}>
                  <ChevronUpIcon class="w-4 h-4" />
                  <span>Move Up</span>
                </DropdownMenuItem>
              </Show>
              <Show when={props.canMoveDown}>
                <DropdownMenuItem onSelect={handleMoveDown}>
                  <ChevronDownIcon class="w-4 h-4" />
                  <span>Move Down</span>
                </DropdownMenuItem>
              </Show>
              <Show when={props.canMoveUp || props.canMoveDown}>
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuItem onSelect={handleDelete}>
                <Trash2Icon class="w-4 h-4" />
                <span>Delete Heading</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Show>
      </div>
    </div>
  )
}

// Completed section header
function CompletedHeader(props: { section: Section }) {
  return (
    <div class="mb-2 px-4">
      <h2 class="text-lg md:text-base font-bold text-foreground pb-2 border-b border-section-border">
        {props.section.title}
      </h2>
    </div>
  )
}

// Logged section header (collapsible, for project view)
function LoggedSectionHeader(props: { section: Section; open: boolean; onToggle: () => void }) {
  return (
    <div class="mb-2 px-4">
      <button
        type="button"
        class="flex w-full items-center gap-2 pb-2 border-b border-section-border"
        onClick={props.onToggle}
      >
        <h2 class="text-lg md:text-base font-bold" style={{ color: "#999ca1" }}>
          {props.section.title}
        </h2>
        <ChevronRightIcon
          class={cn("w-4 h-4 transition-transform ml-auto", props.open && "rotate-90")}
          style={{ color: "#999ca1" }}
        />
      </button>
    </div>
  )
}

// Project/Area linked section header
function LinkedSectionHeader(props: { section: Section }) {
  const sidebar = useSidebarData()

  const progress = () => {
    const pid = props.section.projectId
    if (!pid) return 0
    return sidebar.projectProgress.get(pid) ?? 0
  }

  const icon = () => {
    if (props.section.isEvening) {
      return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Z" />
        </svg>
      )
    }
    if (props.section.projectId) {
      return <ProjectProgressIcon progress={progress()} size={16} variant="sidebar" class="text-things-blue" />
    }
    if (props.section.areaId) {
      return <BoxIcon class="w-4 h-4" />
    }
    return null
  }

  const iconColor = () => {
    if (props.section.isEvening) return "text-things-evening"
    if (props.section.projectId) return "text-things-blue"
    if (props.section.areaId) return "text-things-green"
    return "text-muted-foreground"
  }

  return (
    <div class="mb-2 px-4">
      <div class="text-lg md:text-base font-bold pb-2 border-b border-section-border flex items-center gap-2">
        <a
          href={props.section.projectId ? `/project/${props.section.projectId}` : `/area/${props.section.areaId}`}
          class="group flex items-center gap-2 text-foreground hover:text-things-blue transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span class={iconColor()}>{icon()}</span>
          <span>{props.section.title}</span>
          <ChevronRightIcon class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  )
}

// Date-based section header (for upcoming view)
function DateSectionHeader(props: { section: Section }) {
  const day = () => getDayOfMonth(props.section.dateStr!)

  return (
    <div class="mb-3 px-4">
      <div class="flex items-start gap-2">
        <div class="text-[28px] font-bold text-foreground leading-none">{day()}</div>
        <div class="flex-1 mt-[5px] border-t border-section-border">
          <div class="text-[16px] font-bold text-date-label">{props.section.title}</div>
        </div>
      </div>
    </div>
  )
}

// Later section header (for upcoming view)
function LaterSectionHeader(props: { section: Section }) {
  return (
    <div class="mb-3 px-4">
      <div class="pt-3 border-t border-section-border">
        <div class="text-[20px] font-bold text-foreground leading-none">{props.section.title}</div>
      </div>
    </div>
  )
}

function SectionHeader(props: {
  section: Section
  isProjectView?: boolean
  onHeadingEdit?: (headingId: string, title: string) => void
  onHeadingDelete?: (headingId: string) => void
  onHeadingMoveUp?: (headingId: string) => void
  onHeadingMoveDown?: (headingId: string) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  // No header for unheaded sections or empty titles
  if (
    props.section.id === "section:no-project" ||
    props.section.id === "section:unheaded" ||
    props.section.title === ""
  ) {
    return null
  }

  // Logged section - handled separately in SectionTasks with collapsible
  if (props.section.isLogged) {
    return null
  }

  // Completed section
  if (props.section.isCompleted) {
    return <CompletedHeader section={props.section} />
  }

  // Date section for upcoming view
  if (props.section.dateStr) {
    return <DateSectionHeader section={props.section} />
  }

  // Later section for upcoming view
  if (props.section.id === "later") {
    return <LaterSectionHeader section={props.section} />
  }

  // Heading section (for project view) or backlog/someday sections or repeated sections
  if (props.section.headingId || props.section.isBacklog || props.section.isRepeated) {
    return (
      <HeadingHeader
        section={props.section}
        onHeadingEdit={props.onHeadingEdit}
        onHeadingDelete={props.onHeadingDelete}
        onHeadingMoveUp={props.onHeadingMoveUp}
        onHeadingMoveDown={props.onHeadingMoveDown}
        canMoveUp={props.canMoveUp}
        canMoveDown={props.canMoveDown}
      />
    )
  }

  // Project or Area linked section (for today/anytime views)
  if (props.section.projectId || props.section.areaId) {
    return <LinkedSectionHeader section={props.section} />
  }

  // Evening section without link
  if (props.section.isEvening) {
    return (
      <div class="mb-2 px-4">
        <div class="text-lg md:text-base font-bold pb-2 border-b border-section-border flex items-center gap-2">
          <span class="text-things-evening">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Z" />
            </svg>
          </span>
          <span class="text-foreground">{props.section.title}</span>
        </div>
      </div>
    )
  }

  return null
}

// Empty section drop zone for headings with no tasks
function EmptySectionDropZone(props: { section: Section }) {
  let ref: HTMLDivElement | undefined
  const [isOver, setIsOver] = createSignal(false)
  const [isDragging, setIsDragging] = createSignal(false)

  createEffect(() => {
    const element = ref
    if (!element) return

    const cleanup = dropTargetForElements({
      element,
      canDrop: ({ source }) => isTaskData(source.data),
      getData: () => getSectionData(props.section),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })

    // Also monitor to show visual feedback when any task is being dragged
    const monitorCleanup = monitorForElements({
      canMonitor: ({ source }) => isTaskData(source.data),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })

    onCleanup(() => {
      cleanup()
      monitorCleanup()
    })
  })

  return (
    <div class="px-4 md:px-2">
      <div
        ref={ref}
        class={cn(
          "rounded border border-dashed py-2 text-center text-sm text-muted-foreground transition-colors",
          isOver() ? "border-things-blue bg-things-blue/10" : isDragging() ? "border-border/70" : "border-border",
        )}
      >
        No tasks
      </div>
    </div>
  )
}

function SectionTasks(props: {
  section: Section
  onComplete: (id: string, completed: boolean) => void
  onCancel?: (id: string) => void
  onUncancel?: (id: string) => void
  onUpdate: (id: string, updates: Partial<unknown>) => void
  onSelect?: (id: string, event: MouseEvent) => void
  isSomeday?: boolean
  hideScheduledDate?: boolean
  showTodayStar?: boolean
  isProjectView?: boolean
  onHeadingEdit?: (headingId: string, title: string) => void
  onHeadingDelete?: (headingId: string) => void
  onHeadingMoveUp?: (headingId: string) => void
  onHeadingMoveDown?: (headingId: string) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  expandedTaskId: Accessor<string | null>
  expandedTemplateId: Accessor<string | null>
  selectedIds: Accessor<Set<string>>
  scheduleDatePickerTaskId: Accessor<string | null>
  onScheduleDatePickerClose: () => void
  movePickerTaskId: Accessor<string | null>
  onMovePickerClose: () => void
  autoCommitSticky?: boolean
  projects?: Array<{ id: string; title: string; areaId?: string | null }>
  areas?: Array<{ id: string; title: string }>
  onExpand: (id: string) => void
  onTemplateExpand: (id: string) => void
  enhancement: TaskEnhancementProps
  templateEnhancement: TemplateEnhancementProps
}) {
  // Tasks in backlog sections should show dashed checkboxes
  const isSomedaySection = () => props.isSomeday || props.section.isBacklog
  const hasTemplates = () => (props.section.templates ?? []).length > 0
  const hasContent = () => props.section.tasks.length > 0 || hasTemplates()

  // Logged sections use a collapsible wrapper, collapsed by default
  if (props.section.isLogged) {
    const [open, setOpen] = createSignal(false)
    return (
      <div class="mb-4">
        <LoggedSectionHeader section={props.section} open={open()} onToggle={() => setOpen((v) => !v)} />
        <Collapsible open={open()}>
          <CollapsibleContent>
            <TaskCardList
              tasks={props.section.tasks}
              expandedTaskId={props.expandedTaskId}
              selectedIds={props.selectedIds}
              scheduleDatePickerTaskId={props.scheduleDatePickerTaskId}
              onScheduleDatePickerClose={props.onScheduleDatePickerClose}
              movePickerTaskId={props.movePickerTaskId}
              onMovePickerClose={props.onMovePickerClose}
              projects={props.projects}
              areas={props.areas}
              onSelect={props.onSelect}
              onExpand={props.onExpand}
              onComplete={props.onComplete}
              onCancel={props.onCancel}
              onUncancel={props.onUncancel}
              onUpdate={props.onUpdate}
              showCompletedDate
              autoCommitSticky={props.autoCommitSticky}
              taskTags={props.enhancement.taskTags}
              onTagAdd={props.enhancement.onTagAdd}
              onTagRemove={props.enhancement.onTagRemove}
              onFetchTags={props.enhancement.onFetchTags}
              checklistItems={props.enhancement.checklistItems}
              onFetchChecklistItems={props.enhancement.onFetchChecklistItems}
              onCreateChecklistItem={props.enhancement.onCreateChecklistItem}
              onUpdateChecklistItem={props.enhancement.onUpdateChecklistItem}
              onDeleteChecklistItem={props.enhancement.onDeleteChecklistItem}
              onReorderChecklistItems={props.enhancement.onReorderChecklistItems}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <div class="mb-4">
      <SectionHeader
        section={props.section}
        isProjectView={props.isProjectView}
        onHeadingEdit={props.onHeadingEdit}
        onHeadingDelete={props.onHeadingDelete}
        onHeadingMoveUp={props.onHeadingMoveUp}
        onHeadingMoveDown={props.onHeadingMoveDown}
        canMoveUp={props.canMoveUp}
        canMoveDown={props.canMoveDown}
      />
      <Show
        when={hasContent()}
        fallback={
          <Show when={props.section.headingId || props.section.isBacklog}>
            <EmptySectionDropZone section={props.section} />
          </Show>
        }
      >
        {/* Tasks */}
        <Show when={props.section.tasks.length > 0}>
          <TaskCardList
            tasks={props.section.tasks}
            expandedTaskId={props.expandedTaskId}
            selectedIds={props.selectedIds}
            scheduleDatePickerTaskId={props.scheduleDatePickerTaskId}
            onScheduleDatePickerClose={props.onScheduleDatePickerClose}
            movePickerTaskId={props.movePickerTaskId}
            onMovePickerClose={props.onMovePickerClose}
            projects={props.projects}
            areas={props.areas}
            onSelect={props.onSelect}
            onExpand={props.onExpand}
            onComplete={props.onComplete}
            onCancel={props.onCancel}
            onUncancel={props.onUncancel}
            onUpdate={props.onUpdate}
            isSomeday={isSomedaySection()}
            hideScheduledDate={props.hideScheduledDate}
            showTodayStar={props.showTodayStar}
            autoCommitSticky={props.autoCommitSticky}
            taskTags={props.enhancement.taskTags}
            onTagAdd={props.enhancement.onTagAdd}
            onTagRemove={props.enhancement.onTagRemove}
            onFetchTags={props.enhancement.onFetchTags}
            onConvertToRepeat={props.enhancement.onConvertToRepeat}
            checklistItems={props.enhancement.checklistItems}
            onFetchChecklistItems={props.enhancement.onFetchChecklistItems}
            onCreateChecklistItem={props.enhancement.onCreateChecklistItem}
            onUpdateChecklistItem={props.enhancement.onUpdateChecklistItem}
            onDeleteChecklistItem={props.enhancement.onDeleteChecklistItem}
            onReorderChecklistItems={props.enhancement.onReorderChecklistItems}
          />
        </Show>

        {/* Templates (repeating rules) */}
        <For each={props.section.templates ?? []}>
          {(template) => (
            <TemplateCard
              template={template}
              expanded={props.expandedTemplateId() === template.id}
              onExpand={props.onTemplateExpand}
              onUpdate={(id, updates) => props.templateEnhancement.onTemplateUpdate?.(id, updates)}
              onDelete={(id) => props.templateEnhancement.onTemplateDelete?.(id)}
              showNextDate={props.section.isLater}
              checklistItems={props.enhancement.checklistItems?.[template.id]}
              onFetchChecklistItems={props.enhancement.onFetchChecklistItems}
              onCreateChecklistItem={props.enhancement.onCreateChecklistItem}
              onUpdateChecklistItem={props.enhancement.onUpdateChecklistItem}
              onDeleteChecklistItem={props.enhancement.onDeleteChecklistItem}
              onReorderChecklistItems={props.enhancement.onReorderChecklistItems}
            />
          )}
        </For>
      </Show>
    </div>
  )
}

export function GroupedTaskList(props: GroupedTaskListProps) {
  // Track which task is expanded
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(props.initialExpandedTaskId ?? null)
  // Track which template is expanded
  const [expandedTemplateId, setExpandedTemplateId] = createSignal<string | null>(
    props.initialExpandedTemplateId ?? null,
  )
  // Track which task has the schedule date picker open (via Ctrl+S)
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = createSignal<string | null>(null)
  // Track which task has the move picker open (via Ctrl+D)
  const [movePickerTaskId, setMovePickerTaskId] = createSignal<string | null>(null)

  // Flatten all tasks from sections for keyboard navigation
  const allTasks = createMemo(() => props.sections.flatMap((section) => section.tasks))

  // Multi-select support
  const { selectedIds, lastSelectedId, handleSelect, clearSelection, selectAll, isMultiSelecting } = useMultiSelect({
    items: allTasks,
  })

  // If initialExpandedTaskId is provided, also select that task
  createEffect(() => {
    const initialId = props.initialExpandedTaskId
    if (initialId && allTasks().some((t) => t.id === initialId)) {
      setExpandedTaskId(initialId)
      // Select the task as well
      handleSelect(initialId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        button: 0,
      } as MouseEvent)
    }
  })

  // Setup keyboard navigation - uses lastSelectedId for single selection navigation
  useTaskKeyboardNav({
    tasks: allTasks,
    selectedTaskId: lastSelectedId,
    expandedTaskId,
    onSelect: (taskId) => {
      if (taskId) {
        // Simulate a regular click (no modifiers)
        handleSelect(taskId, {
          shiftKey: false,
          metaKey: false,
          ctrlKey: false,
          button: 0,
        } as MouseEvent)
      } else {
        clearSelection()
      }
    },
    onExpand: (taskId) => {
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
      setExpandedTemplateId(null)
    },
  })

  // Ctrl+S and Ctrl+D hotkeys for opening pickers on selected task
  createEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      const selected = lastSelectedId()
      const expanded = expandedTaskId()
      const multiSelecting = isMultiSelecting()

      // Ctrl+S to open schedule date picker
      if (e.key === "s" && e.ctrlKey && !e.metaKey) {
        if (selected && !expanded && !multiSelecting) {
          e.preventDefault()
          setScheduleDatePickerTaskId(selected)
        }
      }

      // Ctrl+D to open move picker
      if (e.key === "d" && e.ctrlKey && !e.metaKey) {
        if (selected && !expanded && !multiSelecting) {
          e.preventDefault()
          setMovePickerTaskId(selected)
        }
      }

      // Cmd+A to select all
      if (e.key === "a" && e.metaKey) {
        e.preventDefault()
        selectAll()
      }
    }
    document.addEventListener("keydown", handler)
    onCleanup(() => document.removeEventListener("keydown", handler))
  })

  // Click outside any task card clears selection
  createEffect(() => {
    if (!isMultiSelecting()) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-task-card]")) return
      if (target.closest("[data-radix-popper-content-wrapper]")) return
      if (target.closest('[role="dialog"]')) return
      if (target.closest("[data-kb-menu]")) return
      clearSelection()
    }
    document.addEventListener("mousedown", handler)
    onCleanup(() => document.removeEventListener("mousedown", handler))
  })

  const handleExpand = (taskId: string) => {
    // Clear multi-selection when expanding
    clearSelection()
    // Toggle: if already expanded, collapse; otherwise expand
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
    // Collapse any expanded template when expanding a task
    setExpandedTemplateId(null)
    // Select the expanded task
    handleSelect(taskId, {
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      button: 0,
    } as MouseEvent)
  }

  const handleTemplateExpand = (templateId: string) => {
    setExpandedTemplateId((prev) => (prev === templateId ? null : templateId))
    // Collapse any expanded task when expanding a template
    setExpandedTaskId(null)
  }

  const findTaskSection = (taskId: string): Section | undefined => {
    return props.sections.find((s) => s.tasks.some((t) => t.id === taskId))
  }

  const findSectionById = (sectionId: string): Section | undefined => {
    return props.sections.find((s) => s.id === sectionId)
  }

  createEffect(() => {
    const cleanup = monitorForElements({
      canMonitor({ source }) {
        return isTaskData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceData = source.data
        const targetData = target.data

        if (!isTaskData(sourceData)) return

        const sourceSection = findTaskSection(sourceData.taskId)
        if (!sourceSection) return

        const sourceTasks = sourceSection.tasks
        const indexOfSource = sourceTasks.findIndex((t) => t.id === sourceData.taskId)
        if (indexOfSource < 0) return

        // Handle drop on empty section
        if (isSectionData(targetData)) {
          const targetSection = findSectionById(targetData.section.id)
          if (!targetSection) return

          // Same section - no-op
          if (sourceSection.id === targetSection.id) return

          // Move to empty section (add at position 0)
          const task = sourceTasks[indexOfSource]
          const newTargetTasks = [task]

          const moveInfo: TaskMoveInfo = {
            taskId: sourceData.taskId,
            fromSectionId: sourceSection.id,
            toSectionId: targetSection.id,
            toSection: targetSection,
            newIndex: 0,
            newTaskIds: newTargetTasks.map((t) => t.id),
          }

          props.onMove(moveInfo)

          const element = document.querySelector(`[data-task-id="${sourceData.taskId}"]`)
          if (element instanceof HTMLElement) {
            triggerPostMoveFlash(element)
          }
          return
        }

        // Handle drop on another task
        if (!isTaskData(targetData)) return

        const targetSection = findTaskSection(targetData.taskId)
        if (!targetSection) return

        const targetTasks = targetSection.tasks
        const indexOfTarget = targetTasks.findIndex((t) => t.id === targetData.taskId)
        if (indexOfTarget < 0) return

        // Same task dropped on itself - no-op
        if (sourceData.taskId === targetData.taskId) return

        const closestEdge = extractClosestEdge(targetData)

        // Same section - reorder
        if (sourceSection.id === targetSection.id) {
          const reordered = reorderWithEdge({
            list: targetTasks,
            startIndex: indexOfSource,
            indexOfTarget,
            closestEdgeOfTarget: closestEdge,
            axis: "vertical",
          })

          props.onReorder(
            targetSection.id,
            reordered.map((t) => t.id),
          )
        } else {
          // Cross-section move
          const task = sourceTasks[indexOfSource]
          const newTargetTasks = [...targetTasks]

          // Insert at the right position based on edge
          const insertIndex = closestEdge === "top" ? indexOfTarget : indexOfTarget + 1
          newTargetTasks.splice(insertIndex, 0, task)

          const moveInfo: TaskMoveInfo = {
            taskId: sourceData.taskId,
            fromSectionId: sourceSection.id,
            toSectionId: targetSection.id,
            toSection: targetSection,
            newIndex: insertIndex,
            newTaskIds: newTargetTasks.map((t) => t.id),
          }

          props.onMove(moveInfo)
        }

        const element = document.querySelector(`[data-task-id="${sourceData.taskId}"]`)
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      },
    })

    onCleanup(cleanup)
  })

  // Batch operation handlers
  const handleBatchDateChange = (date: string | null, isEvening?: boolean) => {
    const ids = Array.from(selectedIds())
    props.onBatchDateChange?.(ids, date, isEvening)
    clearSelection()
  }

  const handleBatchMove = (parentId: string | null, moveToInbox?: boolean) => {
    const ids = Array.from(selectedIds())
    props.onBatchMove?.(ids, parentId, moveToInbox)
    clearSelection()
  }

  const handleBatchTrash = () => {
    const ids = Array.from(selectedIds())
    props.onBatchTrash?.(ids)
    clearSelection()
  }

  // Calculate which headings can move
  const headingSections = createMemo(() => props.sections.filter((s) => s.headingId && !s.isBacklog))

  return (
    <>
      <div class="flex flex-col">
        <For each={props.sections}>
          {(section) => {
            // Calculate if this heading can move up or down
            const canMoveUp = () => {
              if (!section.headingId || section.isBacklog) return false
              const headings = headingSections()
              const headingIndex = headings.findIndex((s) => s.headingId === section.headingId)
              return headingIndex > 0
            }

            const canMoveDown = () => {
              if (!section.headingId || section.isBacklog) return false
              const headings = headingSections()
              const headingIndex = headings.findIndex((s) => s.headingId === section.headingId)
              return headingIndex < headings.length - 1
            }

            return (
              <SectionTasks
                section={section}
                onComplete={props.onComplete}
                onCancel={props.onCancel}
                onUncancel={props.onUncancel}
                onUpdate={props.onUpdate}
                onSelect={handleSelect}
                isSomeday={props.isSomeday}
                hideScheduledDate={props.hideScheduledDate}
                isProjectView={props.isProjectView}
                onHeadingEdit={props.onHeadingEdit}
                onHeadingDelete={props.onHeadingDelete}
                onHeadingMoveUp={props.onHeadingMoveUp}
                onHeadingMoveDown={props.onHeadingMoveDown}
                canMoveUp={canMoveUp()}
                canMoveDown={canMoveDown()}
                expandedTaskId={expandedTaskId}
                expandedTemplateId={expandedTemplateId}
                selectedIds={selectedIds}
                scheduleDatePickerTaskId={scheduleDatePickerTaskId}
                onScheduleDatePickerClose={() => setScheduleDatePickerTaskId(null)}
                movePickerTaskId={movePickerTaskId}
                onMovePickerClose={() => setMovePickerTaskId(null)}
                autoCommitSticky={props.autoCommitSticky}
                projects={props.projects}
                areas={props.areas}
                onExpand={handleExpand}
                onTemplateExpand={handleTemplateExpand}
                showTodayStar={props.showTodayStar}
                enhancement={{
                  taskTags: props.taskTags,
                  onTagAdd: props.onTagAdd,
                  onTagRemove: props.onTagRemove,
                  onFetchTags: props.onFetchTags,
                  onConvertToRepeat: props.onConvertToRepeat,
                  checklistItems: props.checklistItems,
                  onFetchChecklistItems: props.onFetchChecklistItems,
                  onCreateChecklistItem: props.onCreateChecklistItem,
                  onUpdateChecklistItem: props.onUpdateChecklistItem,
                  onDeleteChecklistItem: props.onDeleteChecklistItem,
                  onReorderChecklistItems: props.onReorderChecklistItems,
                }}
                templateEnhancement={{
                  onTemplateUpdate: props.onTemplateUpdate,
                  onTemplateDelete: props.onTemplateDelete,
                }}
              />
            )
          }}
        </For>
      </div>

      {/* Batch action bar - shown when multiple tasks are selected */}
      <Show when={isMultiSelecting() && props.onBatchDateChange && props.onBatchMove && props.onBatchTrash}>
        <BatchActionBar
          count={selectedIds().size}
          onDateChange={handleBatchDateChange}
          onMove={handleBatchMove}
          onTrash={handleBatchTrash}
          onClear={clearSelection}
          projects={props.projects ?? []}
          areas={props.areas ?? []}
        />
      </Show>
    </>
  )
}
