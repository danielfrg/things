import { Check as CheckIcon } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { TagIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ResponsivePicker } from './responsive-picker';

interface Tag {
  id: string;
  title: string;
}

interface TagPickerContentProps {
  selectedTagIds: string[];
  tags: Tag[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
}

export function TagPickerContent(props: TagPickerContentProps) {
  const handleToggle = (tagId: string) => {
    if (props.selectedTagIds.includes(tagId)) {
      props.onRemove(tagId);
    } else {
      props.onAdd(tagId);
    }
  };

  return (
    <div class="w-[220px] rounded-xl bg-popover-dark border border-popover-dark-border overflow-hidden">
      {/* Header with title */}
      <div class="flex items-center justify-center relative px-3 pt-3 pb-2">
        <h3 class="text-sm font-semibold text-popover-dark-foreground">
          Tags
        </h3>
      </div>

      <div class="max-h-[280px] overflow-y-auto overscroll-contain pb-2">
        <Show
          when={props.tags.length > 0}
          fallback={
            <div class="px-3 py-4 text-center text-sm text-popover-dark-muted">
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
                    'flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-semibold text-white outline-none',
                    'hover:bg-popover-dark-accent transition-colors',
                  )}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(tag.id);
                  }}
                >
                  <span class="w-3 h-3 rounded-full bg-gray-500" />
                  <span class="flex-1 text-left text-popover-dark-foreground truncate">
                    {tag.title}
                  </span>
                  <Show when={selected()}>
                    <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
                  </Show>
                </button>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
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
  const [open, setOpen] = createSignal(false);

  return (
    <Show when={!props.disabled}>
      <div
        class={cn('relative', props.class)}
        onMouseDown={(e: MouseEvent) => e.stopPropagation()}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <ResponsivePicker
          open={open()}
          onOpenChange={setOpen}
          trigger={
            <div
              class={cn(
                'inline-flex items-center justify-center h-8 w-8 md:h-6 md:w-6 rounded text-[12px]',
                'text-toolbar-icon border border-transparent hover:border-toolbar-border transition-colors',
              )}
            >
              <TagIcon class="w-4 h-4 md:w-3.5 md:h-3.5" />
            </div>
          }
        >
          <TagPickerContent
            selectedTagIds={props.selectedTagIds}
            tags={props.tags}
            onAdd={props.onAdd}
            onRemove={props.onRemove}
          />
        </ResponsivePicker>
      </div>
    </Show>
  );
}
