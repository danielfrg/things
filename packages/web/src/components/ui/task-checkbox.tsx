import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { cn } from "@/lib/utils"

type TaskCheckboxProps = {
  class?: string
  checked?: boolean
  cancelled?: boolean
  dashed?: boolean
  onChange?: (checked: boolean) => void
  onCancel?: () => void
  onUncancel?: () => void
  disabled?: boolean
}

function TaskCheckbox(props: TaskCheckboxProps) {
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (e) => {
    e.stopPropagation()
    
    // If cancelled, clicking uncancels it
    if (props.cancelled) {
      props.onUncancel?.()
      return
    }
    
    // Option+Click to cancel (only for non-completed, non-cancelled tasks)
    if (e.altKey && props.onCancel && !props.checked) {
      props.onCancel()
      return
    }
    
    // Normal click toggles completion
    props.onChange?.(!props.checked)
  }

  const isCheckedOrCancelled = () => props.checked || props.cancelled

  return (
    <button
      type="button"
      disabled={props.disabled}
      data-checked={isCheckedOrCancelled() ? "" : undefined}
      onClick={handleClick}
      class={cn(
        "w-[18px] h-[18px] rounded border border-solid flex items-center justify-center transition-all duration-100 shrink-0 outline-none",
        "active:scale-110",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isCheckedOrCancelled()
          ? "bg-things-blue border-things-blue text-white"
          : "border-muted-foreground/50 hover:border-things-blue/60",
        props.dashed && !isCheckedOrCancelled() && "border-dashed",
        props.class,
      )}
    >
      <Show when={props.checked && !props.cancelled}>
        <svg
          class="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-label="Completed"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </Show>
      <Show when={props.cancelled}>
        <svg
          class="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-label="Cancelled"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </Show>
    </button>
  )
}

export { TaskCheckbox }
export type { TaskCheckboxProps }
