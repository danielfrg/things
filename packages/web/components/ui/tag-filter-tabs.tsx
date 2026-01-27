import type { TagRecord } from '@/db/validation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TagFilterTabsProps {
  tags: TagRecord[];
  activeTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
}

const ALL_VALUE = '__all__';

export function TagFilterTabs({ tags, activeTagId, onTagSelect }: TagFilterTabsProps) {
  const value = activeTagId ?? ALL_VALUE;

  return (
    <ToggleGroup
    // orientation="vertical"
    spacing={2}
      // variant="outline"
      value={[value]}
      onValueChange={(values) => {
        const selected = values[0];
        onTagSelect(selected === ALL_VALUE ? null : selected);
      }}
    >
      <ToggleGroupItem value={ALL_VALUE} size="sm">
        All
      </ToggleGroupItem>
      {tags.map((tag) => (
        <ToggleGroupItem key={tag.id} value={tag.id} size="sm">
          {tag.title}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
