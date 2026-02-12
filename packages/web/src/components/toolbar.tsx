import type { ParentProps } from "solid-js"
import { ArchiveIcon, PlusIcon, SearchIcon, SeparatorHorizontalIcon } from "@/components/icons"
import { SidebarTrigger } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/app"
import { cn } from "@/lib/utils"

const toolbarButtonClass = cn(
  "flex items-center justify-center gap-1.5 px-4 py-1 min-w-[100px] text-[13px] font-medium rounded-full",
  "text-muted-foreground border border-transparent hover:border-border transition-colors",
)

type NewTaskButtonProps = {
  onClick?: () => void
}

export function NewTaskButton(props: NewTaskButtonProps) {
  const app = useApp()

  const handleClick = () => {
    if (props.onClick) {
      props.onClick()
    } else {
      app.openTaskInput()
    }
  }

  return (
    <Button variant="ghost" onClick={handleClick} class={toolbarButtonClass}>
      <PlusIcon class="w-4 h-4" />
      <span class="hidden md:inline">New To-Do</span>
    </Button>
  )
}

type SearchButtonProps = {
  onClick?: () => void
}

export function SearchButton(props: SearchButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass} disabled={!props.onClick}>
      <SearchIcon class="w-4 h-4" />
      <span class="hidden md:inline">Search</span>
    </Button>
  )
}

type AddHeadingButtonProps = {
  onClick: () => void
}

export function AddHeadingButton(props: AddHeadingButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass}>
      <SeparatorHorizontalIcon class="w-4 h-4" />
      <span class="hidden md:inline">Add Heading</span>
    </Button>
  )
}

type LogCompletedButtonProps = {
  onClick: () => void
  disabled?: boolean
}

export function LogCompletedButton(props: LogCompletedButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass} disabled={props.disabled}>
      <ArchiveIcon class="w-4 h-4" />
      <span class="hidden md:inline">Log Completed</span>
    </Button>
  )
}

export function ViewToolbar(props: ParentProps) {
  return (
    <div class="flex items-center gap-2">
      <SidebarTrigger />
      {props.children}
    </div>
  )
}
