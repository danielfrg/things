import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { attachClosestEdge, type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { GripVertical as GripVerticalIcon } from "lucide-solid"
import { cn } from "@/lib/utils"

// Checklist item type
export type ChecklistItem = {
  id: string
  title: string
  completed: boolean
  position: number
}

// Symbol for type-safe drag data
const checklistItemKey = Symbol("checklist-item")

type ChecklistItemDragData = {
  [checklistItemKey]: true
  item: ChecklistItem
  index: number
  editorId: string
}

function getChecklistItemDragData(item: ChecklistItem, index: number, editorId: string): ChecklistItemDragData {
  return { [checklistItemKey]: true, item, index, editorId }
}

function isChecklistItemDragData(data: unknown): data is ChecklistItemDragData {
  return typeof data === "object" && data !== null && checklistItemKey in data
}

type ItemState = { type: "idle" } | { type: "dragging" } | { type: "over"; edge: Edge }

const idle: ItemState = { type: "idle" }

export type ChecklistEditorProps = {
  taskId: string
  items: ChecklistItem[]
  variant?: "default" | "inline"
  disabled?: boolean
  onCreateItem: (item: Omit<ChecklistItem, "id">) => Promise<{ id: string } | null>
  onUpdateItem: (id: string, changes: Partial<ChecklistItem>) => void
  onDeleteItem: (id: string) => void
  onReorderItems: (items: ChecklistItem[]) => void
}

// Individual checklist item row
function ChecklistItemRow(props: {
  item: ChecklistItem
  index: number
  editorId: string
  disabled: boolean
  isFirst: boolean
  isLast: boolean
  variant: "default" | "inline"
  state: ItemState
  setState: (state: ItemState) => void
  onToggle: () => void
  onUpdateTitle: (title: string) => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onRegisterInput: (el: HTMLInputElement) => void
}) {
  const [localTitle, setLocalTitle] = createSignal(props.item.title)
  let deleting = false
  let rowRef: HTMLDivElement | undefined
  let handleRef: HTMLDivElement | undefined

  // Sync from props when item changes externally
  createEffect(() => {
    setLocalTitle(props.item.title)
  })

  // Setup drag and drop
  createEffect(() => {
    if (props.disabled) return

    const row = rowRef
    const handle = handleRef
    if (!row || !handle) return

    const cleanup = combine(
      draggable({
        element: row,
        dragHandle: handle,
        getInitialData: () => getChecklistItemDragData(props.item, props.index, props.editorId),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          if (row) {
            const rect = row.getBoundingClientRect()
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: () => ({ x: rect.width / 2, y: rect.height / 2 }),
              render: ({ container }) => {
                const clone = row.cloneNode(true) as HTMLElement
                clone.style.width = `${rect.width}px`
                clone.style.backgroundColor = "var(--background)"
                clone.style.borderRadius = "4px"
                clone.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                clone.style.opacity = "1"
                container.appendChild(clone)
              },
            })
          }
        },
        onDragStart: () => {
          props.setState({ type: "dragging" })
          if (navigator.vibrate) navigator.vibrate(10)
        },
        onDrop: () => props.setState(idle),
      }),
      dropTargetForElements({
        element: row,
        canDrop: ({ source }) => {
          if (!isChecklistItemDragData(source.data)) return false
          return source.data.editorId === props.editorId
        },
        getData: ({ input }) => {
          return attachClosestEdge(
            { itemId: props.item.id },
            {
              element: row,
              input,
              allowedEdges: ["top", "bottom"],
            },
          )
        },
        onDragEnter: ({ self, source }) => {
          if (!isChecklistItemDragData(source.data)) return
          if (source.data.item.id === props.item.id) return
          const edge = extractClosestEdge(self.data)
          if (edge) props.setState({ type: "over", edge })
        },
        onDrag: ({ self, source }) => {
          if (!isChecklistItemDragData(source.data)) return
          if (source.data.item.id === props.item.id) return
          const edge = extractClosestEdge(self.data)
          if (edge) props.setState({ type: "over", edge })
        },
        onDragLeave: () => props.setState(idle),
        onDrop: () => props.setState(idle),
      }),
    )

    onCleanup(cleanup)
  })

  const handleBlur = () => {
    if (deleting) return
    if (localTitle() !== props.item.title) {
      props.onUpdateTitle(localTitle())
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (localTitle() !== props.item.title) {
        props.onUpdateTitle(localTitle())
      }
      props.onEnter()
    } else if (e.key === "Backspace" && localTitle() === "") {
      e.preventDefault()
      deleting = true
      props.onBackspaceEmpty()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      props.onArrowUp()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      props.onArrowDown()
    }
  }

  const isInline = () => props.variant === "inline"
  const isCompleted = () => props.item.completed

  return (
    <div
      ref={rowRef}
      class={cn(
        "group flex items-center gap-2 relative",
        isInline() ? cn("h-[30px] px-2 border-border", props.isFirst && "border-t", "border-b") : "py-2 md:py-1",
        props.state.type === "dragging" && (isInline() ? "opacity-50 bg-secondary" : "opacity-50"),
      )}
    >
      {/* Drop indicator - top */}
      <Show when={props.state.type === "over" && props.state.edge === "top"}>
        <div
          class={cn(
            "absolute left-0 right-0 h-[2px] bg-things-blue z-10",
            isInline() ? "-top-[1px]" : "-top-0.5 rounded-full",
          )}
        />
      </Show>

      {/* Checkbox button */}
      <button
        type="button"
        disabled={props.disabled}
        onClick={(e) => {
          e.stopPropagation()
          props.onToggle()
        }}
        class={cn(
          "w-[13px] h-[13px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isCompleted()
            ? "bg-things-blue border-things-blue"
            : "border-things-blue bg-transparent hover:bg-things-blue/10",
        )}
      >
        {isCompleted() && (
          <svg class="w-full h-full text-white" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M3 6l2 2L9 4"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )}
      </button>

      <input
        ref={(el) => props.onRegisterInput(el)}
        type="text"
        value={localTitle()}
        onInput={(e) => setLocalTitle(e.currentTarget.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={props.disabled}
        class={cn(
          "flex-1 w-full min-w-0 bg-transparent outline-none text-base md:text-[15px] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          isCompleted() && "line-through text-muted-foreground",
        )}
        placeholder={props.index === 0 ? (isInline() ? "Add item..." : "Add checklist item...") : ""}
      />

      {/* Drag handle - right side */}
      <Show when={!props.disabled}>
        <div
          ref={handleRef}
          class={cn(
            "cursor-grab opacity-0 group-hover:opacity-100 transition-opacity",
            isInline() ? "text-border hover:text-muted-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <GripVerticalIcon class="w-4 h-4" />
        </div>
      </Show>

      {/* Drop indicator - bottom */}
      <Show when={props.state.type === "over" && props.state.edge === "bottom"}>
        <div
          class={cn(
            "absolute left-0 right-0 h-[2px] bg-things-blue z-10",
            isInline() ? "-bottom-[1px]" : "-bottom-0.5 rounded-full",
          )}
        />
      </Show>
    </div>
  )
}

export function ChecklistEditor(props: ChecklistEditorProps) {
  const editorId = () => props.taskId
  const inputRefs = new Map<string, HTMLInputElement>()

  // Track state per item for visual feedback
  const [itemStates, setItemStates] = createSignal<Map<string, ItemState>>(new Map())

  const getItemState = (itemId: string): ItemState => itemStates().get(itemId) ?? idle

  const setItemState = (itemId: string, state: ItemState) => {
    setItemStates((prev) => {
      const next = new Map(prev)
      if (state.type === "idle") {
        next.delete(itemId)
      } else {
        next.set(itemId, state)
      }
      return next
    })
  }

  // Helper to focus an input with retry
  const focusInput = (itemId: string, cursorPosition: number | "end") => {
    const tryFocus = (attempts = 0) => {
      const input = inputRefs.get(itemId)
      if (input) {
        input.focus()
        const pos = cursorPosition === "end" ? input.value.length : cursorPosition
        input.setSelectionRange(pos, pos)
      } else if (attempts < 30) {
        requestAnimationFrame(() => tryFocus(attempts + 1))
      }
    }
    requestAnimationFrame(() => tryFocus())
  }

  // Sort items by position
  const sortedItems = createMemo(() => {
    return [...props.items].sort((a, b) => a.position - b.position)
  })

  // Auto-focus when first item appears (e.g., after clicking "Checklist" button)
  let prevItemCount = props.items.length
  createEffect(() => {
    const currentCount = props.items.length
    if (prevItemCount === 0 && currentCount === 1 && !props.disabled) {
      const firstItem = props.items[0]
      if (firstItem) {
        focusInput(firstItem.id, 0)
      }
    }
    prevItemCount = currentCount
  })

  // Set up monitor for reordering
  createEffect(() => {
    if (props.disabled) return

    const cleanup = monitorForElements({
      canMonitor: ({ source }) => {
        if (!isChecklistItemDragData(source.data)) return false
        return source.data.editorId === editorId()
      },
      onDrop: ({ source, location }) => {
        const dragging = source.data
        if (!isChecklistItemDragData(dragging)) return

        const target = location.current.dropTargets[0]
        if (!target) return

        const targetData = target.data as { itemId?: string }
        const targetItemId = targetData.itemId
        if (!targetItemId) return

        const edge = extractClosestEdge(target.data)
        if (!edge) return

        const currentItems = sortedItems()
        const startIndex = currentItems.findIndex((i) => i.id === dragging.item.id)
        const targetIndex = currentItems.findIndex((i) => i.id === targetItemId)

        if (startIndex === -1 || targetIndex === -1) return
        if (startIndex === targetIndex) return

        const reordered = reorderWithEdge({
          axis: "vertical",
          list: currentItems,
          startIndex,
          indexOfTarget: targetIndex,
          closestEdgeOfTarget: edge,
        })

        // Update positions
        const updated = reordered.map((item, idx) => ({
          ...item,
          position: idx + 1,
        }))
        props.onReorderItems(updated)
      },
    })

    onCleanup(cleanup)
  })

  const handleToggleItem = (item: ChecklistItem) => {
    props.onUpdateItem(item.id, { completed: !item.completed })
  }

  const handleUpdateItemTitle = (item: ChecklistItem, title: string) => {
    if (title === item.title) return
    props.onUpdateItem(item.id, { title })
  }

  const handleEnter = async (index: number) => {
    // Get current and next items from sorted array
    const items = sortedItems()
    const currentItem = items[index]
    const nextItem = items[index + 1]

    // Calculate position using fractional positioning
    const currentPosition = currentItem?.position ?? index + 1
    const nextPosition = nextItem?.position ?? currentPosition + 2
    const newPosition = (currentPosition + nextPosition) / 2

    const created = await props.onCreateItem({
      title: "",
      completed: false,
      position: newPosition,
    })
    if (created) focusInput(created.id, 0)
  }

  const handleBackspaceEmpty = (index: number, itemId: string) => {
    // Determine which item to focus before deleting
    const items = sortedItems()
    if (items.length > 1) {
      const focusItem = index > 0 ? items[index - 1] : items[1]
      if (focusItem) {
        // Focus previous item at end, or next item at start
        focusInput(focusItem.id, index > 0 ? "end" : 0)
      }
    }
    props.onDeleteItem(itemId)
  }

  const handleArrowUp = (index: number) => {
    if (index > 0) {
      const items = sortedItems()
      const prevItem = items[index - 1]
      if (prevItem) focusInput(prevItem.id, "end")
    }
  }

  const handleArrowDown = (index: number) => {
    const items = sortedItems()
    if (index < items.length - 1) {
      const nextItem = items[index + 1]
      if (nextItem) focusInput(nextItem.id, 0)
    }
  }

  const registerInput = (itemId: string, el: HTMLInputElement) => {
    inputRefs.set(itemId, el)
  }

  // Handle empty state
  const isEmpty = () => sortedItems().length === 0

  return (
    <Show
      when={!isEmpty() || !props.disabled}
      fallback={
        props.variant === "default" ? <p class="text-sm text-muted-foreground italic">No checklist items</p> : null
      }
    >
      <Show when={!isEmpty() || props.variant === "default"}>
        <div class={props.variant === "inline" ? "my-4 rounded-md overflow-hidden" : "my-4 space-y-1"}>
          <For each={sortedItems()}>
            {(item, index) => (
              <ChecklistItemRow
                item={item}
                index={index()}
                editorId={editorId()}
                disabled={props.disabled ?? false}
                isFirst={index() === 0}
                isLast={index() === sortedItems().length - 1}
                variant={props.variant ?? "default"}
                state={getItemState(item.id)}
                setState={(state) => setItemState(item.id, state)}
                onToggle={() => handleToggleItem(item)}
                onUpdateTitle={(title) => handleUpdateItemTitle(item, title)}
                onEnter={() => handleEnter(index())}
                onBackspaceEmpty={() => handleBackspaceEmpty(index(), item.id)}
                onArrowUp={() => handleArrowUp(index())}
                onArrowDown={() => handleArrowDown(index())}
                onRegisterInput={(el) => registerInput(item.id, el)}
              />
            )}
          </For>
        </div>
      </Show>
    </Show>
  )
}
