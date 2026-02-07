import { MoreHorizontalIcon, Trash2Icon } from "@/components/icons"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type AreaActionsMenuProps = {
  onDelete: () => void
}

export function AreaActionsMenu(props: AreaActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger class="p-1 hover:bg-muted rounded transition-colors">
        <MoreHorizontalIcon class="w-4 h-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={props.onDelete} class="text-destructive focus:text-destructive">
          <Trash2Icon class="w-4 h-4" />
          <span>Delete Area</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
