import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash"
import { attachClosestEdge, type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import GripVertical from "lucide-solid/icons/grip-vertical"
import { createEffect, createSignal, For, Show } from "solid-js"
import { Portal } from "solid-js/web"
import invariant from "tiny-invariant"

// Types
type TStatus = "todo" | "in-progress" | "done"
type TTask = { id: string; content: string; status: TStatus }

// Task data
const taskDataKey = Symbol("task")
type TTaskData = { [taskDataKey]: true; taskId: TTask["id"] }

function getTaskData(task: TTask): TTaskData {
  return { [taskDataKey]: true, taskId: task.id }
}

function isTaskData(data: Record<string | symbol, unknown>): data is TTaskData {
  return data[taskDataKey] === true
}

// Initial tasks
const initialTasks: TTask[] = [
  { id: "task-0", content: "Organize a team-building event", status: "todo" },
  {
    id: "task-1",
    content: "Create and maintain office inventory",
    status: "in-progress",
  },
  { id: "task-2", content: "Update company website content", status: "done" },
  {
    id: "task-3",
    content: "Plan and execute marketing campaigns",
    status: "todo",
  },
  {
    id: "task-4",
    content: "Coordinate employee training sessions",
    status: "done",
  },
  { id: "task-5", content: "Manage facility maintenance", status: "done" },
  {
    id: "task-6",
    content: "Organize customer feedback surveys",
    status: "todo",
  },
  {
    id: "task-7",
    content: "Coordinate travel arrangements",
    status: "in-progress",
  },
]

// Status component
const statusBgColor: Record<TStatus, string> = {
  todo: "bg-violet-200",
  "in-progress": "bg-amber-200",
  done: "bg-green-200",
}

const statusLabel: Record<TStatus, string> = {
  todo: "TODO",
  "in-progress": "In progress",
  done: "Done",
}

function Status(props: { status: TStatus }) {
  return (
    <div class="flex w-[100px] justify-end">
      <span
        class={`${statusBgColor[props.status]} uppercase p-1 rounded font-semibold flex-shrink-0 text-xs text-slate-900`}
      >
        {statusLabel[props.status]}
      </span>
    </div>
  )
}

// Shadow component
function CardShadow(props: { height: number }) {
  return <div class="flex-shrink-0 rounded bg-slate-900" style={{ height: `${props.height}px` }} />
}

// Task state
interface TaskState {
  type: "idle" | "preview" | "is-dragging" | "is-dragging-and-left-self" | "is-dragging-over"
  container?: HTMLElement
  closestEdge?: Edge | null
  dragHeight?: number
}

const idle: TaskState = { type: "idle" }

// Drag preview
function DragPreview(props: { task: TTask }) {
  return <div class="border-solid rounded p-2 bg-white">{props.task.content}</div>
}

// Task component
function Task(props: { task: TTask }) {
  let ref: HTMLDivElement | undefined
  const [state, setState] = createSignal<TaskState>(idle)

  createEffect(() => {
    const element = ref
    const task = props.task
    invariant(element)

    draggable({
      element,
      getInitialData() {
        return getTaskData(task)
      },
      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({
            x: "16px",
            y: "8px",
          }),
          render({ container }) {
            setState({ type: "preview", container })
          },
        })
      },
      onDragStart() {
        setState({ type: "is-dragging" })
      },
      onDrop() {
        setState(idle)
      },
    })

    dropTargetForElements({
      element,
      canDrop({ source }) {
        // Allow dropping on self so we can detect when we leave
        return isTaskData(source.data)
      },
      getData({ input }) {
        const data = getTaskData(task)
        return attachClosestEdge(data, {
          element,
          input,
          allowedEdges: ["top", "bottom"],
        })
      },
      getIsSticky() {
        return true
      },
      onDragEnter({ self, source }) {
        if (!isTaskData(source.data)) return
        // If we're entering ourselves, we're dragging
        if (source.data.taskId === task.id) return
        const closestEdge = extractClosestEdge(self.data)
        const dragHeight = source.element.getBoundingClientRect().height
        setState({ type: "is-dragging-over", closestEdge, dragHeight })
      },
      onDrag({ self, source }) {
        if (!isTaskData(source.data)) return
        // If we're dragging over ourselves, ignore
        if (source.data.taskId === task.id) return
        const closestEdge = extractClosestEdge(self.data)
        const dragHeight = source.element.getBoundingClientRect().height
        setState((current) => {
          if (current.type === "is-dragging-over" && current.closestEdge === closestEdge) {
            return current
          }
          return { type: "is-dragging-over", closestEdge, dragHeight }
        })
      },
      onDragLeave({ source }) {
        if (!isTaskData(source.data)) return
        // If we're the card being dragged and we left ourselves, hide
        if (source.data.taskId === task.id) {
          setState({ type: "is-dragging-and-left-self" })
          return
        }
        setState(idle)
      },
      onDrop() {
        setState(idle)
      },
    })
  })

  const s = () => state()
  const isDragging = () => s().type === "is-dragging"
  const isLeftSelf = () => s().type === "is-dragging-and-left-self"
  const isOver = () => s().type === "is-dragging-over"
  const edge = () => s().closestEdge
  const height = () => s().dragHeight ?? 40

  // Styles for the card
  const cardClass = () => {
    const base = "flex text-sm bg-white flex-row items-center border border-solid rounded p-2 pl-0"
    if (isLeftSelf()) return `${base} hidden`
    if (isDragging()) return `${base} opacity-40`
    return `${base} hover:bg-slate-100 hover:cursor-grab`
  }

  return (
    <>
      {/* Shadow before */}
      <Show when={isOver() && edge() === "top"}>
        <CardShadow height={height()} />
      </Show>

      <div data-task-id={props.task.id} ref={ref} class={cardClass()}>
        <div class="w-6 flex justify-center">
          <GripVertical size={10} />
        </div>
        <span class="truncate flex-grow flex-shrink">{props.task.content}</span>
        <Status status={props.task.status} />
      </div>

      {/* Shadow after */}
      <Show when={isOver() && edge() === "bottom"}>
        <CardShadow height={height()} />
      </Show>

      <Show when={s().type === "preview" && s().container}>
        <Portal mount={s().container!}>
          <DragPreview task={props.task} />
        </Portal>
      </Show>
    </>
  )
}

// List component
export function Board() {
  const [tasks, setTasks] = createSignal<TTask[]>(initialTasks)

  createEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isTaskData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if (!target) {
          return
        }

        const sourceData = source.data
        const targetData = target.data

        if (!isTaskData(sourceData) || !isTaskData(targetData)) {
          return
        }

        const indexOfSource = tasks().findIndex((task) => task.id === sourceData.taskId)
        const indexOfTarget = tasks().findIndex((task) => task.id === targetData.taskId)

        if (indexOfTarget < 0 || indexOfSource < 0) {
          return
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData)

        setTasks(
          reorderWithEdge({
            list: tasks(),
            startIndex: indexOfSource,
            indexOfTarget,
            closestEdgeOfTarget,
            axis: "vertical",
          }),
        )

        const element = document.querySelector(`[data-task-id="${sourceData.taskId}"]`)
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      },
    })
  })

  return (
    <div class="pt-6 my-0 mx-auto w-[420px]">
      <div class="flex flex-col gap-2 border border-solid rounded p-2">
        <For each={tasks()}>{(task) => <Task task={task} />}</For>
      </div>
    </div>
  )
}
