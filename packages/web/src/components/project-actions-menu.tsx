import { CheckIcon, MoreHorizontalIcon, Trash2Icon } from "@/components/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ProjectActionsMenuProps = {
  onComplete: () => void
  onDelete: () => void
}

export function ProjectActionsMenu(props: ProjectActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger class="p-1 hover:bg-muted rounded transition-colors">
        <MoreHorizontalIcon class="w-4 h-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={props.onComplete}>
          <CheckIcon class="w-4 h-4" />
          <span>Complete Project</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={props.onDelete} class="text-destructive focus:text-destructive">
          <Trash2Icon class="w-4 h-4" />
          <span>Delete Project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
