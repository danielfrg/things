import { useCallback } from 'react';
import { CheckIcon, PlusIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

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

export { TAG_COLORS };

export function TagPicker({
  selectedTagIds,
  tags,
  onAdd,
  onRemove,
  disabled,
  className,
  triggerClass,
}: TagPickerProps) {
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

  if (disabled) return null;

  return (
    <div className={cn('relative', className)}>
      <Popover>
        <PopoverTrigger
          className={cn(
            'inline-flex items-center gap-1 h-6 px-2 rounded text-[12px]',
            'text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
            triggerClass,
          )}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add tag</span>
        </PopoverTrigger>

        <PopoverContent
          className="w-[220px] max-md:w-[calc(100vw-32px)] p-0 bg-popover-dark border border-popover-dark-border shadow-xl ring-0 gap-0"
          align="start"
          sideOffset={4}
          data-ignore-click-outside
        >
          {/* Header with title */}
          <div className="flex items-center justify-center relative px-3 pt-3 max-md:pt-4 pb-2">
            <h3 className="text-sm max-md:text-base font-semibold text-popover-dark-foreground">Tags</h3>
          </div>

          <div className="max-h-[280px] max-md:max-h-[60vh] overflow-y-auto overscroll-contain pb-2 max-md:pb-3">
            {tags.length > 0 ? (
              tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-semibold text-white',
                      'hover:bg-popover-dark-accent transition-colors',
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(tag.id);
                    }}
                  >
                    <span
                      className={cn(
                        'w-3 h-3 max-md:w-4 max-md:h-4 rounded-full',
                        TAG_COLORS[tag.color ?? 'gray'] ?? 'bg-gray-500',
                      )}
                    />
                    <span className="flex-1 text-left text-popover-dark-foreground truncate">{tag.title}</span>
                    {selected && <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-sm max-md:text-base text-popover-dark-muted">
                No tags created yet
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
