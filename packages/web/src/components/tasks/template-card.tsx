import { format } from "date-fns"
import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { FileText as FileTextIcon, Pause as PauseIcon, Play as PlayIcon } from "lucide-solid"
import { InfoIcon, ListChecksIcon, RepeatIcon, TrashIcon } from "@/components/icons"
import { EditableText } from "@/components/ui/editable-text"
import { MovePicker } from "@/components/ui/move-picker"
import { ProseEditor } from "@/components/ui/prose-editor"
import { RepeatPicker } from "@/components/ui/repeat-picker"
import { ToolbarButton } from "@/components/ui/toolbar-button"
import type { ChecklistItemInfo, TemplateInfo } from "@/context/data"
import { useSidebarData } from "@/context/sidebar"
import { cn, parseLocalDate } from "@/lib/utils"
import { ChecklistEditor, type ChecklistItem } from "./checklist-editor"
import { ItemDetailLayout } from "./item-detail-layout"

export type TemplateCardProps = {
  template: TemplateInfo
  expanded: boolean
  selected?: boolean
  showNextDate?: boolean
  onSelect?: (id: string | null) => void
  onExpand: (id: string) => void
  onUpdate: (id: string, updates: Partial<TemplateInfo>) => void
  onDelete: (id: string) => void
  // Checklist support - matches TaskEnhancementProps types
  checklistItems?: ChecklistItemInfo[]
  onFetchChecklistItems?: (taskId: string) => void
  onCreateChecklistItem?: (taskId: string, item: Omit<ChecklistItem, "id">) => Promise<ChecklistItemInfo | null>
  onUpdateChecklistItem?: (taskId: string, itemId: string, changes: Partial<ChecklistItem>) => void
  onDeleteChecklistItem?: (taskId: string, itemId: string) => void
  onReorderChecklistItems?: (taskId: string, items: { id: string; position: number }[]) => void
}

export function TemplateCard(props: TemplateCardProps) {
  let cardRef: HTMLDivElement | undefined
  const [showInfo, setShowInfo] = createSignal(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
  const sidebar = useSidebarData()

  // Local state for notes to avoid re-render on every keystroke
  const [localNotes, setLocalNotes] = createSignal(props.template.notes ?? "")

  // Sync local notes when template changes (different template selected)
  let lastTemplateId = props.template.id
  createEffect(() => {
    if (props.template.id !== lastTemplateId) {
      lastTemplateId = props.template.id
      setLocalNotes(props.template.notes ?? "")
    }
  })

  const isPaused = () => props.template.status === "paused"

  // Fetch checklist items when template expands
  createEffect(() => {
    if (props.expanded && props.onFetchChecklistItems) {
      props.onFetchChecklistItems(props.template.id)
    }
  })

  // Handle click outside to collapse
  createEffect(() => {
    if (!props.expanded) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (cardRef?.contains(target)) {
        if (!target.closest('[role="dialog"]')) {
          setShowInfo(false)
          setShowDeleteConfirm(false)
        }
        return
      }

      if (target.closest("[data-radix-popper-content-wrapper]")) return
      if (target.closest('[role="dialog"]')) return
      if (target.closest("[data-kb-menu]")) return

      props.onExpand(props.template.id)
    }

    document.addEventListener("mousedown", handleClickOutside)
    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside)
    })
  })

  const handleDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest("button")) return
    if (target.closest("input")) return
    if (target.closest("textarea")) return
    if (target.closest(".prose-editor")) return
    if (target.closest('[role="dialog"]')) return

    e.stopPropagation()
    props.onExpand(props.template.id)
  }

  const handleClick = () => {
    if (!props.expanded) {
      props.onSelect?.(props.template.id)
    }
  }

  const handleRepeatChange = (rrule: string | undefined, startDate: string) => {
    if (!rrule) return
    props.onUpdate(props.template.id, { rrule, nextOccurrence: startDate })
  }

  const handleMoveChange = (listId: string | null, _moveToInbox?: boolean) => {
    props.onUpdate(props.template.id, { listId, headingId: null })
  }

  const handlePauseResume = () => {
    const status = props.template.status === "active" ? "paused" : "active"
    props.onUpdate(props.template.id, { status })
  }

  // Header content - repeat icon and title
  const headerContent = () => (
    <div
      class={cn(
        "flex items-center gap-2 px-4 transition-all duration-300 ease-in-out",
        props.expanded ? "pt-4 pb-2" : "py-3 md:py-2 md:cursor-pointer md:rounded-md",
        !props.expanded && props.selected && "bg-task-selected",
        !props.expanded && !props.selected && "hover:bg-secondary/50",
      )}
      onClick={handleClick}
    >
      {/* Repeat icon instead of checkbox */}
      <span class="shrink-0 w-[18px] h-[18px] flex items-center justify-center text-muted-foreground">
        <RepeatIcon class="w-4 h-4" />
      </span>

      <Show
        when={props.expanded}
        fallback={
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class={cn(
                  "text-lg md:text-[15px] leading-tight truncate",
                  isPaused() ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {props.template.title}
              </span>
              <Show when={props.template.notes?.trim()}>
                <FileTextIcon class="w-3.5 h-3.5 text-task-inline shrink-0 stroke-1" />
              </Show>
              <Show when={(props.checklistItems?.length ?? 0) > 0}>
                <span class="flex items-center gap-1 text-xs text-task-inline shrink-0">
                  <ListChecksIcon class="w-3.5 h-3.5 stroke-1" />
                  {props.checklistItems?.filter((i) => i.completed).length ?? 0}/{props.checklistItems?.length ?? 0}
                </span>
              </Show>
            </div>
          </div>
        }
      >
        <EditableText
          value={props.template.title}
          onChange={(title) => {
            if (title.trim()) {
              props.onUpdate(props.template.id, { title })
            }
          }}
          placeholder="Template title"
          class={cn(
            "flex-1 text-lg md:text-[15px] leading-tight",
            isPaused() ? "text-muted-foreground" : "text-foreground",
          )}
        />
      </Show>

      {/* Paused indicator */}
      <Show when={isPaused()}>
        <span class="text-xs text-amber-600 font-medium px-2">Paused</span>
      </Show>

      {/* Next occurrence - only shown when collapsed and showNextDate is true */}
      <Show when={!props.expanded && props.showNextDate}>
        <span class="text-xs font-bold bg-scheduled-badge-bg text-scheduled-badge-text px-1.5 py-0.5 rounded">
          {format(parseLocalDate(props.template.nextOccurrence), "MMM d")}
        </span>
      </Show>
    </div>
  )

  // Toolbar content
  const toolbarContent = () => (
    <>
      <RepeatPicker
        value={props.template.rrule}
        startDate={props.template.nextOccurrence}
        onChange={handleRepeatChange}
        onClear={() => {}}
        placeholder="Schedule"
        hideClear
      />
      <MovePicker
        listId={props.template.listId}
        onChangeListId={handleMoveChange}
        projects={sidebar.activeProjects}
        areas={sidebar.sortedAreas}
        placeholder="Move"
      />
      {/* Add checklist button - only show if no checklist items exist */}
      <Show when={!isPaused() && (props.checklistItems?.length ?? 0) === 0 && props.onCreateChecklistItem}>
        <ToolbarButton
          onClick={(e) => {
            ;(e.currentTarget as HTMLButtonElement).blur()
            props.onCreateChecklistItem?.(props.template.id, {
              title: "",
              completed: false,
              position: 1,
            })
          }}
          icon={<ListChecksIcon class="h-3.5 w-3.5 opacity-70" />}
        >
          Checklist
        </ToolbarButton>
      </Show>
      <ToolbarButton
        onClick={handlePauseResume}
        icon={isPaused() ? <PlayIcon class="w-3.5 h-3.5" /> : <PauseIcon class="w-3.5 h-3.5" />}
      >
        {isPaused() ? "Resume" : "Pause"}
      </ToolbarButton>
    </>
  )

  // Footer content - info and delete buttons
  const footerContent = () => {
    let infoButtonRef: HTMLButtonElement | undefined
    let deleteButtonRef: HTMLButtonElement | undefined

    return (
      <>
        <div class="relative">
          <button
            ref={infoButtonRef}
            type="button"
            class="flex items-center justify-center w-6 h-6 rounded text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowInfo(!showInfo())
            }}
          >
            <InfoIcon class="w-3.5 h-3.5" />
          </button>

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
                    {format(new Date(props.template.createdAt), "PPP p")}
                  </div>
                  <div class="whitespace-nowrap">
                    <span class="text-muted-foreground">ID:</span>{" "}
                    <code class="bg-secondary px-1 py-0.5 rounded select-all">{props.template.id}</code>
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
            class="flex items-center justify-center w-6 h-6 rounded text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(!showDeleteConfirm())
            }}
          >
            <TrashIcon class="w-3.5 h-3.5" />
          </button>

          <Show when={showDeleteConfirm() && deleteButtonRef}>
            <Portal>
              <div
                role="dialog"
                class="fixed w-56 p-2.5 bg-popover rounded-lg shadow-xl border border-border text-[11px] z-[100]"
                style={{
                  right: `${window.innerWidth - deleteButtonRef!.getBoundingClientRect().right}px`,
                  bottom: `${window.innerHeight - deleteButtonRef!.getBoundingClientRect().top + 8}px`,
                }}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
              >
                <p class="text-sm text-foreground mb-2">Delete this template? Spawned tasks will remain.</p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="flex-1 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="flex-1 px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      props.onDelete(props.template.id)
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Portal>
          </Show>
        </div>
      </>
    )
  }

  return (
    <ItemDetailLayout
      expanded={props.expanded}
      header={headerContent()}
      toolbar={toolbarContent()}
      actions={footerContent()}
      cardRef={(el) => {
        cardRef = el
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Notes */}
      <Show when={props.template.notes || props.expanded}>
        <ProseEditor
          value={localNotes()}
          placeholder="Notes"
          disabled={!props.expanded}
          isEditing={props.expanded}
          onChange={setLocalNotes}
          onBlur={() => {
            const trimmed = localNotes().trim()
            if (trimmed !== (props.template.notes ?? "")) {
              props.onUpdate(props.template.id, { notes: trimmed || null })
            }
          }}
        />
      </Show>

      {/* Checklist */}
      <Show
        when={
          props.onCreateChecklistItem &&
          props.onUpdateChecklistItem &&
          props.onDeleteChecklistItem &&
          ((props.checklistItems?.length ?? 0) > 0 || props.expanded)
        }
      >
        <ChecklistEditor
          taskId={props.template.id}
          items={props.checklistItems ?? []}
          variant="inline"
          disabled={isPaused()}
          onCreateItem={(item) =>
            props.onCreateChecklistItem ? props.onCreateChecklistItem(props.template.id, item) : Promise.resolve(null)
          }
          onUpdateItem={(itemId, changes) => props.onUpdateChecklistItem?.(props.template.id, itemId, changes)}
          onDeleteItem={(itemId) => props.onDeleteChecklistItem?.(props.template.id, itemId)}
          onReorderItems={(items) =>
            props.onReorderChecklistItems?.(
              props.template.id,
              items.map((i) => ({ id: i.id, position: i.position })),
            )
          }
        />
      </Show>
    </ItemDetailLayout>
  )
}
