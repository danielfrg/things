import {
  PlusIcon,
  SearchIcon,
  SeparatorHorizontalIcon,
} from '@/components/icons';
import { useApp } from '@/lib/contexts/AppContext';
import { cn } from '@/lib/utils';

const toolbarButtonClass = cn(
  'flex items-center justify-center gap-1.5 px-3 md:px-4 py-1 md:min-w-[100px] text-[13px] font-medium rounded-full',
  'text-muted-foreground border border-transparent hover:border-border transition-colors',
);

export function NewTaskButton() {
  const app = useApp();

  return (
    <button
      type="button"
      onClick={app.openGlobalInput}
      className={toolbarButtonClass}
    >
      <PlusIcon className="w-4 h-4" />
      <span className="hidden md:inline">New To-Do</span>
    </button>
  );
}

export function SearchButton() {
  const app = useApp();

  return (
    <button
      type="button"
      onClick={app.openCommandPalette}
      className={toolbarButtonClass}
    >
      <SearchIcon className="w-4 h-4" />
      <span className="hidden md:inline">Search</span>
    </button>
  );
}

export function AddHeadingButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={toolbarButtonClass}>
      <SeparatorHorizontalIcon className="w-4 h-4" />
      <span className="hidden md:inline">Add Heading</span>
    </button>
  );
}

export function ViewToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
