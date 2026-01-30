import { useCallback, useState } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  FolderOpenIcon,
  Trash2Icon,
  XIcon,
} from '@/components/icons';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { MovePickerContent } from '@/components/ui/move-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { AreaRecord, ProjectRecord } from '@/db/validation';
import { cn } from '@/lib/utils';

interface BatchActionBarProps {
  count: number;
  onDateChange: (date: string | null, isEvening?: boolean) => void;
  onMove: (projectId: string | null, areaId?: string | null) => void;
  onTrash: () => void;
  onClear: () => void;
  projects: ProjectRecord[];
  areas: AreaRecord[];
}

export function BatchActionBar({
  count,
  onDateChange,
  onMove,
  onTrash,
  onClear,
  projects,
  areas,
}: BatchActionBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const handleDateSelect = useCallback(
    (date: string | undefined, isEvening?: boolean) => {
      onDateChange(date ?? null, isEvening);
      setDateOpen(false);
    },
    [onDateChange],
  );

  const handleMoveSelect = useCallback(
    (projectId: string | null, areaId?: string | null) => {
      onMove(projectId, areaId);
      setMoveOpen(false);
    },
    [onMove],
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-popover-dark border border-popover-dark-border shadow-2xl px-3 py-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
        {/* Selection count */}
        <div className="flex items-center gap-2 px-2 text-sm font-medium text-popover-dark-foreground">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-popover-dark-selected">
            <CheckIcon className="w-3 h-3" />
          </div>
          <span>{count} selected</span>
        </div>

        <div className="w-px h-6 bg-popover-dark-border mx-1" />

        {/* When button */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'text-popover-dark-foreground hover:bg-popover-dark-accent transition-colors',
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>When</span>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-transparent border-0 shadow-xl ring-0"
            align="center"
            sideOffset={8}
          >
            <CalendarPopover
              onChange={handleDateSelect}
              onClose={() => setDateOpen(false)}
              showEvening
              title="Schedule"
            />
          </PopoverContent>
        </Popover>

        {/* Move button */}
        <Popover open={moveOpen} onOpenChange={setMoveOpen}>
          <PopoverTrigger
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'text-popover-dark-foreground hover:bg-popover-dark-accent transition-colors',
            )}
          >
            <FolderOpenIcon className="w-4 h-4" />
            <span>Move</span>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-transparent border-0 shadow-xl ring-0"
            align="center"
            sideOffset={8}
          >
            <MovePickerContent
              onChange={handleMoveSelect}
              projects={projects}
              areas={areas}
              title="Move to"
            />
          </PopoverContent>
        </Popover>

        {/* Delete button */}
        <button
          type="button"
          onClick={onTrash}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'text-red-400 hover:bg-red-500/20 transition-colors',
          )}
        >
          <Trash2Icon className="w-4 h-4" />
          <span>Delete</span>
        </button>

        <div className="w-px h-6 bg-popover-dark-border mx-1" />

        {/* Clear selection button */}
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            'text-popover-dark-muted hover:bg-popover-dark-accent hover:text-popover-dark-foreground transition-colors',
          )}
          aria-label="Clear selection"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
