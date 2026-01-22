import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, PlusIcon, XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  title: string;
  color: string | null;
}

interface TagPickerProps {
  selectedTagIds: string[];
  tags: Tag[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClass?: string;
}

const TAG_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
};

export function TagPicker({
  selectedTagIds,
  tags,
  onAdd,
  onRemove,
  disabled,
  className,
  triggerClass,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedTagIds.includes(t.id)),
    [tags, selectedTagIds],
  );

  const handleToggle = useCallback(
    (tagId: string) => {
      if (selectedTagIds.includes(tagId)) {
        onRemove(tagId);
      } else {
        onAdd(tagId);
      }
    },
    [selectedTagIds, onAdd, onRemove],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const getPopoverStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 300;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const showAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    return {
      position: 'fixed',
      top: showAbove ? 'auto' : `${rect.bottom + 4}px`,
      bottom: showAbove ? `${viewportHeight - rect.top + 4}px` : 'auto',
      left: `${rect.left}px`,
      zIndex: 50,
    };
  };

  return (
    <div className={cn('relative', className)}>
      {/* Selected tags display */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white',
              TAG_COLORS[tag.color ?? 'gray'] ?? 'bg-gray-500',
            )}
          >
            {tag.title}
            {!disabled && (
              <button
                type="button"
                className="hover:bg-white/20 rounded-full p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(tag.id);
                }}
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              'inline-flex items-center gap-1 h-6 px-2 rounded text-[12px]',
              'text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
              triggerClass,
            )}
            onClick={() => setOpen(!open)}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add tag</span>
          </button>
        )}
      </div>

      {/* Popover */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            data-popover
            className="w-[220px] rounded-xl bg-popover-dark overflow-hidden shadow-xl"
            style={getPopoverStyle()}
          >
            <div className="p-2 max-h-[280px] overflow-y-auto">
              {tags.length > 0 ? (
                tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                        'hover:bg-popover-dark-accent',
                        selected && 'bg-popover-dark-accent',
                      )}
                      onClick={() => handleToggle(tag.id)}
                    >
                      <span
                        className={cn(
                          'w-3 h-3 rounded-full',
                          TAG_COLORS[tag.color ?? 'gray'] ?? 'bg-gray-500',
                        )}
                      />
                      <span className="flex-1 text-popover-dark-foreground truncate">{tag.title}</span>
                      {selected && <CheckIcon className="w-4 h-4 text-popover-dark-selected" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-sm text-popover-dark-muted">
                  No tags created yet
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
