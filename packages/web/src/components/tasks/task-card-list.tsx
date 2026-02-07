import type { Accessor } from "solid-js"
import { For } from "solid-js"
import type { TaskInfo } from "@/context/data"
import { TaskCard } from "./task-card"
import type { TaskEnhancementProps } from "./types"

export type TaskCardListProps = TaskEnhancementProps & {
  tasks: TaskInfo[]
  expandedTaskId: Accessor<string | null>
  selectedIds?: Accessor<Set<string>>
  scheduleDatePickerTaskId?: Accessor<string | null>
  onScheduleDatePickerClose?: () => void
  movePickerTaskId?: Accessor<string | null>
  onMovePickerClose?: () => void
  projects?: Array<{ id: string; title: string; areaId?: string | null }>
  areas?: Array<{ id: string; title: string }>
  onSelect?: (id: string, event: MouseEvent) => void
  onExpand: (id: string) => void
  onComplete: (id: string, completed: boolean) => void
  onCancel?: (id: string) => void
  onUncancel?: (id: string) => void
  onUpdate: (id: string, updates: Partial<TaskInfo>) => void
  isSomeday?: boolean
  hideScheduledDate?: boolean
  showTodayStar?: boolean
  showCompletedDate?: boolean
  // Trash view specific props
  isTrashView?: boolean
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
}

/**
 * TaskCardList is a pure rendering component that displays a list of TaskCards.
 * It does NOT handle drag-drop logic - that's the responsibility of the parent.
 * This component is used by both TaskList and GroupedTaskList to avoid duplication.
 */
export function TaskCardList(props: TaskCardListProps) {
  return (
    <div class="flex flex-col">
      <For each={props.tasks}>
        {(task) => (
          <TaskCard
            task={task}
            expanded={props.expandedTaskId() === task.id}
            selected={props.selectedIds?.().has(task.id) ?? false}
            scheduleDatePickerOpen={props.scheduleDatePickerTaskId?.() === task.id}
            onScheduleDatePickerClose={props.onScheduleDatePickerClose}
            movePickerOpen={props.movePickerTaskId?.() === task.id}
            onMovePickerClose={props.onMovePickerClose}
            projects={props.projects}
            areas={props.areas}
            onComplete={props.onComplete}
            onCancel={props.onCancel}
            onUncancel={props.onUncancel}
            onUpdate={props.onUpdate}
            onSelect={props.onSelect}
            onExpand={props.onExpand}
            isSomeday={props.isSomeday}
            hideScheduledDate={props.hideScheduledDate}
            showTodayStar={props.showTodayStar}
            showCompletedDate={props.showCompletedDate}
            isTrashView={props.isTrashView}
            onRestore={props.onRestore}
            onDelete={props.onDelete}
            tags={props.taskTags?.[task.id]}
            onTagAdd={props.onTagAdd}
            onTagRemove={props.onTagRemove}
            onFetchTags={props.onFetchTags}
            onConvertToRepeat={props.onConvertToRepeat}
            checklistItems={props.checklistItems?.[task.id]}
            onFetchChecklistItems={props.onFetchChecklistItems}
            onCreateChecklistItem={props.onCreateChecklistItem}
            onUpdateChecklistItem={props.onUpdateChecklistItem}
            onDeleteChecklistItem={props.onDeleteChecklistItem}
            onReorderChecklistItems={props.onReorderChecklistItems}
          />
        )}
      </For>
    </div>
  )
}
