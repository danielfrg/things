import { For, Show } from 'solid-js';
import { CheckIcon, TagIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface Tag {
  id: string;
  title: string;
}

interface TagPickerProps {
  selectedTagIds: string[];
  tags: Tag[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  disabled?: boolean;
  class?: string;
}

export function TagPicker(props: TagPickerProps) {
  const handleToggle = (tagId: string) => {
    if (props.selectedTagIds.includes(tagId)) {
      props.onRemove(tagId);
    } else {
      props.onAdd(tagId);
    }
  };

  return (
    <Show when={!props.disabled}>
      <div class={cn('relative', props.class)}>
        <Popover>
          <PopoverTrigger
            class={cn(
              'inline-flex items-center justify-center h-8 w-8 md:h-6 md:w-6 rounded text-[12px]',
              'text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors',
            )}
            onMouseDown={(e: MouseEvent) => e.stopPropagation()}
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <TagIcon class="w-4 h-4 md:w-3.5 md:h-3.5" />
          </PopoverTrigger>

          <PopoverContent
            class="w-[220px] max-md:w-[calc(100vw-32px)] p-0 bg-popover-dark border border-popover-dark-border shadow-xl ring-0 gap-0"
            data-ignore-click-outside
          >
            {/* Header with title */}
            <div class="flex items-center justify-center relative px-3 pt-3 max-md:pt-4 pb-2">
              <h3 class="text-sm max-md:text-base font-semibold text-popover-dark-foreground">
                Tags
              </h3>
            </div>

            <div class="max-h-[280px] max-md:max-h-[60vh] overflow-y-auto overscroll-contain pb-2 max-md:pb-3">
              <Show
                when={props.tags.length > 0}
                fallback={
                  <div class="px-3 py-4 text-center text-sm max-md:text-base text-popover-dark-muted">
                    No tags created yet
                  </div>
                }
              >
                <For each={props.tags}>
                  {(tag) => {
                    const selected = () => props.selectedTagIds.includes(tag.id);
                    return (
                      <button
                        type="button"
                        class={cn(
                          'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-semibold text-white outline-none',
                          'hover:bg-popover-dark-accent transition-colors',
                        )}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(tag.id);
                        }}
                      >
                        <span
                          class="w-3 h-3 max-md:w-4 max-md:h-4 rounded-full bg-gray-500"
                        />
                        <span class="flex-1 text-left text-popover-dark-foreground truncate">
                          {tag.title}
                        </span>
                        <Show when={selected()}>
                          <CheckIcon class="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Show>
  );
}
