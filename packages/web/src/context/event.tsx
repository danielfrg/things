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

    // Connect to SSE when authenticated
    createEffect(() => {
      if (!sdk.isReady) return

      // Abort any existing connection
      if (abort) {
        abort.abort()
      }
      abort = new AbortController()
      setConnected(false)

      void (async () => {
        try {
          const response = await fetch(`${sdk.baseUrl}/api/v1/event`, {
            headers: {
              Accept: "text/event-stream",
            },
            credentials: "include", // Send session cookies
            signal: abort!.signal,
          })

          if (!response.ok) {
            setConnected(false)
            return
          }

          setConnected(true)
          const reader = response.body?.getReader()
          if (!reader) return

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
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                try {
                  const event = JSON.parse(data) as {
                    type: string
                    properties: unknown
                  }
                  if (event.type === "server.connected") {
                    emitter.emit("server.connected", event.properties as Record<string, unknown>)
                  } else if (event.type === "server.heartbeat") {
                    emitter.emit("server.heartbeat", event.properties as Record<string, unknown>)
                  } else if (event.type === "task.created") {
                    emitter.emit("task.created", event.properties as TaskInfo)
                  } else if (event.type === "task.updated") {
                    emitter.emit("task.updated", event.properties as TaskInfo)
                  } else if (event.type === "task.deleted") {
                    emitter.emit("task.deleted", event.properties as { id: string })
                  } else if (event.type === "tasks.reordered") {
                    emitter.emit("tasks.reordered", event.properties as TasksReorderedInfo)
                  } else if (event.type === "task.moved") {
                    emitter.emit("task.moved", event.properties as TaskMovedInfo)
                  } else if (event.type === "project.created") {
                    emitter.emit("project.created", event.properties as ProjectInfo)
                  } else if (event.type === "project.updated") {
                    emitter.emit("project.updated", event.properties as ProjectInfo)
                  } else if (event.type === "project.deleted") {
                    emitter.emit("project.deleted", event.properties as { id: string })
                  } else if (event.type === "area.created") {
                    emitter.emit("area.created", event.properties as AreaInfo)
                  } else if (event.type === "area.updated") {
                    emitter.emit("area.updated", event.properties as AreaInfo)
                  } else if (event.type === "area.deleted") {
                    emitter.emit("area.deleted", event.properties as { id: string })
                  } else if (event.type === "heading.created") {
                    emitter.emit("heading.created", event.properties as HeadingInfo)
                  } else if (event.type === "heading.updated") {
                    emitter.emit("heading.updated", event.properties as HeadingInfo)
                  } else if (event.type === "heading.deleted") {
                    emitter.emit("heading.deleted", event.properties as { id: string; projectId: string })
                  } else if (event.type === "tag.created") {
                    emitter.emit("tag.created", event.properties as TagInfo)
                  } else if (event.type === "tag.updated") {
                    emitter.emit("tag.updated", event.properties as TagInfo)
                  } else if (event.type === "tag.deleted") {
                    emitter.emit("tag.deleted", event.properties as { id: string })
                  } else if (event.type === "repeatingRule.created") {
                    emitter.emit("repeatingRule.created", event.properties as TemplateInfo)
                  } else if (event.type === "repeatingRule.updated") {
                    emitter.emit("repeatingRule.updated", event.properties as TemplateInfo)
                  } else if (event.type === "repeatingRule.deleted") {
                    emitter.emit("repeatingRule.deleted", event.properties as { id: string })
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (e) {
          setConnected(false)
          if (abort && !abort.signal.aborted) {
            console.error("[SSE] connection error:", e)
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
