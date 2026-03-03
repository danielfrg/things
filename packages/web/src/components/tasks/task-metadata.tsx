import { For, Show } from "solid-js"
import { FlagIcon, RepeatIcon } from "@/components/icons"
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
 * repeat icon, tags, scheduled date, deadline.
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

  const isRepeating = () => Boolean(props.templateId)
  const tagCount = () => props.tags?.length ?? 0

  const hasMetadata = () => showScheduledDate() || Boolean(deadlineStr()) || isRepeating() || tagCount() > 0

  return (
    <Show when={hasMetadata()}>
      <span class="flex items-center gap-2 ml-auto shrink-0 overflow-hidden">
        <Show when={isRepeating()}>
          <RepeatIcon class="w-3.5 h-3.5 text-task-inline shrink-0 stroke-1" />
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
            <FlagIcon class="w-3.5 h-3.5 stroke-1" />
            {deadlineStr()}
          </span>
        </Show>
      </span>
    </Show>
  )
}
