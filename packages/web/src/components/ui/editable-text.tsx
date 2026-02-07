import { createEffect, createSignal, type JSX } from "solid-js"
import { cn } from "@/lib/utils"

type EditableTextProps = {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  class?: string
  ref?: (el: HTMLInputElement) => void
  /** Auto-size input to fit content */
  autoSize?: boolean
}

export function EditableText(props: EditableTextProps) {
  let inputRef: HTMLInputElement | undefined
  let measureRef: HTMLSpanElement | undefined
  const [inputWidth, setInputWidth] = createSignal<number | undefined>(undefined)

  const updateWidth = () => {
    if (props.autoSize && measureRef) {
      // Add some padding for the cursor
      setInputWidth(measureRef.offsetWidth + 4)
    }
  }

  createEffect(() => {
    // Re-measure when value changes
    props.value
    updateWidth()
  })

  const handleBlur: JSX.EventHandler<HTMLInputElement, FocusEvent> = (e) => {
    const trimmed = e.currentTarget.value.trim()
    if (trimmed !== props.value) {
      props.onChange(trimmed)
    }
  }

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
      props.onEnter?.()
    } else if (e.key === "Escape") {
      e.currentTarget.value = props.value
      e.currentTarget.blur()
    }
  }

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = () => {
    if (props.autoSize && measureRef && inputRef) {
      measureRef.textContent = inputRef.value || props.placeholder || ""
      updateWidth()
    }
  }

  return (
    <div class={cn("relative", props.autoSize ? "inline-block" : "w-full")}>
      {/* Hidden span to measure text width */}
      {props.autoSize && (
        <span
          ref={measureRef}
          class={cn(
            "invisible absolute whitespace-pre",
            props.class,
          )}
          aria-hidden="true"
        >
          {props.value || props.placeholder}
        </span>
      )}
      <input
        ref={(el) => {
          inputRef = el
          props.ref?.(el)
        }}
        type="text"
        value={props.value}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={props.placeholder}
        style={props.autoSize && inputWidth() ? { width: `${inputWidth()}px` } : undefined}
        class={cn(
          "min-w-0 bg-transparent border-0 p-0 outline-none",
          props.autoSize ? "w-auto" : "w-full",
          "placeholder:text-muted-foreground caret-things-blue",
          props.class,
        )}
      />
    </div>
  )
}
