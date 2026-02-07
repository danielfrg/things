import { For, Show } from "solid-js"
import { FileTextIcon, FlagIcon, ListChecksIcon, RepeatIcon } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { cn, formatTaskDate, isDateOverdue } from "@/lib/utils"

type TagInfo = {
  id: string
  title: string
}

type ChecklistItemInfo = {
  completed: boolean
}

type TaskMetadataProps = {
  scheduledDate?: string | null
  deadline?: string | null
  notes?: string | null
  templateId?: string | null
  tags?: TagInfo[]
  checklistItems?: ChecklistItemInfo[]
  hideToday?: boolean
  hideScheduledDate?: boolean
  showTodayStar?: boolean
}

/**
 * TaskMetadata displays the collapsed metadata indicators:
 * notes icon, repeat icon, checklist count, tags, scheduled date, deadline.
 */
export function TaskMetadata(props: TaskMetadataProps) {
  const scheduledDateStr = () => formatTaskDate(props.scheduledDate)
  const deadlineStr = () => formatTaskDate(props.deadline)
  const scheduledOverdue = () => isDateOverdue(props.scheduledDate)
  const deadlineOverdue = () => isDateOverdue(props.deadline)

  const showScheduledDate = () => {
    const dateStr = scheduledDateStr()
    return dateStr && !props.hideScheduledDate && !((props.hideToday || props.showTodayStar) && dateStr === "Today")
  }

  const hasChecklist = () => (props.checklistItems?.length ?? 0) > 0
  const completedCount = () => props.checklistItems?.filter((item) => item.completed).length ?? 0
  const totalCount = () => props.checklistItems?.length ?? 0

  const hasNotes = () => Boolean(props.notes && props.notes.trim().length > 0)
  const isRepeating = () => Boolean(props.templateId)
  const tagCount = () => props.tags?.length ?? 0

  const hasMetadata = () =>
    showScheduledDate() || Boolean(deadlineStr()) || hasChecklist() || hasNotes() || isRepeating() || tagCount() > 0

  return (
    <Show when={hasMetadata()}>
      <span class="flex items-center gap-2 ml-auto shrink-0 overflow-hidden">
        <Show when={hasNotes()}>
          <FileTextIcon class="w-3.5 h-3.5 text-task-inline shrink-0" />
        </Show>

        <Show when={isRepeating()}>
          <RepeatIcon class="w-3.5 h-3.5 text-task-inline shrink-0" />
        </Show>

        <Show when={hasChecklist()}>
          <span class="flex items-center gap-1 text-xs text-task-inline shrink-0">
            <ListChecksIcon class="w-3.5 h-3.5" />
            {completedCount()}/{totalCount()}
          </span>
        </Show>

        {/* Hide tags on mobile to prevent overflow */}
        <Show when={tagCount() > 0}>
          <span class="hidden md:flex items-center gap-1">
            <For each={props.tags?.slice(0, 2)}>
              {(tag) => (
                <Badge variant="outline" size="xs">
                  {tag.title}
                </Badge>
              )}
            </For>
            <Show when={tagCount() > 2}>
              <span class="text-xs text-task-inline">+{tagCount() - 2}</span>
            </Show>
          </span>
        </Show>

        <Show when={showScheduledDate()}>
          <Badge
            variant="secondary"
            size="sm"
            class={cn(
              "font-bold bg-scheduled-badge-bg text-scheduled-badge-text",
              scheduledOverdue() && "bg-transparent text-things-pink",
            )}
          >
            {scheduledDateStr()}
          </Badge>
        </Show>

        <Show when={deadlineStr()}>
          <span
            class={cn(
              "flex items-center gap-1 text-xs text-muted-foreground shrink-0",
              deadlineOverdue() && "text-things-pink",
            )}
          >
            <FlagIcon class="w-3.5 h-3.5" />
            {deadlineStr()}
          </span>
        </Show>
      </span>
    </Show>
  )
}
