import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Bus } from "@/bus"
import { db } from "@/db"
import { areas } from "@/db/schema"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import { deleteArea, getAreaContentCount } from "../services/area-cascade"
import { AreaSchema, CreateAreaSchema, ErrorSchema, UpdateAreaSchema } from "./schemas"

// Schema for area delete response
const AreaDeleteResponseSchema = z.object({
  success: z.boolean(),
  affectedProjects: z.number(),
  affectedTasks: z.number(),
  message: z.string(),
})

// Schema for area content count response
const AreaContentCountSchema = z.object({
  projectCount: z.number(),
  taskCount: z.number(),
})

export function AreaRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Areas"],
        summary: "List all areas",
        responses: {
          200: {
            description: "List of areas",
            content: {
              "application/json": { schema: resolver(z.array(AreaSchema)) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(areas)
          .where(and(eq(areas.userId, userId), isNull(areas.trashedAt)))
        const formatted = result.map((a) => ({
          id: a.id,
          title: a.title,
          position: a.position,
          createdAt: a.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Areas"],
        summary: "Create a new area",
        requestBody: {
          content: {
            "application/json": { schema: resolver(CreateAreaSchema) as any },
          },
        },
        responses: {
          201: {
            description: "Area created",
            content: { "application/json": { schema: resolver(AreaSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateAreaSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        const [area] = await db
          .insert(areas)
          .values({
            userId,
            title: body.title,
            position: body.position ?? 0,
          })
          .returning()
        if (!area) {
          return c.json({ error: "Failed to create area" }, 500)
        }
        const formatted = {
          id: area.id,
          title: area.title,
          position: area.position,
          createdAt: area.createdAt.toISOString(),
        }
        Bus.publish({
          type: "area.created",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 201)
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Areas"],
        summary: "Get an area by ID",
        responses: {
          200: {
            description: "Area details",
            content: { "application/json": { schema: resolver(AreaSchema) } },
          },
          404: {
            description: "Area not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [area] = await db
          .select()
          .from(areas)
          .where(and(eq(areas.id, id), eq(areas.userId, userId)))
        if (!area) {
          return c.json({ error: "Area not found" }, 404)
        }
        return c.json(
          {
            id: area.id,
            title: area.title,
            position: area.position,
            createdAt: area.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Areas"],
        summary: "Update an area",
        requestBody: {
          content: {
            "application/json": { schema: resolver(UpdateAreaSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Area updated",
            content: { "application/json": { schema: resolver(AreaSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Area not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateAreaSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")
        const [area] = await db
          .update(areas)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(areas.id, id), eq(areas.userId, userId)))
          .returning()
        if (!area) {
          return c.json({ error: "Area not found" }, 404)
        }
        const formatted = {
          id: area.id,
          title: area.title,
          position: area.position,
          createdAt: area.createdAt.toISOString(),
        }
        Bus.publish({
          type: "area.updated",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 200)
      },
    )
    .get(
      "/:id/content-count",
      describeRoute({
        tags: ["Areas"],
        summary: "Get count of projects and tasks in an area",
        description: "Returns the number of projects and tasks that would be affected by deleting this area.",
        responses: {
          200: {
            description: "Content counts",
            content: {
              "application/json": { schema: resolver(AreaContentCountSchema) },
            },
          },
          404: {
            description: "Area not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")

        // First check if area exists
        const [area] = await db
          .select()
          .from(areas)
          .where(and(eq(areas.id, id), eq(areas.userId, userId)))

        if (!area) {
          return c.json({ error: "Area not found" }, 404)
        }

        const counts = await getAreaContentCount(id, userId)
        return c.json(counts, 200)
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Areas"],
        summary: "Delete an area",
        description: "Deletes an area and moves all its projects and tasks to trash.",
        responses: {
          200: {
            description: "Area deleted",
            content: {
              "application/json": { schema: resolver(AreaDeleteResponseSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Area not found",
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

        const result = await deleteArea(id, userId)

        if (!result.success) {
          return c.json({ error: "Area not found" }, 404)
        }

        return c.json(
          {
            success: true,
            affectedProjects: result.affectedProjects,
            affectedTasks: result.affectedTasks,
            message: `Area and ${result.affectedProjects} project(s) and ${result.affectedTasks} task(s) moved to trash`,
          },
          200,
        )
      },
    )
}
