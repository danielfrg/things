import { useCallback, useMemo, useState } from 'react';

interface TaskLike {
  id: string;
}

interface UseMultiSelectOptions<T extends TaskLike> {
  items: T[];
}

interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  handleSelect: (id: string, event: React.MouseEvent) => void;
  clearSelection: () => void;
  selectAll: () => void;
  isMultiSelecting: boolean;
}

export function useMultiSelect<T extends TaskLike>({
  items,
}: UseMultiSelectOptions<T>): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const selectRange = useCallback(
    (fromId: string, toId: string) => {
      const fromIndex = itemIds.indexOf(fromId);
      const toIndex = itemIds.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const rangeIds = itemIds.slice(start, end + 1);

      setSelectedIds(new Set(rangeIds));
    },
    [itemIds],
  );

  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      const isShift = event.shiftKey;
      const isMeta = event.metaKey || event.ctrlKey;

      // Prevent default for modifier clicks to avoid context menu on Mac
      if (isShift || isMeta) {
        event.preventDefault();
      }

      if (isShift && anchorId) {
        // Range selection from anchor to clicked item
        selectRange(anchorId, id);
        setLastSelectedId(id);
      } else if (isMeta) {
        // Toggle individual selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        setLastSelectedId(id);
        setAnchorId(id);
      } else {
        // Regular click - clear and select single
        setSelectedIds(new Set([id]));
        setLastSelectedId(id);
        setAnchorId(id);
      }
    },
    [anchorId, selectRange],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setAnchorId(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(itemIds));
    if (itemIds.length > 0) {
      setLastSelectedId(itemIds[itemIds.length - 1]);
      setAnchorId(itemIds[0]);
    }
  }, [itemIds]);

  const isMultiSelecting = selectedIds.size > 1;

  return {
    selectedIds,
    lastSelectedId,
    handleSelect,
    clearSelection,
    selectAll,
    isMultiSelecting,
  };
}
