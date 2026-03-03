import {
  Archive as ArchiveIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  SeparatorHorizontal as SeparatorHorizontalIcon,
} from "lucide-solid"
import type { ParentProps } from "solid-js"
import { CalendarIcon, MoveIcon } from "@/components/icons"
import { SidebarTrigger } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/app"
import { cn } from "@/lib/utils"

const toolbarButtonClass = cn(
  "flex items-center justify-center px-4 py-1 min-w-[100px] rounded-full [&_svg]:size-5 md:[&_svg]:size-4",
  "text-toolbar-icon border border-transparent hover:border-toolbar-border hover:bg-transparent hover:text-toolbar-icon transition-colors",
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
      <PlusIcon class="w-6 h-6 md:w-4 md:h-4" />
    </Button>
  )
}

type SetDateButtonProps = {
  onClick?: () => void
}

export function SetDateButton(props: SetDateButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass} disabled={!props.onClick}>
      <CalendarIcon class="w-6 h-6 md:w-4 md:h-4" />
    </Button>
  )
}

type MoveTaskButtonProps = {
  onClick?: () => void
}

export function MoveTaskButton(props: MoveTaskButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass} disabled={!props.onClick}>
      <MoveIcon class="w-6 h-6 md:w-5 md:h-5" />
    </Button>
  )
}

type SearchButtonProps = {
  onClick?: () => void
}

export function SearchButton(props: SearchButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass} disabled={!props.onClick}>
      <SearchIcon class="w-6 h-6 md:w-4 md:h-4" />
    </Button>
  )
}

type AddHeadingButtonProps = {
  onClick: () => void
}

export function AddHeadingButton(props: AddHeadingButtonProps) {
  return (
    <Button variant="ghost" onClick={props.onClick} class={toolbarButtonClass}>
      <SeparatorHorizontalIcon class="w-6 h-6 md:w-4 md:h-4" />
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
      <ArchiveIcon class="w-6 h-6 md:w-4 md:h-4" />
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
