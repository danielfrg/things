import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import { isTaskData } from "@/components/dnd/task-data"
import type { TaskInfo } from "@/context/data"
import { TaskCardList } from "./task-card-list"
import type { TaskEnhancementProps } from "./types"

export type TaskListProps = TaskEnhancementProps & {
  tasks: TaskInfo[]
  onComplete: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<TaskInfo>) => void
  onReorder: (taskId: string, newIndex: number) => void
  initialExpandedTaskId?: string | null
}

export function TaskList(props: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(props.initialExpandedTaskId ?? null)

  const handleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
  }

  createEffect(() => {
    const cleanup = monitorForElements({
      canMonitor({ source }) {
        return isTaskData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceData = source.data
        const targetData = target.data

        if (!isTaskData(sourceData) || !isTaskData(targetData)) return

        const tasks = props.tasks
        const indexOfSource = tasks.findIndex((t) => t.id === sourceData.taskId)
        const indexOfTarget = tasks.findIndex((t) => t.id === targetData.taskId)

        if (indexOfTarget < 0 || indexOfSource < 0) return

        const closestEdge = extractClosestEdge(targetData)
        const reordered = reorderWithEdge({
          list: tasks,
          startIndex: indexOfSource,
          indexOfTarget,
          closestEdgeOfTarget: closestEdge,
          axis: "vertical",
        })

        const newIndex = reordered.findIndex((t) => t.id === sourceData.taskId)
        props.onReorder(sourceData.taskId, newIndex)

        const element = document.querySelector(`[data-task-id="${sourceData.taskId}"]`)
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      },
    })

    onCleanup(cleanup)
  })

  return (
    <Show when={props.tasks.length > 0}>
      <TaskCardList
        tasks={props.tasks}
        expandedTaskId={expandedTaskId}
        onExpand={handleExpand}
        onComplete={props.onComplete}
        onUpdate={props.onUpdate}
        taskTags={props.taskTags}
        onTagAdd={props.onTagAdd}
        onTagRemove={props.onTagRemove}
        onFetchTags={props.onFetchTags}
        onConvertToRepeat={props.onConvertToRepeat}
        checklistItems={props.checklistItems}
        onFetchChecklistItems={props.onFetchChecklistItems}
        onCreateChecklistItem={props.onCreateChecklistItem}
        onUpdateChecklistItem={props.onUpdateChecklistItem}
        onDeleteChecklistItem={props.onDeleteChecklistItem}
        onReorderChecklistItems={props.onReorderChecklistItems}
      />
    </Show>
  )
}
