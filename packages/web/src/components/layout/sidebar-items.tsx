import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { attachClosestEdge, type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { useLocation, useNavigate } from "@solidjs/router"
import type { Accessor } from "solid-js"
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"
import invariant from "tiny-invariant"
import {
  getAreaHeaderData,
  getAreaHeaderDropData,
  getEmptyAreaDropData,
  getProjectData,
  getProjectDropData,
  isAreaHeaderData,
  isAreaHeaderDropData,
  isEmptyAreaDropData,
  isProjectData,
  isProjectDropData,
} from "@/components/dnd/sidebar-data"
import { isTaskData } from "@/components/dnd/task-data"
import { BoxIcon } from "@/components/icons"
import { ProjectProgressIcon } from "@/components/ui/project-progress-icon"
import type { AreaInfo, ProjectInfo } from "@/context/sidebar"
import { cn } from "@/lib/utils"

// Project shadow for drag indicator
function ProjectShadow(props: { height: number }) {
  return (
    <div
      class="flex-shrink-0 rounded-md bg-secondary/80 mx-2 transition-all duration-150"
      style={{ height: `${props.height}px` }}
    />
  )
}

// Area shadow for drag indicator
function AreaShadow(props: { height: number }) {
  return (
    <div
      class="flex-shrink-0 rounded-md bg-secondary/80 mx-2 mb-4 transition-all duration-150"
      style={{ height: `${props.height}px` }}
    />
  )
}

// Project item states
type ProjectItemState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; rect: DOMRect }
  | { type: "is-dragging" }
  | { type: "is-dragging-and-left-self" }
  | { type: "is-over"; rect: DOMRect; edge: Edge }
  | { type: "task-over" } // New state for task drag over

const projectIdle: ProjectItemState = { type: "idle" }

// Project preview for drag overlay
function ProjectPreview(props: { project: ProjectInfo; rect: DOMRect; progress: number }) {
  return (
    <div
      class="flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-[13px] font-medium bg-sidebar shadow-lg border border-border"
      style={{
        width: `${props.rect.width}px`,
        height: `${props.rect.height}px`,
      }}
    >
      <ProjectProgressIcon progress={props.progress} size={16} variant="sidebar" class="text-project-progress" />
      <span class="flex-1 truncate text-sidebar-foreground">{props.project.title}</span>
    </div>
  )
}

// Draggable project item
function ProjectItem(props: {
  project: ProjectInfo
  areaId: string | undefined
  progress: number
  onTaskDrop?: (taskId: string, projectId: string, areaId: string | undefined) => void
  onLinkClick?: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  let outerRef: HTMLDivElement | undefined
  let innerRef: HTMLAnchorElement | undefined
  const [state, setState] = createSignal<ProjectItemState>(projectIdle)

  const isActive = () => location.pathname === `/project/${props.project.id}`

  createEffect(() => {
    const outer = outerRef
    const inner = innerRef
    const project = props.project
    const areaId = props.areaId
    invariant(outer && inner)

    const cleanup = combine(
      draggable({
        element: inner,
        getInitialData() {
          return getProjectData(project.id, areaId, inner.getBoundingClientRect())
        },
        onGenerateDragPreview({ nativeSetDragImage, location: loc }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: inner,
              input: loc.current.input,
            }),
            render({ container }) {
              setState({
                type: "preview",
                container,
                rect: inner.getBoundingClientRect(),
              })
            },
          })
        },
        onDragStart() {
          setState({ type: "is-dragging" })
        },
        onDrop() {
          setState(projectIdle)
        },
      }),
      // Drop target for project reordering
      dropTargetForElements({
        element: outer,
        getIsSticky: () => true,
        canDrop: ({ source }) => isProjectData(source.data),
        getData({ input }) {
          return attachClosestEdge(getProjectDropData(project.id, areaId), {
            element: outer,
            input,
            allowedEdges: ["top", "bottom"],
          })
        },
        onDragEnter({ source, self }) {
          if (!isProjectData(source.data)) return
          if (source.data.projectId === project.id) return

          const edge = extractClosestEdge(self.data)
          if (!edge) return

          setState({
            type: "is-over",
            rect: source.data.rect,
            edge,
          })
        },
        onDrag({ source, self }) {
          if (!isProjectData(source.data)) return
          if (source.data.projectId === project.id) return

          const edge = extractClosestEdge(self.data)
          if (!edge) return

          const current = state()
          if (current.type === "is-over" && current.edge === edge) return

          setState({
            type: "is-over",
            rect: source.data.rect,
            edge,
          })
        },
        onDragLeave({ source }) {
          if (!isProjectData(source.data)) return
          if (source.data.projectId === project.id) {
            setState({ type: "is-dragging-and-left-self" })
            return
          }
          setState(projectIdle)
        },
        onDrop() {
          setState(projectIdle)
        },
      }),
      // Drop target for tasks
      dropTargetForElements({
        element: inner,
        canDrop: ({ source }) => isTaskData(source.data),
        onDragEnter({ source }) {
          if (isTaskData(source.data)) {
            setState({ type: "task-over" })
          }
        },
        onDragLeave() {
          const current = state()
          if (current.type === "task-over") {
            setState(projectIdle)
          }
        },
        onDrop({ source }) {
          if (isTaskData(source.data) && props.onTaskDrop) {
            props.onTaskDrop(source.data.taskId, project.id, areaId)
          }
          setState(projectIdle)
        },
      }),
    )

    onCleanup(cleanup)
  })

  const handleClick = (e: MouseEvent) => {
    if (state().type === "is-dragging") {
      e.preventDefault()
      return
    }
    props.onLinkClick?.()
    navigate(`/project/${props.project.id}`)
  }

  const outerClass = () => {
    const s = state()
    if (s.type === "is-dragging") return "opacity-0"
    if (s.type === "is-dragging-and-left-self") return "hidden"
    if (s.type === "preview") return "opacity-0"
    return "flex-shrink-0"
  }

  const innerClass = () => {
    const base =
      "flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-grab"
    const s = state()
    if (s.type === "is-dragging" || s.type === "is-dragging-and-left-self") {
      return base
    }
    if (s.type === "task-over") {
      return cn(base, "bg-sidebar-accent ring-2 ring-things-blue ring-inset")
    }
    return cn(base, "hover:bg-sidebar-accent", isActive() && "bg-sidebar-accent")
  }

  return (
    <>
      <div ref={outerRef} class={outerClass()}>
        <Show when={state().type === "is-over" && (state() as { edge: Edge }).edge === "top"}>
          <ProjectShadow height={(state() as { rect: DOMRect }).rect.height} />
        </Show>

        <a ref={innerRef} href={`/project/${props.project.id}`} onClick={handleClick} class={innerClass()}>
          <ProjectProgressIcon progress={props.progress} size={16} variant="sidebar" class="text-project-progress" />
          <span class="flex-1 truncate text-sidebar-foreground">{props.project.title}</span>
        </a>

        <Show when={state().type === "is-over" && (state() as { edge: Edge }).edge === "bottom"}>
          <ProjectShadow height={(state() as { rect: DOMRect }).rect.height} />
        </Show>
      </div>

      <Show when={state().type === "preview"}>
        <Portal mount={(state() as { container: HTMLElement }).container}>
          <ProjectPreview
            project={props.project}
            progress={props.progress}
            rect={(state() as { rect: DOMRect }).rect}
          />
        </Portal>
      </Show>
    </>
  )
}

// Empty drop zone when no projects in an area
type DropZoneState = { type: "idle" } | { type: "is-dragging" } | { type: "is-over"; height: number }

function EmptyDropZone(props: { areaId: string | undefined }) {
  let ref: HTMLDivElement | undefined
  const [state, setState] = createSignal<DropZoneState>({ type: "idle" })

  createEffect(() => {
    const element = ref
    invariant(element)

    const cleanup = combine(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isProjectData(source.data),
        getData: () => getEmptyAreaDropData(props.areaId),
        onDragEnter({ source }) {
          if (!isProjectData(source.data)) return
          setState({ type: "is-over", height: source.data.rect.height })
        },
        onDragLeave() {
          setState({ type: "is-dragging" })
        },
        onDrop() {
          setState({ type: "idle" })
        },
      }),
      monitorForElements({
        canMonitor: ({ source }) => isProjectData(source.data),
        onDragStart() {
          setState({ type: "is-dragging" })
        },
        onDrop() {
          setState({ type: "idle" })
        },
      }),
    )

    onCleanup(cleanup)
  })

  const style = () => {
    const s = state()
    if (s.type === "is-over") return { height: `${s.height}px` }
    if (s.type === "is-dragging") return { height: "32px" }
    return { height: "0px" }
  }

  const className = () => {
    const s = state()
    if (s.type === "is-over") return "bg-secondary/80"
    if (s.type === "is-dragging") return "bg-secondary/40"
    return ""
  }

  return (
    <div ref={ref} class={cn("mx-2 mb-2 rounded-md transition-all overflow-hidden", className())} style={style()} />
  )
}

// Area item states
type AreaItemState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; rect: DOMRect }
  | { type: "is-dragging" }
  | { type: "is-over"; rect: DOMRect; edge: Edge }
  | { type: "task-over" } // New state for task drag over

const areaIdle: AreaItemState = { type: "idle" }

// Area preview for drag overlay
function AreaPreview(props: { area: AreaInfo }) {
  return (
    <div class="mb-4">
      <div class="flex items-center justify-between mx-2 px-2 py-1 group bg-sidebar shadow-lg border border-border rounded-md">
        <span class="flex-1 text-[13px] font-medium text-sidebar-foreground flex items-center gap-2">
          <BoxIcon class="w-4 h-4 text-muted-foreground" />
          {props.area.title}
        </span>
      </div>
    </div>
  )
}

// Area header component
function AreaHeader(props: { area: AreaInfo; onLinkClick?: () => void }) {
  const navigate = useNavigate()

  const handleClick = () => {
    props.onLinkClick?.()
    navigate(`/area/${props.area.id}`)
  }

  return (
    <button
      type="button"
      class="flex-1 text-left text-[13px] font-medium text-sidebar-foreground cursor-pointer select-none flex items-center gap-2"
      onClick={handleClick}
    >
      <BoxIcon class="w-4 h-4 text-muted-foreground" />
      <span class="truncate">{props.area.title}</span>
    </button>
  )
}

// Area item with projects
function AreaItem(props: {
  area: AreaInfo
  projects: ProjectInfo[]
  projectProgress: Accessor<Map<string, number>>
  onTaskDrop?: (taskId: string, projectId: string, areaId: string | undefined) => void
  onAreaTaskDrop?: (taskId: string, areaId: string) => void
  onLinkClick?: () => void
}) {
  const location = useLocation()
  let outerRef: HTMLDivElement | undefined
  let headerRef: HTMLDivElement | undefined
  const [state, setState] = createSignal<AreaItemState>(areaIdle)

  const isActive = () => location.pathname === `/area/${props.area.id}`

  createEffect(() => {
    const outer = outerRef
    const header = headerRef
    const area = props.area
    invariant(outer && header)

    const cleanup = combine(
      // Make area header draggable for reordering areas
      draggable({
        element: header,
        getInitialData() {
          return getAreaHeaderData(area.id, outer.getBoundingClientRect())
        },
        onGenerateDragPreview({ nativeSetDragImage, location: loc }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: header,
              input: loc.current.input,
            }),
            render({ container }) {
              setState({
                type: "preview",
                container,
                rect: outer.getBoundingClientRect(),
              })
            },
          })
        },
        onDragStart() {
          setState({ type: "is-dragging" })
        },
        onDrop() {
          setState(areaIdle)
        },
      }),
      // Drop target for reordering areas
      dropTargetForElements({
        element: outer,
        canDrop: ({ source }) => isAreaHeaderData(source.data),
        getData({ input }) {
          return attachClosestEdge(getAreaHeaderDropData(area.id), {
            element: outer,
            input,
            allowedEdges: ["top", "bottom"],
          })
        },
        onDragEnter({ source, self }) {
          if (!isAreaHeaderData(source.data)) return
          if (source.data.areaId === area.id) return

          const edge = extractClosestEdge(self.data)
          if (!edge) return

          setState({
            type: "is-over",
            rect: source.data.rect,
            edge,
          })
        },
        onDrag({ source, self }) {
          if (!isAreaHeaderData(source.data)) return
          if (source.data.areaId === area.id) return

          const edge = extractClosestEdge(self.data)
          if (!edge) return

          const current = state()
          if (current.type === "is-over" && current.edge === edge) return

          setState({
            type: "is-over",
            rect: source.data.rect,
            edge,
          })
        },
        onDragLeave({ source }) {
          if (!isAreaHeaderData(source.data)) return
          setState(areaIdle)
        },
        onDrop() {
          setState(areaIdle)
        },
      }),
      // Drop target for tasks on area header
      dropTargetForElements({
        element: header,
        canDrop: ({ source }) => isTaskData(source.data),
        onDragEnter({ source }) {
          if (isTaskData(source.data)) {
            setState({ type: "task-over" })
          }
        },
        onDragLeave() {
          const current = state()
          if (current.type === "task-over") {
            setState(areaIdle)
          }
        },
        onDrop({ source }) {
          if (isTaskData(source.data) && props.onAreaTaskDrop) {
            props.onAreaTaskDrop(source.data.taskId, area.id)
          }
          setState(areaIdle)
        },
      }),
    )

    onCleanup(cleanup)
  })

  const outerClass = () => {
    const s = state()
    if (s.type === "is-dragging" || s.type === "preview") return "opacity-0"
    return "flex-shrink-0 mb-4"
  }

  return (
    <>
      <div ref={outerRef} class={outerClass()}>
        <Show when={state().type === "is-over" && (state() as { edge: Edge }).edge === "top"}>
          <AreaShadow height={(state() as { rect: DOMRect }).rect.height} />
        </Show>

        <div>
          <div
            ref={headerRef}
            class={cn(
              "flex items-center justify-between mx-2 px-2 py-1.5 rounded-md group cursor-grab hover:bg-sidebar-accent",
              isActive() && "bg-sidebar-accent",
              state().type === "task-over" && "bg-sidebar-accent ring-2 ring-things-blue ring-inset",
            )}
          >
            <AreaHeader area={props.area} onLinkClick={props.onLinkClick} />
          </div>
          <div>
            <Show when={props.projects.length > 0} fallback={<EmptyDropZone areaId={props.area.id} />}>
              <For each={props.projects}>
                {(project) => (
                  <ProjectItem
                    project={project}
                    areaId={props.area.id}
                    progress={props.projectProgress().get(project.id) ?? 0}
                    onTaskDrop={props.onTaskDrop}
                    onLinkClick={props.onLinkClick}
                  />
                )}
              </For>
            </Show>
          </div>
        </div>

        <Show when={state().type === "is-over" && (state() as { edge: Edge }).edge === "bottom"}>
          <AreaShadow height={(state() as { rect: DOMRect }).rect.height} />
        </Show>
      </div>

      <Show when={state().type === "preview"}>
        <Portal mount={(state() as { container: HTMLElement }).container}>
          <AreaPreview area={props.area} />
        </Portal>
      </Show>
    </>
  )
}

// Main draggable sidebar list
export function DraggableSidebarList(props: {
  projectsWithoutArea: ProjectInfo[]
  areasWithProjects: Array<AreaInfo & { projects: ProjectInfo[] }>
  projectProgress: Accessor<Map<string, number>>
  onReorderProjects: (projectIds: string[], areaId: string | null) => void
  onReorderAreas: (areaIds: string[]) => void
  onTaskDrop?: (taskId: string, projectId: string, areaId: string | undefined) => void
  onAreaTaskDrop?: (taskId: string, areaId: string) => void
  onLinkClick?: () => void
}) {
  // Monitor for all drag operations and handle the drops
  createEffect(() => {
    const cleanup = monitorForElements({
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceData = source.data
        const targetData = target.data

        // Handle project drops
        if (isProjectData(sourceData)) {
          const draggedProjectId = sourceData.projectId
          const sourceAreaId = sourceData.areaId

          // Drop on empty area zone
          if (isEmptyAreaDropData(targetData)) {
            const targetAreaId = targetData.areaId ?? null

            // Get existing projects in target area and add the dragged project
            const existingProjects =
              targetAreaId === null
                ? props.projectsWithoutArea
                : (props.areasWithProjects.find((a) => a.id === targetAreaId)?.projects ?? [])

            const projectIds = [...existingProjects.map((p) => p.id), draggedProjectId]

            props.onReorderProjects(projectIds, targetAreaId)
            return
          }

          // Drop on another project
          if (isProjectDropData(targetData)) {
            const targetProjectId = targetData.projectId
            const targetAreaId = targetData.areaId ?? null

            const edge = extractClosestEdge(targetData)
            if (!edge) return

            // Get projects in target area
            const projectsInArea =
              targetAreaId === null
                ? props.projectsWithoutArea
                : (props.areasWithProjects.find((a) => a.id === targetAreaId)?.projects ?? [])

            const draggedIndex = projectsInArea.findIndex((p) => p.id === draggedProjectId)
            const targetIndex = projectsInArea.findIndex((p) => p.id === targetProjectId)

            if (targetIndex === -1) return

            // If dragged from same area, reorder
            if (sourceAreaId === targetAreaId && draggedIndex !== -1) {
              const reordered = reorderWithEdge({
                list: projectsInArea,
                startIndex: draggedIndex,
                indexOfTarget: targetIndex,
                closestEdgeOfTarget: edge,
                axis: "vertical",
              })
              props.onReorderProjects(
                reordered.map((p) => p.id),
                targetAreaId,
              )
            } else {
              // Moving from different area
              const rawIndex = edge === "top" ? targetIndex : targetIndex + 1
              const filtered = projectsInArea.filter((p) => p.id !== draggedProjectId)
              const reordered = [...filtered]
              reordered.splice(rawIndex, 0, {
                id: draggedProjectId,
              } as ProjectInfo)
              props.onReorderProjects(
                reordered.map((p) => p.id),
                targetAreaId,
              )
            }
            return
          }
        }

        // Handle area header drops (reordering areas)
        if (isAreaHeaderData(sourceData) && isAreaHeaderDropData(targetData)) {
          const draggedAreaId = sourceData.areaId
          const targetAreaId = targetData.areaId

          if (draggedAreaId === targetAreaId) return

          const edge = extractClosestEdge(targetData)
          if (!edge) return

          const areas = props.areasWithProjects
          const draggedIndex = areas.findIndex((a) => a.id === draggedAreaId)
          const targetIndex = areas.findIndex((a) => a.id === targetAreaId)

          if (draggedIndex === -1 || targetIndex === -1) return

          const reordered = reorderWithEdge({
            list: areas,
            startIndex: draggedIndex,
            indexOfTarget: targetIndex,
            closestEdgeOfTarget: edge,
            axis: "vertical",
          })
          props.onReorderAreas(reordered.map((a) => a.id))
        }
      },
    })

    onCleanup(cleanup)
  })

  return (
    <div class="flex flex-col">
      {/* Projects without area */}
      <Show when={props.projectsWithoutArea.length > 0} fallback={<EmptyDropZone areaId={undefined} />}>
        <div class="mb-4">
          <For each={props.projectsWithoutArea}>
            {(project) => (
              <ProjectItem
                project={project}
                areaId={undefined}
                progress={props.projectProgress().get(project.id) ?? 0}
                onTaskDrop={props.onTaskDrop}
                onLinkClick={props.onLinkClick}
              />
            )}
          </For>
        </div>
      </Show>

      {/* Areas with projects */}
      <For each={props.areasWithProjects}>
        {(area) => (
          <AreaItem
            area={area}
            projects={area.projects}
            projectProgress={props.projectProgress}
            onTaskDrop={props.onTaskDrop}
            onAreaTaskDrop={props.onAreaTaskDrop}
            onLinkClick={props.onLinkClick}
          />
        )}
      </For>
    </div>
  )
}
