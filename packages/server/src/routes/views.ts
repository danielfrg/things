import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import {
  getAnytimeView,
  getAreaView,
  getInboxView,
  getLogbookView,
  getProjectView,
  getSomedayView,
  getTodayView,
  getTrashView,
  getUpcomingView,
} from "@/services/views"
import type { AuthContext } from "../middleware/auth"
import {
  AreaViewResponseSchema,
  ErrorSchema,
  ProjectViewResponseSchema,
  UpcomingViewResponseSchema,
  ViewResponseSchema,
} from "./schemas"

export function ViewRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/today",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Today view",
        description:
          "Returns tasks scheduled for today, overdue tasks, tasks with deadlines today/overdue, and tasks completed today. Grouped by project/area.",
        responses: {
          200: {
            description: "Today view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getTodayView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/inbox",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Inbox view",
        description: "Returns tasks with inbox status that have no project, area, or scheduled date.",
        responses: {
          200: {
            description: "Inbox view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getInboxView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/upcoming",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Upcoming view",
        description:
          'Returns tasks scheduled for the next 7 days grouped by day, plus a "later" group for tasks beyond that. Includes repeating rule templates.',
        responses: {
          200: {
            description: "Upcoming view data",
            content: {
              "application/json": {
                schema: resolver(UpcomingViewResponseSchema),
              },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getUpcomingView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/anytime",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Anytime view",
        description: "Returns tasks with anytime status, grouped by project/area.",
        responses: {
          200: {
            description: "Anytime view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getAnytimeView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/someday",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Someday view",
        description: "Returns tasks with someday status, grouped by project/area.",
        responses: {
          200: {
            description: "Someday view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getSomedayView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/logbook",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Logbook view",
        description: "Returns all completed tasks.",
        responses: {
          200: {
            description: "Logbook view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getLogbookView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/trash",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for Trash view",
        description: "Returns all trashed tasks.",
        responses: {
          200: {
            description: "Trash view data",
            content: {
              "application/json": { schema: resolver(ViewResponseSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await getTrashView(userId)
        return c.json(result, 200)
      },
    )
    .get(
      "/project/:id",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for a Project view",
        description: "Returns tasks in a project grouped by headings, with backlog and completed today sections.",
        responses: {
          200: {
            description: "Project view data",
            content: {
              "application/json": {
                schema: resolver(ProjectViewResponseSchema),
              },
            },
          },
          404: {
            description: "Project not found",
            content: {
              "application/json": { schema: resolver(ErrorSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const projectId = c.req.param("id")
        const result = await getProjectView(userId, projectId)
        if (!result.project) {
          return c.json({ error: "Project not found" }, 404)
        }
        return c.json(result, 200)
      },
    )
    .get(
      "/area/:id",
      describeRoute({
        tags: ["Views"],
        summary: "Get tasks for an Area view",
        description: "Returns tasks directly in the area (not in projects), someday tasks, and projects in the area.",
        responses: {
          200: {
            description: "Area view data",
            content: {
              "application/json": { schema: resolver(AreaViewResponseSchema) },
            },
          },
          404: {
            description: "Area not found",
            content: {
              "application/json": { schema: resolver(ErrorSchema) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const areaId = c.req.param("id")
        const result = await getAreaView(userId, areaId)
        if (!result.area) {
          return c.json({ error: "Area not found" }, 404)
        }
        return c.json(result, 200)
      },
    )
}
