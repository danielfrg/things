import type { TaskInfo } from "@/context/data"
import { CalendarIcon, MoveIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { CalendarPopover } from "@/components/ui/calendar-popover"
import { MovePickerContent } from "@/components/ui/move-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toolbarButtonClass } from "@/components/toolbar"

type TaskToolbarPickersProps = {
  task?: TaskInfo
  selectedIds: string[]
  canSchedule: boolean
  canMove: boolean
  scheduleOpen: boolean
  moveOpen: boolean
  onScheduleOpenChange: (open: boolean) => void
  onMoveOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<TaskInfo>) => void
  onBatchDateChange?: (ids: string[], date: string | null, isEvening?: boolean) => void
  onBatchMove?: (ids: string[], listId: string | null, moveToInbox?: boolean) => void
  projects: Array<{ id: string; title: string; areaId?: string | null }>
  areas: Array<{ id: string; title: string }>
}

export function TaskToolbarPickers(props: TaskToolbarPickersProps) {
  const isMulti = () => props.selectedIds.length > 1
  const isSingle = () => props.selectedIds.length === 1

  const handleScheduleChange = (date: string | undefined, isEvening?: boolean) => {
    if (isMulti()) {
      props.onBatchDateChange?.(props.selectedIds, date ?? null, isEvening)
      return
    }
    const task = props.task
    if (!task) return
    props.onUpdate(task.id, {
      scheduledDate: date ?? null,
      isEvening: isEvening ?? false,
    })
  }

  const handleSomedaySelect = () => {
    if (!isSingle()) return
    const task = props.task
    if (!task) return
    props.onUpdate(task.id, {
      scheduledDate: null,
      isSomeday: true,
      isEvening: false,
    })
  }

  const handleMoveChange = (listId: string | null, moveToInbox?: boolean) => {
    if (isMulti()) {
      props.onBatchMove?.(props.selectedIds, listId, moveToInbox)
      return
    }
    const task = props.task
    if (!task) return
    if (moveToInbox) {
      props.onUpdate(task.id, {
        status: null,
        listId: null,
        headingId: null,
        scheduledDate: null,
        isEvening: false,
        isSomeday: false,
      })
      return
    }

    props.onUpdate(task.id, {
      status: "active",
      listId,
      headingId: null,
    })
  }

  return (
    <>
      <Popover open={props.scheduleOpen} onOpenChange={props.onScheduleOpenChange}>
        <PopoverTrigger as={Button} variant="ghost" class={toolbarButtonClass} disabled={!props.canSchedule}>
          <CalendarIcon class="w-6 h-6 md:w-4 md:h-4" />
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl ring-0">
          <CalendarPopover
            value={isSingle() ? (props.task?.scheduledDate ?? undefined) : undefined}
            onChange={handleScheduleChange}
            showSomeday={isSingle()}
            showEvening
            isSomeday={isSingle() ? props.task?.isSomeday : false}
            isEvening={isSingle() ? (props.task?.isEvening ?? false) : false}
            onSomedaySelect={isSingle() ? handleSomedaySelect : undefined}
            onClose={() => props.onScheduleOpenChange(false)}
          />
        </PopoverContent>
      </Popover>

      <Popover open={props.moveOpen} onOpenChange={props.onMoveOpenChange}>
        <PopoverTrigger as={Button} variant="ghost" class={toolbarButtonClass} disabled={!props.canMove}>
          <MoveIcon class="w-6 h-6 md:w-5 md:h-5" />
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl ring-0">
          <MovePickerContent
            listId={props.task?.listId ?? null}
            onChangeListId={handleMoveChange}
            projects={props.projects}
            areas={props.areas}
            isInbox={props.task?.status === null}
            onClose={() => props.onMoveOpenChange(false)}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
