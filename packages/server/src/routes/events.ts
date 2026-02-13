import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { describeRoute, resolver } from "hono-openapi"
import { Bus, Event } from "../bus"
import type { AuthContext } from "../middleware/auth"

export function EventRoutes() {
  return new Hono<AuthContext>().get(
    "/",
    describeRoute({
      tags: ["Events"],
      summary: "Subscribe to server events using Server-Sent Events",
      description: "Subscribe to real-time server events for task updates, creation, and deletion",
      responses: {
        200: {
          description: "SSE stream of events",
          content: {
            "text/event-stream": {
              schema: resolver(Event),
            },
          },
        },
      },
    }),
    async (c) => {
      const userId = c.get("userId")

      // Prevent reverse proxies (nginx, envoy, etc.) from buffering the SSE stream
      c.header("Cache-Control", "no-cache, no-transform")
      c.header("X-Accel-Buffering", "no")
      c.header("Connection", "keep-alive")

      return streamSSE(c, async (stream) => {
        // Send initial connection event
        await stream.writeSSE({
          data: JSON.stringify({
            type: "server.connected",
            properties: {},
          }),
        })

        // Subscribe to bus events - only forward events for this user
        const unsubscribe = Bus.subscribe(async (event) => {
          // Server events (connected, heartbeat) go to everyone
          if (event.type === "server.connected" || event.type === "server.heartbeat") {
            await stream.writeSSE({
              data: JSON.stringify(event),
            })
            return
          }

          // User-specific events only go to that user
          if ("userId" in event && event.userId === userId) {
            await stream.writeSSE({
              data: JSON.stringify(event),
            })
          }
        })

        // Heartbeat every 15s to keep connection alive through reverse proxies
        const heartbeat = setInterval(async () => {
          await stream.writeSSE({
            data: JSON.stringify({
              type: "server.heartbeat",
              properties: {},
            }),
          })
        }, 15000)

        // Wait for client to disconnect
        await new Promise<void>((resolve) => {
          stream.onAbort(() => {
            clearInterval(heartbeat)
            unsubscribe()
            resolve()
          })
        })
      })
    },
  )
}
