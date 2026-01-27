import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusIcon, Trash2Icon } from '@/components/icons';
import { SectionHeader } from '@/components/settings/AccountSection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from '@/lib/contexts/DataContext';
import { cn } from '@/lib/utils';

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

export function TagsSection() {
  const { data: tagsData } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newTagTitle, setNewTagTitle] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const tags = useMemo(() => {
    return [...(tagsData ?? [])].sort((a, b) => a.position - b.position);
  }, [tagsData]);

  const tagToDelete = useMemo(
    () => tags.find((t) => t.id === deleteTagId),
    [tags, deleteTagId],
  );

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerOpen]);

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

  const handleTagTitleChange = (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateTag.mutate({ id, changes: { title: trimmed } });
  };

  const handleTagColorChange = (id: string, color: string | null) => {
    updateTag.mutate({ id, changes: { color } });
    setColorPickerOpen(null);
  };

  const handleDeleteTag = () => {
    if (!deleteTagId) return;
    deleteTag.mutate(deleteTagId);
    setDeleteTagId(null);
  };

  return (
    <>
      <section className="mb-12">
        <SectionHeader title="Tags" />
        <Card className="py-0 gap-0">
          {/* Create tag input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <PlusIcon className="w-4 h-4 text-gray-400" />
            <Input
              variant="ghost"
              type="text"
              value={newTagTitle}
              onChange={(e) => setNewTagTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTag();
              }}
              placeholder="New tag..."
              className="flex-1 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            {newTagTitle.trim() && (
              <Button variant="ghost" size="sm" onClick={handleCreateTag}>
                Add
              </Button>
            )}
          </div>

          {/* Tags list */}
          {tags.length > 0 ? (
            <div>
              {tags.map((tag, index) => (
                <div
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 group',
                    index < tags.length - 1 &&
                      'border-b border-gray-200 dark:border-gray-700',
                  )}
                >
                  {/* Color picker */}
                  <div
                    className="relative"
                    ref={
                      colorPickerOpen === tag.id ? colorPickerRef : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setColorPickerOpen(
                          colorPickerOpen === tag.id ? null : tag.id,
                        )
                      }
                      className="w-4 h-4 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: tag.color ?? '#9CA3AF',
                      }}
                    />
                    {colorPickerOpen === tag.id && (
                      <div className="absolute top-6 left-0 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <div className="flex gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() =>
                                handleTagColorChange(tag.id, color.value)
                              }
                              className={cn(
                                'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                                tag.color === color.value
                                  ? 'border-gray-800 dark:border-white'
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

                  {/* Tag title (editable) */}
                  <Input
                    variant="ghost"
                    type="text"
                    defaultValue={tag.title}
                    onBlur={(e) => handleTagTitleChange(tag.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-1 text-sm text-gray-800 dark:text-gray-200"
                  />

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeleteTagId(tag.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete tag"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-5">
              <p className="text-sm text-gray-500">
                No tags yet. Create your first tag above.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTagId}
        onOpenChange={(open) => !open && setDeleteTagId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tagToDelete?.title}"? This tag
              will be removed from all tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteTag}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
