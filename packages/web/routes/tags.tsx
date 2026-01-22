import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PlusIcon, TagIcon, Trash2Icon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { SearchButton, ViewToolbar } from '@/components/ToolbarButtons';
import { Button } from '@/components/ui/button';
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from '@/lib/contexts/DataContext';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/tags')({
  component: TagsView,
});

const TAG_COLORS = [
  { name: 'Gray', value: null },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
];

function TagsView() {
  const { data: tagsData, loading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newTagTitle, setNewTagTitle] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const tags = [...(tagsData ?? [])].sort((a, b) => a.position - b.position);

  const handleCreateTag = () => {
    const title = newTagTitle.trim();
    if (!title) return;
    createTag.mutate({
      title,
      color: null,
      position: tags.length + 1,
    });
    setNewTagTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTag();
    }
  };

  const handleTitleChange = (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateTag.mutate({ id, changes: { title: trimmed } });
  };

  const handleColorChange = (tagId: string, color: string | null) => {
    updateTag.mutate({ id: tagId, changes: { color } });
    setColorPickerOpen(null);
  };

  const handleDeleteTag = (tagId: string) => {
    deleteTag.mutate(tagId);
  };

  return (
    <ViewContainer
      title="Tags"
      icon={<TagIcon className="w-6 h-6 text-muted-foreground" />}
      iconColor="text-muted-foreground"
      toolbar={
        <ViewToolbar>
          <SearchButton />
        </ViewToolbar>
      }
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg bg-background">
            <PlusIcon className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={newTagTitle}
              onChange={(e) => setNewTagTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New tag..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <Button
            onClick={handleCreateTag}
            disabled={!newTagTitle.trim()}
            size="sm"
          >
            Add Tag
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : tags.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No tags yet. Create your first tag above.
          </div>
        ) : (
          <div className="space-y-1">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 group"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setColorPickerOpen(
                        colorPickerOpen === tag.id ? null : tag.id,
                      )
                    }
                    className={cn(
                      'w-4 h-4 rounded-full border-2 transition-colors',
                      tag.color
                        ? 'border-transparent'
                        : 'border-muted-foreground/40',
                    )}
                    style={{
                      backgroundColor: tag.color ?? '#9CA3AF',
                    }}
                  />
                  {colorPickerOpen === tag.id && (
                    <div className="absolute top-6 left-0 z-10 p-2 bg-popover border rounded-lg shadow-lg">
                      <div className="flex gap-1">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() =>
                              handleColorChange(tag.id, color.value)
                            }
                            className={cn(
                              'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                              tag.color === color.value
                                ? 'border-foreground'
                                : 'border-transparent',
                            )}
                            style={{
                              backgroundColor: color.value ?? '#9CA3AF',
                            }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    defaultValue={tag.title}
                    onBlur={(e) => handleTitleChange(tag.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full bg-transparent outline-none text-sm focus:border-b focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ViewContainer>
  );
}
