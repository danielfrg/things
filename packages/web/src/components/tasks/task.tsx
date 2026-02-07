import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { attachClosestEdge, type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"
import invariant from "tiny-invariant"
import { getTaskData, isTaskData } from "@/components/dnd/task-data"
import { TaskCheckbox } from "@/components/ui/task-checkbox"
import type { TaskInfo } from "@/context/data"
import { cn } from "@/lib/utils"

type TaskState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; dragging: DOMRect }
  | { type: "is-dragging" }
  | { type: "is-dragging-and-left-self" }
  | { type: "is-over"; dragging: DOMRect; closestEdge: Edge }

const idle: TaskState = { type: "idle" }

function TaskShadow(props: { dragging: DOMRect }) {
  return <div class="flex-shrink-0 rounded-md bg-secondary/80" style={{ height: `${props.dragging.height + 4}px` }} />
}

function TaskPreview(props: { task: TaskInfo; dragging: DOMRect; isSomeday?: boolean }) {
  const isCompleted = () => !!props.task.completedAt
  return (
    <div
      class="group flex items-center gap-2 px-4 md:px-2 py-3 md:py-2 md:rounded-md w-full text-left overflow-hidden bg-background shadow-lg border border-border"
      style={{
        width: `${props.dragging.width}px`,
        height: `${props.dragging.height}px`,
      }}
    >
      <TaskCheckbox checked={isCompleted()} dashed={props.isSomeday} />
      <span
        class={cn(
          "flex-1 min-w-0 text-lg md:text-[15px] leading-tight truncate",
          isCompleted() ? "line-through text-muted-foreground" : "text-foreground",
        )}
      >
        {props.task.title}
      </span>
    </div>
  )
}

export function Task(props: {
  task: TaskInfo
  onComplete: (id: string, completed: boolean) => void
  isSomeday?: boolean
}) {
  let outerRef: HTMLDivElement | undefined
  let innerRef: HTMLDivElement | undefined
  const [state, setState] = createSignal<TaskState>(idle)

  createEffect(() => {
    const outer = outerRef
    const inner = innerRef
    const task = props.task
    invariant(outer && inner)

    const cleanup = combine(
      draggable({
        element: inner,
        getInitialData() {
          return getTaskData(task, inner.getBoundingClientRect())
        },
        onGenerateDragPreview({ nativeSetDragImage, location }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: inner,
              input: location.current.input,
            }),
            render({ container }) {
              setState({
                type: "preview",
                container,
                dragging: inner.getBoundingClientRect(),
              })
            },
          })
        },
        onDragStart() {
          setState({ type: "is-dragging" })
        },
        onDrop() {
          setState(idle)
        },
      }),
      dropTargetForElements({
        element: outer,
        getIsSticky: () => true,
        canDrop: ({ source }) => isTaskData(source.data),
        getData({ input }) {
          return attachClosestEdge(getTaskData(task, inner.getBoundingClientRect()), {
            element: outer,
            input,
            allowedEdges: ["top", "bottom"],
          })
        },
        onDragEnter({ source, self }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) return

          const closestEdge = extractClosestEdge(self.data)
          if (!closestEdge) return

          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          })
        },
        onDrag({ source, self }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) return

          const closestEdge = extractClosestEdge(self.data)
          if (!closestEdge) return

          const current = state()
          if (current.type === "is-over" && current.closestEdge === closestEdge) {
            return
          }
          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          })
        },
        onDragLeave({ source }) {
          if (!isTaskData(source.data)) return
          if (source.data.taskId === task.id) {
            setState({ type: "is-dragging-and-left-self" })
            return
          }
          setState(idle)
        },
        onDrop() {
          setState(idle)
        },
      }),
    )

    onCleanup(cleanup)
  })

  const outerClass = () => {
    if (state().type === "is-dragging-and-left-self") return "hidden"
    return "flex-shrink-0"
  }

  const innerClass = () => {
    const base =
      "group flex items-center gap-2 px-4 md:px-2 py-3 md:py-2 md:rounded-md w-full text-left overflow-hidden"

    switch (state().type) {
      case "idle":
        return cn(base, "hover:bg-secondary/50 cursor-grab")
      case "is-dragging":
      case "is-dragging-and-left-self":
        return cn(base, "opacity-40 cursor-grabbing")
      default:
        return cn(base, "hover:bg-secondary/50 cursor-grab")
    }
  }

  return (
    <>
      <div ref={outerRef} class={outerClass()}>
        <Show when={state().type === "is-over" && (state() as { closestEdge: Edge }).closestEdge === "top"}>
          <TaskShadow dragging={(state() as { dragging: DOMRect }).dragging} />
        </Show>

        <div ref={innerRef} data-task-id={props.task.id} class={innerClass()}>
          <TaskCheckbox
            checked={!!props.task.completedAt}
            dashed={props.isSomeday}
            onChange={(checked) => props.onComplete(props.task.id, checked)}
          />
          <span
            class={cn(
              "flex-1 min-w-0 text-lg md:text-[15px] leading-tight truncate",
              props.task.completedAt ? "line-through text-muted-foreground" : "text-foreground",
            )}
          >
            {props.task.title}
          </span>
        </div>

        <Show when={state().type === "is-over" && (state() as { closestEdge: Edge }).closestEdge === "bottom"}>
          <TaskShadow dragging={(state() as { dragging: DOMRect }).dragging} />
        </Show>
      </div>

      <Show when={state().type === "preview"}>
        <Portal mount={(state() as { container: HTMLElement }).container}>
          <TaskPreview
            task={props.task}
            dragging={(state() as { dragging: DOMRect }).dragging}
            isSomeday={props.isSomeday}
          />
        </Portal>
      </Show>
    </>
  )
}
