import { type Accessor, createMemo, createSignal } from "solid-js"

interface TaskLike {
  id: string
}

interface UseMultiSelectOptions<T extends TaskLike> {
  items: Accessor<T[]>
}

interface UseMultiSelectReturn {
  selectedIds: Accessor<Set<string>>
  lastSelectedId: Accessor<string | null>
  handleSelect: (id: string, event: MouseEvent) => void
  clearSelection: () => void
  selectAll: () => void
  isMultiSelecting: Accessor<boolean>
}

export function useMultiSelect<T extends TaskLike>({ items }: UseMultiSelectOptions<T>): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = createSignal<string | null>(null)
  const [anchorId, setAnchorId] = createSignal<string | null>(null)

  const itemIds = createMemo(() => items().map((item) => item.id)) as Accessor<string[]>

  const selectRange = (fromId: string, toId: string) => {
    const ids = itemIds()
    const fromIndex = ids.indexOf(fromId)
    const toIndex = ids.indexOf(toId)

    if (fromIndex === -1 || toIndex === -1) return

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = ids.slice(start, end + 1)

    setSelectedIds(new Set(rangeIds))
  }

  const handleSelect = (id: string, event: MouseEvent) => {
    const isShift = event.shiftKey
    const isMeta = event.metaKey || event.ctrlKey

    if (isShift && anchorId()) {
      // Range selection from anchor to clicked item
      selectRange(anchorId()!, id)
      setLastSelectedId(id)
    } else if (isMeta) {
      // Toggle individual selection
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
      setLastSelectedId(id)
      setAnchorId(id)
    } else {
      // Regular click - clear and select single
      setSelectedIds(new Set([id]))
      setLastSelectedId(id)
      setAnchorId(id)
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set<string>())
    setLastSelectedId(null)
    setAnchorId(null)
  }

  const selectAll = () => {
    const ids: string[] = itemIds()
    setSelectedIds(new Set(ids))
    if (ids.length > 0) {
      setLastSelectedId(ids[ids.length - 1])
      setAnchorId(ids[0])
    }
  }

  const isMultiSelecting = createMemo(() => selectedIds().size > 1)

  return {
    selectedIds,
    lastSelectedId,
    handleSelect,
    clearSelection,
    selectAll,
    isMultiSelecting,
  }
}
