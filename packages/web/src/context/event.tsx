import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { createEffect, createSignal, onCleanup } from "solid-js"
import { createSimpleContext } from "./context"
import type { TaskInfo, TemplateInfo } from "./data"
import { useSDK } from "./sdk"
import type { AreaInfo, ProjectInfo, TagInfo } from "./sidebar"

export type HeadingInfo = {
  id: string
  title: string
  position: number
  isBacklog: boolean
  projectId: string
}

export type TasksReorderedInfo = {
  contextType: string
  contextId: string | null
  taskIds: string[]
}

export type TaskMovedInfo = {
  task: TaskInfo
  fromSectionId: string
  toSectionId: string
  newTaskIds: string[]
}

export const { use: useEvent, provider: EventProvider } = createSimpleContext({
  name: "Event",
  init: () => {
    const sdk = useSDK()
    let abort: AbortController | null = null
    const [connected, setConnected] = createSignal(false)

    // Create typed emitter
    const emitter = createGlobalEmitter<{
      "server.connected": Record<string, unknown>
      "server.reconnected": Record<string, unknown>
      "server.heartbeat": Record<string, unknown>
      "task.created": TaskInfo
      "task.updated": TaskInfo
      "task.deleted": { id: string }
      "tasks.reordered": TasksReorderedInfo
      "task.moved": TaskMovedInfo
      "project.created": ProjectInfo
      "project.updated": ProjectInfo
      "project.deleted": { id: string }
      "area.created": AreaInfo
      "area.updated": AreaInfo
      "area.deleted": { id: string }
      "heading.created": HeadingInfo
      "heading.updated": HeadingInfo
      "heading.deleted": { id: string; projectId: string }
      "tag.created": TagInfo
      "tag.updated": TagInfo
      "tag.deleted": { id: string }
      "repeatingRule.created": TemplateInfo
      "repeatingRule.updated": TemplateInfo
      "repeatingRule.deleted": { id: string }
    }>()

    const dispatch = (event: { type: string; properties: unknown }) => {
      const handlers: Record<string, () => void> = {
        "server.connected": () => emitter.emit("server.connected", event.properties as Record<string, unknown>),
        "server.heartbeat": () => emitter.emit("server.heartbeat", event.properties as Record<string, unknown>),
        "task.created": () => emitter.emit("task.created", event.properties as TaskInfo),
        "task.updated": () => emitter.emit("task.updated", event.properties as TaskInfo),
        "task.deleted": () => emitter.emit("task.deleted", event.properties as { id: string }),
        "tasks.reordered": () => emitter.emit("tasks.reordered", event.properties as TasksReorderedInfo),
        "task.moved": () => emitter.emit("task.moved", event.properties as TaskMovedInfo),
        "project.created": () => emitter.emit("project.created", event.properties as ProjectInfo),
        "project.updated": () => emitter.emit("project.updated", event.properties as ProjectInfo),
        "project.deleted": () => emitter.emit("project.deleted", event.properties as { id: string }),
        "area.created": () => emitter.emit("area.created", event.properties as AreaInfo),
        "area.updated": () => emitter.emit("area.updated", event.properties as AreaInfo),
        "area.deleted": () => emitter.emit("area.deleted", event.properties as { id: string }),
        "heading.created": () => emitter.emit("heading.created", event.properties as HeadingInfo),
        "heading.updated": () => emitter.emit("heading.updated", event.properties as HeadingInfo),
        "heading.deleted": () => emitter.emit("heading.deleted", event.properties as { id: string; projectId: string }),
        "tag.created": () => emitter.emit("tag.created", event.properties as TagInfo),
        "tag.updated": () => emitter.emit("tag.updated", event.properties as TagInfo),
        "tag.deleted": () => emitter.emit("tag.deleted", event.properties as { id: string }),
        "repeatingRule.created": () => emitter.emit("repeatingRule.created", event.properties as TemplateInfo),
        "repeatingRule.updated": () => emitter.emit("repeatingRule.updated", event.properties as TemplateInfo),
        "repeatingRule.deleted": () => emitter.emit("repeatingRule.deleted", event.properties as { id: string }),
      }
      handlers[event.type]?.()
    }

    // Connect to SSE when authenticated, with automatic reconnection
    createEffect(() => {
      if (!sdk.isReady) return

      // Abort any existing connection
      if (abort) {
        abort.abort()
      }
      abort = new AbortController()
      setConnected(false)

      const BASE_DELAY = 1000
      const MAX_DELAY = 30000
      let reconnect = false

      void (async () => {
        let delay = BASE_DELAY

        while (true) {
          if (abort!.signal.aborted) return

          try {
            const response = await fetch(`${sdk.baseUrl}/api/v1/event`, {
              headers: {
                Accept: "text/event-stream",
              },
              credentials: "include",
              signal: abort!.signal,
            })

            if (!response.ok) {
              setConnected(false)
              await new Promise((r) => setTimeout(r, delay))
              delay = Math.min(delay * 2, MAX_DELAY)
              continue
            }

            setConnected(true)
            delay = BASE_DELAY

            // Signal reconnection so consumers can refetch stale data
            if (reconnect) {
              emitter.emit("server.reconnected", {})
            }
            reconnect = true

            const reader = response.body?.getReader()
            if (!reader) {
              setConnected(false)
              continue
            }

            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                setConnected(false)
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() ?? ""

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue
                try {
                  dispatch(JSON.parse(line.slice(6)) as { type: string; properties: unknown })
                } catch {
                  // Ignore parse errors
                }
              }
            }

            // Stream ended, wait before reconnecting
            await new Promise((r) => setTimeout(r, delay))
            delay = Math.min(delay * 2, MAX_DELAY)
          } catch (e) {
            setConnected(false)
            if (abort && abort.signal.aborted) return
            console.error("[SSE] connection error:", e)
            await new Promise((r) => setTimeout(r, delay))
            delay = Math.min(delay * 2, MAX_DELAY)
          }
        }
      })()
    })

    onCleanup(() => {
      if (abort) {
        abort.abort()
      }
    })

    return {
      emitter,
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      get connected() {
        return connected()
      },
    }
  },
})
