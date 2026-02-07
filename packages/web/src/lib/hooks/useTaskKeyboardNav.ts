import { type Accessor, createEffect, onCleanup } from "solid-js"
import type { TaskInfo } from "@/context/data"

interface UseTaskKeyboardNavOptions {
  tasks: Accessor<TaskInfo[]>
  selectedTaskId: Accessor<string | null>
  expandedTaskId: Accessor<string | null>
  onSelect: (taskId: string | null) => void
  onExpand: (taskId: string) => void
  enabled?: Accessor<boolean>
}

export function useTaskKeyboardNav(options: UseTaskKeyboardNavOptions) {
  const enabled = options.enabled ?? (() => true)

  createEffect(() => {
    if (!enabled()) return

    const handler = (e: KeyboardEvent) => {
      // Don't handle if typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      // Don't handle if a modal/dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return
      }

      // Don't handle if task details are expanded
      if (options.expandedTaskId()) {
        return
      }

      const tasks = options.tasks()
      if (tasks.length === 0) return

      const selectedId = options.selectedTaskId()
      const currentIndex = selectedId ? tasks.findIndex((t) => t.id === selectedId) : -1

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault()
          if (currentIndex === -1) {
            // Nothing selected, select first
            options.onSelect(tasks[0].id)
          } else if (currentIndex < tasks.length - 1) {
            // Select next
            options.onSelect(tasks[currentIndex + 1].id)
          }
          break
        }

        case "ArrowUp":
        case "k": {
          e.preventDefault()
          if (currentIndex === -1) {
            // Nothing selected, select last
            options.onSelect(tasks[tasks.length - 1].id)
          } else if (currentIndex > 0) {
            // Select previous
            options.onSelect(tasks[currentIndex - 1].id)
          }
          break
        }

        case "Enter": {
          if (selectedId) {
            e.preventDefault()
            options.onExpand(selectedId)
          }
          break
        }

        case "Escape": {
          if (selectedId) {
            e.preventDefault()
            options.onSelect(null)
          }
          break
        }
      }
    }

    document.addEventListener("keydown", handler)
    onCleanup(() => document.removeEventListener("keydown", handler))
  })
}
