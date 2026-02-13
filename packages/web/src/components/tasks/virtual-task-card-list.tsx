import { createMemo } from "solid-js"
import { Virtualizer } from "virtua/solid"
import type { TaskInfo } from "@/context/data"
import { TaskCard } from "./task-card"
import type { TaskCardListProps } from "./task-card-list"

/**
 * Virtualized version of TaskCardList for views with large numbers of tasks
 * (logbook, trash). Uses virtua to only render visible items in the DOM.
 * The Virtualizer auto-detects its nearest scrollable ancestor (ViewContainer).
 */
export function VirtualTaskCardList(props: TaskCardListProps) {
  const expanded = createMemo(() => {
    const id = props.expandedTaskId()
    if (!id) return undefined
    const idx = props.tasks.findIndex((t) => t.id === id)
    return idx >= 0 ? [idx] : undefined
  })

  return (
    <Virtualizer data={props.tasks} keepMounted={expanded()}>
      {(task: TaskInfo) => (
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
    </Virtualizer>
  )
}
