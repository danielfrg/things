import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js"
import { isTaskData } from "@/components/dnd/task-data"
import type { TaskInfo } from "@/context/data"
import { useMultiSelect } from "@/lib/hooks/useMultiSelect"
import { useTaskKeyboardNav } from "@/lib/hooks/useTaskKeyboardNav"
import { TaskCardList } from "./task-card-list"
import type { TaskEnhancementProps, TaskPickerControls } from "./types"

export type TaskListProps = TaskEnhancementProps & {
  tasks: TaskInfo[]
  onComplete: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<TaskInfo>) => void
  onReorder: (taskId: string, newIndex: number) => void
  initialExpandedTaskId?: string | null
  autoCommitSticky?: boolean
  projects?: Array<{ id: string; title: string; areaId?: string | null }>
  areas?: Array<{ id: string; title: string }>
  onRegisterPickers?: (controls: TaskPickerControls | null) => void
}

export function TaskList(props: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(props.initialExpandedTaskId ?? null)
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = createSignal<string | null>(null)
  const [movePickerTaskId, setMovePickerTaskId] = createSignal<string | null>(null)

  const tasks = createMemo(() => props.tasks)
  const { selectedIds, lastSelectedId, handleSelect, clearSelection, selectAll, isMultiSelecting } = useMultiSelect({
    items: tasks,
  })

  const canOpenSchedule = createMemo(() => selectedIds().size > 0 && !expandedTaskId())
  const canOpenMove = createMemo(() => selectedIds().size > 0 && !expandedTaskId())
  const selectedList = createMemo(() => Array.from(selectedIds()))

  const pickerControls: TaskPickerControls = {
    selectedTaskId: () => lastSelectedId(),
    selectedIds: () => selectedList(),
    canOpenSchedule: () => canOpenSchedule(),
    canOpenMove: () => canOpenMove(),
  }

  const handleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
  }

  createEffect(() => {
    const initialId = props.initialExpandedTaskId
    if (initialId && tasks().some((task) => task.id === initialId)) {
      setExpandedTaskId(initialId)
      handleSelect(initialId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        button: 0,
      } as MouseEvent)
    }
  })

  useTaskKeyboardNav({
    tasks,
    selectedTaskId: lastSelectedId,
    expandedTaskId,
    onSelect: (taskId) => {
      if (taskId) {
        handleSelect(taskId, {
          shiftKey: false,
          metaKey: false,
          ctrlKey: false,
          button: 0,
        } as MouseEvent)
        return
      }
      clearSelection()
    },
    onExpand: (taskId) => {
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
    },
  })

  createEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      const selected = lastSelectedId()
      const expanded = expandedTaskId()
      const multiSelecting = isMultiSelecting()

      if (e.key === "s" && e.ctrlKey && !e.metaKey) {
        if (selected && !expanded && !multiSelecting) {
          e.preventDefault()
          setScheduleDatePickerTaskId(selected)
        }
      }

      if (e.key === "d" && e.ctrlKey && !e.metaKey) {
        if (selected && !expanded && !multiSelecting) {
          e.preventDefault()
          setMovePickerTaskId(selected)
        }
      }

      if (e.key === "a" && e.metaKey) {
        e.preventDefault()
        selectAll()
      }
    }
    document.addEventListener("keydown", handler)
    onCleanup(() => document.removeEventListener("keydown", handler))
  })

  createEffect(() => {
    props.onRegisterPickers?.(pickerControls)
    onCleanup(() => props.onRegisterPickers?.(null))
  })

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
        selectedIds={selectedIds}
        scheduleDatePickerTaskId={scheduleDatePickerTaskId}
        onScheduleDatePickerClose={() => setScheduleDatePickerTaskId(null)}
        movePickerTaskId={movePickerTaskId}
        onMovePickerClose={() => setMovePickerTaskId(null)}
        projects={props.projects}
        areas={props.areas}
        onSelect={handleSelect}
        onExpand={handleExpand}
        onComplete={props.onComplete}
        onUpdate={props.onUpdate}
        autoCommitSticky={props.autoCommitSticky}
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
