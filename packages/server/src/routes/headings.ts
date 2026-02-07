import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Bus } from "@/bus"
import { db } from "@/db"
import { headings, projects, tasks } from "@/db/schema"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import { CreateHeadingSchema, ErrorSchema, HeadingSchema, SuccessSchema, UpdateHeadingSchema } from "./schemas"

export function HeadingRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Headings"],
        summary: "List all headings",
        responses: {
          200: {
            description: "List of headings",
            content: {
              "application/json": { schema: resolver(z.array(HeadingSchema)) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(headings)
          .where(and(eq(headings.userId, userId), isNull(headings.trashedAt)))
          .orderBy(headings.position)
        const formatted = result.map((h) => ({
          id: h.id,
          title: h.title,
          position: h.position,
          isBacklog: h.isBacklog,
          projectId: h.projectId,
          createdAt: h.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Headings"],
        summary: "Create a new heading",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(CreateHeadingSchema) as any,
            },
          },
        },
        responses: {
          201: {
            description: "Heading created",
            content: {
              "application/json": { schema: resolver(HeadingSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Project not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateHeadingSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, body.projectId), eq(projects.userId, userId)))
        if (!project) {
          return c.json({ error: "Project not found" }, 404)
        }
        const [heading] = await db
          .insert(headings)
          .values({
            userId,
            title: body.title,
            projectId: body.projectId,
            position: body.position ?? 0,
            isBacklog: body.isBacklog ?? false,
          })
          .returning()
        if (!heading) {
          return c.json({ error: "Failed to create heading" }, 500)
        }
        const formatted = {
          id: heading.id,
          title: heading.title,
          position: heading.position,
          isBacklog: heading.isBacklog,
          projectId: heading.projectId,
          createdAt: heading.createdAt.toISOString(),
        }
        Bus.publish({
          type: "heading.created",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 201)
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Headings"],
        summary: "Get a heading by ID",
        responses: {
          200: {
            description: "Heading details",
            content: {
              "application/json": { schema: resolver(HeadingSchema) },
            },
          },
          404: {
            description: "Heading not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [heading] = await db
          .select()
          .from(headings)
          .where(and(eq(headings.id, id), eq(headings.userId, userId), isNull(headings.trashedAt)))
        if (!heading) {
          return c.json({ error: "Heading not found" }, 404)
        }
        return c.json(
          {
            id: heading.id,
            title: heading.title,
            position: heading.position,
            isBacklog: heading.isBacklog,
            projectId: heading.projectId,
            createdAt: heading.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Headings"],
        summary: "Update a heading",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(UpdateHeadingSchema) as any,
            },
          },
        },
        responses: {
          200: {
            description: "Heading updated",
            content: {
              "application/json": { schema: resolver(HeadingSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Heading not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateHeadingSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")
        const [heading] = await db
          .update(headings)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(headings.id, id), eq(headings.userId, userId), isNull(headings.trashedAt)))
          .returning()
        if (!heading) {
          return c.json({ error: "Heading not found" }, 404)
        }
        const formatted = {
          id: heading.id,
          title: heading.title,
          position: heading.position,
          isBacklog: heading.isBacklog,
          projectId: heading.projectId,
          createdAt: heading.createdAt.toISOString(),
        }
        Bus.publish({
          type: "heading.updated",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 200)
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Headings"],
        summary: "Delete a heading",
        description: "Deletes a heading. The heading must have no tasks.",
        responses: {
          200: {
            description: "Heading deleted",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          400: {
            description: "Cannot delete - heading has tasks",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Heading not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")

        // Check if heading has any non-trashed tasks
        const headingTasks = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              eq(tasks.headingId, id),
              isNull(tasks.trashedAt),
              eq(tasks.isTemplate, false),
            ),
          )

        if (headingTasks.length > 0) {
          return c.json(
            {
              error: `Cannot delete heading - it still contains ${headingTasks.length} task${headingTasks.length !== 1 ? "s" : ""}. Move or delete them first.`,
            },
            400,
          )
        }

        const [heading] = await db
          .update(headings)
          .set({ trashedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(headings.id, id), eq(headings.userId, userId), isNull(headings.trashedAt)))
          .returning()
        if (!heading) {
          return c.json({ error: "Heading not found" }, 404)
        }
        Bus.publish({
          type: "heading.deleted",
          userId,
          properties: { id: heading.id, projectId: heading.projectId },
        })
        return c.json({ success: true, message: "Heading deleted" }, 200)
      },
    )
}
