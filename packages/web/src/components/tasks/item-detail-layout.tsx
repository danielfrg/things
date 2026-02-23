import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type ItemDetailLayoutProps = ParentProps<{
  expanded: boolean
  header: JSX.Element
  /** Left side: active indicators (scheduled date, deadline, etc.) */
  toolbar: JSX.Element
  toolbarPrefix?: JSX.Element
  /** Right side: icon-only action buttons + info/delete */
  actions: JSX.Element
  cardRef?: (el: HTMLDivElement) => void
  outerRef?: (el: HTMLDivElement) => void
  dataAttribute?: string
  outerClass?: string
  onDoubleClick?: (e: MouseEvent) => void
}>

export function ItemDetailLayout(props: ItemDetailLayoutProps) {
  const dataAttr = () => ({
    [props.dataAttribute ?? "data-detail-card"]: true,
  })

  return (
    <Collapsible open={props.expanded}>
      <div
        ref={props.outerRef}
        class={cn("mx-0 transition-all duration-300 ease-in-out", props.expanded && "my-3", props.outerClass)}
      >
        <div
          ref={props.cardRef}
          {...dataAttr()}
          class={cn(
            "md:rounded-xl transition-all duration-300 ease-in-out",
            props.expanded
              ? "border-y md:border border-border dark:border-transparent shadow-sm bg-card-expanded"
              : "border border-transparent select-none",
          )}
          onDblClick={props.onDoubleClick}
        >
          {props.header}

          {/* Expandable drawer content */}
          <CollapsibleContent class="overflow-hidden">
            <div class="px-4 pb-4 pl-[38px] space-y-3">
              {props.children}

              {/* Footer - toolbar */}
              <div class={cn("pt-2", props.toolbarPrefix ? "flex flex-col gap-2" : "")}>
                <Show when={props.toolbarPrefix}>{props.toolbarPrefix}</Show>
                <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div class="flex items-center gap-2 md:gap-1 flex-wrap">{props.toolbar}</div>
                  <div class="flex items-center gap-1 md:gap-0.5 shrink-0 flex-wrap">{props.actions}</div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  )
}
