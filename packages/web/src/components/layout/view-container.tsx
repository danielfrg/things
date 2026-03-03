import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"
import { SyncStatus } from "@/components/sync-status"
import { EditableText } from "@/components/ui/editable-text"

type ViewContainerProps = ParentProps<{
  title: string
  icon?: JSX.Element
  toolbar?: JSX.Element
  headerExtra?: JSX.Element
  /** Actions to show next to the title (e.g., dropdown menu) */
  titleActions?: JSX.Element
  onTitleChange?: (title: string) => void
}>

export function ViewContainer(props: ViewContainerProps) {
  return (
    <div class="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Mobile floating sync status */}
      <div class="md:hidden fixed top-3 right-3 z-30">
        <SyncStatus />
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <header class="flex flex-col justify-between px-0 md:px-20 pt-12 pb-8">
          <div class="flex items-center gap-3 px-4 md:px-2 flex-1 min-w-0 group/header">
            <Show when={props.icon}>
              <div class="shrink-0">{props.icon}</div>
            </Show>
            <div class="flex items-center gap-1 min-w-0">
              <Show
                when={props.onTitleChange}
                fallback={<h1 class="text-2xl font-bold text-foreground leading-none">{props.title}</h1>}
              >
                <EditableText
                  value={props.title}
                  onChange={props.onTitleChange!}
                  placeholder="Title"
                  class="text-2xl font-bold text-foreground leading-none"
                  autoSize
                />
              </Show>
              <Show when={props.titleActions}>
                <div class="opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0">
                  {props.titleActions}
                </div>
              </Show>
            </div>
          </div>
          {/* Optional extra header content (e.g., project notes) */}
          <Show when={props.headerExtra}>
            <div class="mt-2 mb-2 mx-2 max-h-32 overflow-y-auto">{props.headerExtra}</div>
          </Show>
        </header>

        {/* Main content */}
        <div class="px-0 md:px-18 pb-6">{props.children}</div>
      </div>

      {/* Bottom toolbar */}
      <div class="flex-shrink-0 border-t border-sidebar-border bg-background min-h-[44px] flex items-center justify-center relative pb-[env(safe-area-inset-bottom)]">
        {props.toolbar}
        <div class="hidden md:block absolute right-6">
          <SyncStatus />
        </div>
      </div>
    </div>
  )
}
