import { createSignal } from "solid-js"
import { CalendarIcon, CheckIcon, FolderOpenIcon, Trash2Icon, XIcon } from "@/components/icons"
import { CalendarPopover } from "@/components/ui/calendar-popover"
import { MovePickerContent } from "@/components/ui/move-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Project = {
  id: string
  title: string
  areaId?: string | null
}

type Area = {
  id: string
  title: string
}

interface BatchActionBarProps {
  count: number
  onDateChange: (date: string | null, isEvening?: boolean) => void
  onMove: (listId: string | null, moveToInbox?: boolean) => void
  onTrash: () => void
  onClear: () => void
  projects: Project[]
  areas: Area[]
}

export function BatchActionBar(props: BatchActionBarProps) {
  const [dateOpen, setDateOpen] = createSignal(false)
  const [moveOpen, setMoveOpen] = createSignal(false)

  const handleDateSelect = (date: string | undefined, isEvening?: boolean) => {
    props.onDateChange(date ?? null, isEvening)
    setDateOpen(false)
  }

  const handleMoveSelect = (listId: string | null, moveToInbox?: boolean) => {
    props.onMove(listId, moveToInbox)
    setMoveOpen(false)
  }

  return (
    <div class="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none">
      <div class="pointer-events-auto flex items-center gap-1 rounded-xl bg-popover-dark border border-popover-dark-border shadow-2xl px-3 py-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
        {/* Selection count */}
        <div class="flex items-center gap-2 px-2 text-sm font-medium text-popover-dark-foreground">
          <div class="flex items-center justify-center w-5 h-5 rounded bg-popover-dark-selected">
            <CheckIcon class="w-3 h-3" />
          </div>
          <span>{props.count} selected</span>
        </div>

        <div class="w-px h-6 bg-popover-dark-border mx-1" />

        {/* When button */}
        <Popover open={dateOpen()} onOpenChange={setDateOpen}>
          <PopoverTrigger
            class={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium outline-none",
              "text-popover-dark-foreground hover:bg-popover-dark-accent transition-colors",
            )}
          >
            <CalendarIcon class="w-4 h-4" />
            <span>When</span>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl ring-0">
            <CalendarPopover
              onChange={handleDateSelect}
              onClose={() => setDateOpen(false)}
              showEvening
              title="Schedule"
            />
          </PopoverContent>
        </Popover>

        {/* Move button */}
        <Popover open={moveOpen()} onOpenChange={setMoveOpen}>
          <PopoverTrigger
            class={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium outline-none",
              "text-popover-dark-foreground hover:bg-popover-dark-accent transition-colors",
            )}
          >
            <FolderOpenIcon class="w-4 h-4" />
            <span>Move</span>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl ring-0">
            <MovePickerContent
              onChangeListId={handleMoveSelect}
              projects={props.projects}
              areas={props.areas}
              title="Move to"
              onClose={() => setMoveOpen(false)}
            />
          </PopoverContent>
        </Popover>

        {/* Delete button */}
        <button
          type="button"
          onClick={props.onTrash}
          class={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium outline-none",
            "text-red-400 hover:bg-red-500/20 transition-colors",
          )}
        >
          <Trash2Icon class="w-4 h-4" />
          <span>Delete</span>
        </button>

        <div class="w-px h-6 bg-popover-dark-border mx-1" />

        {/* Clear selection button */}
        <button
          type="button"
          onClick={props.onClear}
          class={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg outline-none",
            "text-popover-dark-muted hover:bg-popover-dark-accent hover:text-popover-dark-foreground transition-colors",
          )}
          aria-label="Clear selection"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
