import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVerticalIcon } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { generateId } from '@/db/schema';
import type { ChecklistItemRecord } from '@/db/validation';
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from '@/lib/contexts/DataContext';
import { type Edge, loadDnd } from '@/lib/dnd';
import { cn } from '@/lib/utils';

// Symbol for type-safe drag data
const checklistItemKey = Symbol('checklist-item');

// Unified item type that works for both database records and controlled items
export type ChecklistItem = {
  id: string;
  title: string;
  completed?: boolean;
  position?: number;
};

type ChecklistItemDragData = {
  [checklistItemKey]: true;
  item: ChecklistItem;
  index: number;
  editorId: string;
};

function getChecklistItemDragData(
  item: ChecklistItem,
  index: number,
  editorId: string,
): ChecklistItemDragData {
  return { [checklistItemKey]: true, item, index, editorId };
}

function isChecklistItemDragData(data: unknown): data is ChecklistItemDragData {
  return typeof data === 'object' && data !== null && checklistItemKey in data;
}

type ItemState =
  | { type: 'idle' }
  | { type: 'dragging' }
  | { type: 'over'; edge: Edge };

const idle: ItemState = { type: 'idle' };

export interface ChecklistEditorProps {
  // For database mode (default), provide taskId
  taskId?: string;
  // Items can be ChecklistItemRecord[] or ChecklistItem[]
  items: ChecklistItem[] | ChecklistItemRecord[];
  // Visual variant
  variant?: 'default' | 'inline';
  // Mode determines persistence strategy
  mode?: 'database' | 'controlled';
  // For controlled mode, provide onChange callback
  onChange?: (items: ChecklistItem[]) => void;
  disabled?: boolean;
}

// Hollow circle checkbox for inline variant (Things 3 style)
function ChecklistCircle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'w-[13px] h-[13px] rounded-full border-[1.5px] flex-shrink-0 transition-colors',
        checked
          ? 'bg-things-blue border-things-blue'
          : 'border-things-blue bg-transparent hover:bg-things-blue/10',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {checked && (
        <svg
          className="w-full h-full text-white"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 6l2 2L9 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// Individual checklist item row
function ChecklistItemRow({
  item,
  index,
  editorId,
  disabled,
  isFirst,
  variant,
  state,
  setState,
  onToggle,
  onUpdateTitle,
  onEnter,
  onBackspaceEmpty,
  onFocus,
}: {
  item: ChecklistItem;
  index: number;
  editorId: string;
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  variant: 'default' | 'inline';
  state: ItemState;
  setState: (state: ItemState) => void;
  onToggle: () => void;
  onUpdateTitle: (title: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onFocus: (inputEl: HTMLInputElement) => void;
}) {
  const [localTitle, setLocalTitle] = useState(item.title);
  const rowRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTitleRef = useRef(item.title);

  // Sync from props when item changes externally
  useEffect(() => {
    if (item.title !== lastTitleRef.current) {
      lastTitleRef.current = item.title;
      setLocalTitle(item.title);
    }
  }, [item.title]);

  useEffect(() => {
    if (disabled) return;

    const row = rowRef.current;
    const handle = handleRef.current;
    if (!row || !handle) return;

    let cleanup: (() => void) | undefined;
    let disposed = false;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.draggable({
          element: row,
          dragHandle: handle,
          getInitialData: () => getChecklistItemDragData(item, index, editorId),
          onDragStart: () => {
            setState({ type: 'dragging' });
            if (navigator.vibrate) navigator.vibrate(10);
          },
          onDrop: () => setState(idle),
        }),
        dnd.dropTargetForElements({
          element: row,
          canDrop: ({ source }) => {
            if (!isChecklistItemDragData(source.data)) return false;
            return source.data.editorId === editorId;
          },
          getData: ({ input }) => {
            return dnd.attachClosestEdge(
              { itemId: item.id },
              {
                element: row,
                input,
                allowedEdges: ['top', 'bottom'],
              },
            );
          },
          onDragEnter: ({ self, source }) => {
            if (!isChecklistItemDragData(source.data)) return;
            if (source.data.item.id === item.id) return;
            const edge = dnd.extractClosestEdge(self.data);
            if (edge) setState({ type: 'over', edge });
          },
          onDrag: ({ self, source }) => {
            if (!isChecklistItemDragData(source.data)) return;
            if (source.data.item.id === item.id) return;
            const edge = dnd.extractClosestEdge(self.data);
            if (edge) setState({ type: 'over', edge });
          },
          onDragLeave: () => setState(idle),
          onDrop: () => setState(idle),
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [disabled, item, index, editorId, setState]);

  const handleBlur = useCallback(() => {
    if (localTitle !== item.title) {
      onUpdateTitle(localTitle);
    }
  }, [localTitle, item.title, onUpdateTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (localTitle !== item.title) {
          onUpdateTitle(localTitle);
        }
        onEnter();
      } else if (e.key === 'Backspace' && localTitle === '') {
        e.preventDefault();
        onBackspaceEmpty();
      }
    },
    [localTitle, item.title, onUpdateTitle, onEnter, onBackspaceEmpty],
  );

  useEffect(() => {
    if (inputRef.current) {
      onFocus(inputRef.current);
    }
  }, [onFocus]);

  const isInline = variant === 'inline';
  const isCompleted = item.completed ?? false;

  return (
    <div
      ref={rowRef}
      className={cn(
        'group flex items-center gap-2 relative pt-4 pb-4',
        isInline
          ? cn('h-[30px] px-2 border-border', isFirst && 'border-t', 'border-b')
          : 'py-2 md:py-1',
        state.type === 'dragging' &&
          (isInline ? 'opacity-50 bg-secondary' : 'opacity-50'),
      )}
    >
      {/* Drop indicator - top */}
      {state.type === 'over' && state.edge === 'top' && (
        <div
          className={cn(
            'absolute left-0 right-0 h-[2px] bg-things-blue z-10',
            isInline ? '-top-[1px]' : '-top-0.5 rounded-full',
          )}
        />
      )}

      {isInline ? (
        <ChecklistCircle
          checked={isCompleted}
          onChange={onToggle}
          disabled={disabled}
        />
      ) : (
        <Checkbox
          checked={isCompleted}
          onChange={() => onToggle()}
          disabled={disabled}
        />
      )}

      <input
        ref={inputRef}
        type="text"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex-1 bg-transparent outline-none',
          isInline
            ? cn(
                'text-base md:text-[15px]',
                isCompleted && 'line-through text-muted-foreground',
              )
            : cn(
                'text-base md:text-[15px]',
                isCompleted && 'line-through text-muted-foreground',
              ),
        )}
        placeholder={
          index === 0
            ? isInline
              ? 'Add item...'
              : 'Add checklist item...'
            : ''
        }
      />

      {/* Drag handle - right side */}
      {!disabled && (
        <div
          ref={handleRef}
          className={cn(
            'cursor-grab opacity-0 group-hover:opacity-100 transition-opacity',
            isInline
              ? 'text-border hover:text-muted-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <GripVerticalIcon className="w-4 h-4" />
        </div>
      )}

      {/* Drop indicator - bottom */}
      {state.type === 'over' && state.edge === 'bottom' && (
        <div
          className={cn(
            'absolute left-0 right-0 h-[2px] bg-things-blue z-10',
            isInline ? '-bottom-[1px]' : '-bottom-0.5 rounded-full',
          )}
        />
      )}
    </div>
  );
}

export function ChecklistEditor({
  taskId,
  items,
  variant = 'default',
  mode = 'database',
  onChange,
  disabled = false,
}: ChecklistEditorProps) {
  const isControlled = mode === 'controlled';
  const editorId = isControlled ? 'controlled' : (taskId ?? 'unknown');

  // Database mode hooks - always call but only use in database mode
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  // Track state per item for visual feedback
  const [itemStates, setItemStates] = useState<Map<string, ItemState>>(
    () => new Map(),
  );

  const getItemState = useCallback(
    (itemId: string): ItemState => itemStates.get(itemId) ?? idle,
    [itemStates],
  );

  const setItemState = useCallback((itemId: string, state: ItemState) => {
    setItemStates((prev) => {
      const next = new Map(prev);
      if (state.type === 'idle') {
        next.delete(itemId);
      } else {
        next.set(itemId, state);
      }
      return next;
    });
  }, []);

  // Ref to hold latest items for the monitor
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Sort items by position
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    return sorted;
  }, [items]);

  // Set up monitor for reordering
  useEffect(() => {
    if (disabled) return;

    let cleanup: (() => void) | undefined;
    let disposed = false;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.monitorForElements({
        canMonitor: ({ source }) => {
          if (!isChecklistItemDragData(source.data)) return false;
          return source.data.editorId === editorId;
        },
        onDrop: ({ source, location }) => {
          const dragging = source.data;
          if (!isChecklistItemDragData(dragging)) return;

          const target = location.current.dropTargets[0];
          if (!target) return;

          const targetData = target.data as { itemId?: string };
          const targetItemId = targetData.itemId;
          if (!targetItemId) return;

          const edge = dnd.extractClosestEdge(target.data);
          if (!edge) return;

          const currentItems = itemsRef.current;
          const startIndex = currentItems.findIndex(
            (i) => i.id === dragging.item.id,
          );
          const targetIndex = currentItems.findIndex(
            (i) => i.id === targetItemId,
          );

          if (startIndex === -1 || targetIndex === -1) return;
          if (startIndex === targetIndex) return;

          const reordered = dnd.reorderWithEdge({
            axis: 'vertical',
            list: currentItems,
            startIndex,
            indexOfTarget: targetIndex,
            closestEdgeOfTarget: edge,
          });

          if (isControlled && onChange) {
            // Controlled mode: update positions and call onChange
            const updated = reordered.map((item, idx) => ({
              ...item,
              position: idx + 1,
            }));
            onChange(updated);
          } else {
            // Database mode: update each item's position
            reordered.forEach((item, idx) => {
              const newPosition = idx + 1;
              if (item.position !== newPosition) {
                updateItem.mutate({
                  id: item.id,
                  changes: { position: newPosition },
                });
              }
            });
          }
        },
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [disabled, editorId, isControlled, onChange, updateItem]);

  const handleToggleItem = useCallback(
    (item: ChecklistItem) => {
      if (isControlled && onChange) {
        const updated = items.map((i) =>
          i.id === item.id ? { ...i, completed: !i.completed } : i,
        );
        onChange(updated);
      } else {
        updateItem.mutate({
          id: item.id,
          changes: { completed: !item.completed },
        });
      }
    },
    [isControlled, items, onChange, updateItem],
  );

  const handleUpdateItemTitle = useCallback(
    (item: ChecklistItem, title: string) => {
      if (title === item.title) return;

      if (isControlled && onChange) {
        const updated = items.map((i) =>
          i.id === item.id ? { ...i, title } : i,
        );
        onChange(updated);
      } else {
        updateItem.mutate({ id: item.id, changes: { title } });
      }
    },
    [isControlled, items, onChange, updateItem],
  );

  const handleEnter = useCallback(
    (index: number) => {
      const newId = generateId();
      const newPosition = index + 2;

      if (isControlled && onChange) {
        const updated = [...items];
        // Update positions of items after insert point
        const adjusted = updated.map((item, i) => {
          if (i > index) {
            return { ...item, position: (item.position ?? i + 1) + 1 };
          }
          return item;
        });
        // Insert new item
        adjusted.splice(index + 1, 0, {
          id: newId,
          title: '',
          completed: false,
          position: newPosition,
        });
        onChange(adjusted);
      } else if (taskId) {
        // Update positions of items after insert point
        items.forEach((item, i) => {
          if (i > index) {
            updateItem.mutate({ id: item.id, changes: { position: i + 2 } });
          }
        });

        createItem.mutate({
          id: newId,
          taskId,
          title: '',
          completed: false,
          position: newPosition,
        });
      }

      setTimeout(() => {
        const newInput = inputRefs.current.get(newId);
        if (newInput) newInput.focus();
      }, 50);
    },
    [isControlled, items, onChange, taskId, updateItem, createItem],
  );

  const handleBackspaceEmpty = useCallback(
    (index: number, itemId: string) => {
      if (isControlled && onChange) {
        const updated = items.filter((_, i) => i !== index);
        onChange(updated);
      } else {
        deleteItem.mutate(itemId);
      }

      // Focus previous or next item if there are remaining items
      if (items.length > 1) {
        if (index > 0) {
          const prevItem = items[index - 1];
          setTimeout(() => {
            const prevInput = inputRefs.current.get(prevItem.id);
            if (prevInput) {
              prevInput.focus();
              prevInput.setSelectionRange(
                prevInput.value.length,
                prevInput.value.length,
              );
            }
          }, 0);
        } else {
          const nextItem = items[1];
          setTimeout(() => {
            const nextInput = inputRefs.current.get(nextItem.id);
            if (nextInput) {
              nextInput.focus();
              nextInput.setSelectionRange(0, 0);
            }
          }, 0);
        }
      }
    },
    [isControlled, items, onChange, deleteItem],
  );

  const registerInput = useCallback((itemId: string, el: HTMLInputElement) => {
    inputRefs.current.set(itemId, el);
  }, []);

  // Add first checklist item when user clicks placeholder (inline variant)
  const handleAddFirstItem = useCallback(() => {
    const newId = generateId();

    if (isControlled && onChange) {
      onChange([{ id: newId, title: '', completed: false, position: 1 }]);
    } else if (taskId) {
      createItem.mutate({
        id: newId,
        taskId,
        title: '',
        completed: false,
        position: 1,
      });
    }

    setTimeout(() => {
      const newInput = inputRefs.current.get(newId);
      if (newInput) newInput.focus();
    }, 50);
  }, [isControlled, onChange, taskId, createItem]);

  // Auto-create first item for default variant
  useEffect(() => {
    if (variant === 'default' && items.length === 0 && !disabled) {
      const newId = generateId();

      if (isControlled && onChange) {
        onChange([{ id: newId, title: '', completed: false, position: 1 }]);
      } else if (taskId) {
        createItem.mutate({
          id: newId,
          taskId,
          title: '',
          completed: false,
          position: 1,
        });
      }
    }
  }, [
    variant,
    items.length,
    disabled,
    isControlled,
    onChange,
    taskId,
    createItem,
  ]);

  // Handle empty state
  if (sortedItems.length === 0 && disabled) {
    return variant === 'default' ? (
      <p className="text-sm text-muted-foreground italic">No checklist items</p>
    ) : null;
  }

  // Show "Add item" button for inline variant when empty
  if (sortedItems.length === 0 && variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleAddFirstItem}
        className="my-4 flex items-center gap-2 h-[30px] px-2 text-[13px] text-muted-foreground hover:text-foreground/80 transition-colors"
      >
        <div className="w-[12px] h-[12px] rounded-full border-[1.5px] border-border flex-shrink-0" />
        <span>Add checklist item...</span>
      </button>
    );
  }

  return (
    <div
      className={
        variant === 'inline'
          ? 'my-4 rounded-md overflow-hidden'
          : 'my-4 space-y-1'
      }
    >
      {sortedItems.map((item, index) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          index={index}
          editorId={editorId}
          disabled={disabled}
          isFirst={index === 0}
          isLast={index === sortedItems.length - 1}
          variant={variant}
          state={getItemState(item.id)}
          setState={(state) => setItemState(item.id, state)}
          onToggle={() => handleToggleItem(item)}
          onUpdateTitle={(title) => handleUpdateItemTitle(item, title)}
          onEnter={() => handleEnter(index)}
          onBackspaceEmpty={() => handleBackspaceEmpty(index, item.id)}
          onFocus={(el) => registerInput(item.id, el)}
        />
      ))}
    </div>
  );
}
