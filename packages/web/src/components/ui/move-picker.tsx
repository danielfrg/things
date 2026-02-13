import { createMemo, For, Show } from "solid-js"
import { BoxIcon, CheckIcon, FolderOpenIcon, InboxIcon, XIcon } from "@/components/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProjectProgressIcon } from "@/components/ui/project-progress-icon"
import { cn } from "@/lib/utils"

// MovePickerContent uses BoxIcon, ProjectProgressIcon, etc. for the popover items

type Project = {
  id: string
  title: string
  areaId?: string | null
}

type Area = {
  id: string
  title: string
}

type MovePickerContentProps = {
  /** Current listId value (project ID or area ID) */
  listId?: string | null
  /** Callback when selection changes - returns new listId (project/area ID) or null for inbox/no-project */
  onChangeListId: (listId: string | null, moveToInbox?: boolean) => void
  projects: Project[]
  areas?: Area[]
  isInbox?: boolean
  title?: string
  onClose?: () => void
}

export function MovePickerContent(props: MovePickerContentProps) {
  // Determine if a project is selected
  const selectedProject = createMemo(() => props.projects.find((p) => p.id === props.listId))

  // Determine if an area is selected (listId is an area, not a project)
  const selectedArea = createMemo(() => {
    if (selectedProject()) return undefined
    return (props.areas ?? []).find((a) => a.id === props.listId)
  })

  const handleSelectProject = (projectId: string) => {
    props.onChangeListId(projectId, false)
    props.onClose?.()
  }

  const handleSelectArea = (areaId: string) => {
    props.onChangeListId(areaId, false)
    props.onClose?.()
  }

  const handleSelectInbox = () => {
    props.onChangeListId(null, true)
    props.onClose?.()
  }

  const handleSelectNoProject = () => {
    props.onChangeListId(null, false)
    props.onClose?.()
  }

  const projectsWithoutArea = createMemo(() => props.projects.filter((p) => !p.areaId))

  const areasWithProjects = createMemo(() =>
    (props.areas ?? []).map((area) => ({
      ...area,
      projects: props.projects.filter((p) => p.areaId === area.id),
    })),
  )

  const title = () => props.title ?? "Move"

  return (
    <div class="w-[260px] rounded-xl bg-popover-dark border border-popover-dark-border overflow-hidden">
      {/* Header with title */}
      <div class="flex items-center justify-center relative px-3 pt-3 pb-2">
        <h3 class="text-sm font-semibold text-popover-dark-foreground">{title()}</h3>
      </div>

      <div class="max-h-80 overflow-y-auto overscroll-contain pb-2">
        <button
          type="button"
          onClick={handleSelectInbox}
          class={cn(
            "flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-bold text-white",
            "hover:bg-popover-dark-accent transition-colors focus-visible:outline-none",
          )}
        >
          <InboxIcon class="w-4 h-4 text-popover-dark-muted" />
          <span class="flex-1 text-left">Inbox</span>
          <Show when={props.isInbox}>
            <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
          </Show>
        </button>

        <button
          type="button"
          onClick={handleSelectNoProject}
          class={cn(
            "flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-bold text-white",
            "hover:bg-popover-dark-accent transition-colors focus-visible:outline-none",
          )}
        >
          <XIcon class="w-4 h-4 text-popover-dark-muted" />
          <span class="flex-1 text-left">No Project</span>
          <Show when={!props.listId && !props.isInbox}>
            <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
          </Show>
        </button>

        <div class="my-1 border-t border-popover-dark-border" />

        <Show when={projectsWithoutArea().length > 0}>
          <For each={projectsWithoutArea()}>
            {(project) => (
              <button
                type="button"
                onClick={() => handleSelectProject(project.id)}
                class={cn(
                  "flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-semibold text-white",
                  "hover:bg-popover-dark-accent transition-colors focus-visible:outline-none",
                )}
              >
                <ProjectProgressIcon progress={0} size={14} class="text-popover-dark-selected" />
                <span class="flex-1 text-left truncate">{project.title}</span>
                <Show when={props.listId === project.id}>
                  <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
                </Show>
              </button>
            )}
          </For>
        </Show>

        <For each={areasWithProjects()}>
          {(area, index) => (
            <>
              <Show when={index() > 0 || projectsWithoutArea().length > 0}>
                <div class="my-1 border-t border-popover-dark-border" />
              </Show>

              <button
                type="button"
                onClick={() => handleSelectArea(area.id)}
                class={cn(
                  "flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-extrabold text-white",
                  "hover:bg-popover-dark-accent transition-colors focus-visible:outline-none",
                )}
              >
                <BoxIcon class="w-[14px] h-[14px] text-things-green" />
                <span class="flex-1 text-left truncate">{area.title}</span>
                <Show when={selectedArea()?.id === area.id}>
                  <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
                </Show>
              </button>

              <For each={area.projects}>
                {(project) => (
                  <button
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    class={cn(
                      "flex items-center gap-2 w-full h-[30px] px-3 text-[14px] font-semibold text-white",
                      "hover:bg-popover-dark-accent transition-colors focus-visible:outline-none",
                    )}
                  >
                    <ProjectProgressIcon progress={0} size={14} class="text-popover-dark-selected" />
                    <span class="flex-1 text-left truncate">{project.title}</span>
                    <Show when={props.listId === project.id}>
                      <CheckIcon class="w-4 h-4 text-popover-dark-selected" />
                    </Show>
                  </button>
                )}
              </For>
            </>
          )}
        </For>
      </div>
    </div>
  )
}

type MovePickerProps = {
  /** Current listId (project or area ID). */
  listId?: string | null
  /** Callback when selection changes. Returns listId (project/area) or null. */
  onChangeListId?: (listId: string | null, moveToInbox?: boolean) => void
  projects: Project[]
  areas?: Area[]
  placeholder?: string
  disabled?: boolean
  class?: string
  isInbox?: boolean
}

export function MovePicker(props: MovePickerProps) {
  const handleChange = (listId: string | null, moveToInbox?: boolean) => {
    props.onChangeListId?.(listId, moveToInbox)
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={props.disabled}
        class={cn(
          "inline-flex items-center justify-center h-6 w-6 rounded text-[12px] transition-colors",
          "text-toolbar-icon border border-transparent hover:border-toolbar-border",
          "disabled:cursor-not-allowed disabled:opacity-50",
          props.class,
        )}
      >
        <FolderOpenIcon class="h-3.5 w-3.5" />
      </PopoverTrigger>

      <PopoverContent class="w-auto p-0 bg-transparent border-0 shadow-xl">
        <MovePickerContent
          listId={props.listId}
          onChangeListId={handleChange}
          projects={props.projects}
          areas={props.areas}
          isInbox={props.isInbox}
        />
      </PopoverContent>
    </Popover>
  )
}
