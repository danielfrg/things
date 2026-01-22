import type { TagRecord } from '@/db/validation';
import { cn } from '@/lib/utils';

interface TagFilterTabsProps {
  tags: TagRecord[];
  activeTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
}

export function TagFilterTabs({ tags, activeTagId, onTagSelect }: TagFilterTabsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onTagSelect(null)}
        className={cn(
          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
          activeTagId === null
            ? 'bg-things-grey text-white'
            : 'text-muted-foreground hover:text-foreground/70',
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onTagSelect(tag.id)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            activeTagId === tag.id
              ? 'bg-things-grey text-white'
              : 'text-muted-foreground hover:text-foreground/70',
          )}
        >
          {tag.title}
        </button>
      ))}
    </div>
  );
}
