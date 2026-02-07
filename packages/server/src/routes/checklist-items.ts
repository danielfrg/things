import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { db } from "@/db"
import { checklistItems, tasks } from "@/db/schema"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import {
  ChecklistItemSchema,
  CreateChecklistItemSchema,
  ErrorSchema,
  SuccessSchema,
  UpdateChecklistItemSchema,
} from "./schemas"

export function ChecklistItemRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Checklist Items"],
        summary: "List checklist items for a task",
        responses: {
          200: {
            description: "List of checklist items",
            content: {
              "application/json": {
                schema: resolver(z.array(ChecklistItemSchema)),
              },
            },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const taskId = c.req.param("taskId")
        if (!taskId) {
          return c.json({ error: "Task ID is required" }, 400)
        }
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }
        const result = await db
          .select()
          .from(checklistItems)
          .where(and(eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId)))
          .orderBy(checklistItems.position)
        const formatted = result.map((item) => ({
          id: item.id,
          title: item.title,
          completed: item.completed,
          position: item.position,
          taskId: item.taskId,
          createdAt: item.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Checklist Items"],
        summary: "Create a checklist item",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(CreateChecklistItemSchema) as any,
            },
          },
        },
        responses: {
          201: {
            description: "Checklist item created",
            content: {
              "application/json": { schema: resolver(ChecklistItemSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Task not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateChecklistItemSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const taskId = c.req.param("taskId")
        if (!taskId) {
          return c.json({ error: "Task ID is required" }, 400)
        }
        const body = c.req.valid("json")
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        if (!task) {
          return c.json({ error: "Task not found" }, 404)
        }
        const [item] = await db
          .insert(checklistItems)
          .values({
            userId,
            taskId,
            title: body.title,
            completed: body.completed ?? false,
            position: body.position ?? 0,
          })
          .returning()
        if (!item) {
          return c.json({ error: "Failed to create checklist item" }, 500)
        }
        return c.json(
          {
            id: item.id,
            title: item.title,
            completed: item.completed,
            position: item.position,
            taskId: item.taskId,
            createdAt: item.createdAt.toISOString(),
          },
          201,
        )
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Checklist Items"],
        summary: "Get a checklist item by ID",
        responses: {
          200: {
            description: "Checklist item details",
            content: {
              "application/json": { schema: resolver(ChecklistItemSchema) },
            },
          },
          404: {
            description: "Checklist item not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const taskId = c.req.param("taskId")
        const id = c.req.param("id")
        if (!taskId || !id) {
          return c.json({ error: "Task ID and item ID are required" }, 400)
        }
        const [item] = await db
          .select()
          .from(checklistItems)
          .where(and(eq(checklistItems.id, id), eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId)))
        if (!item) {
          return c.json({ error: "Checklist item not found" }, 404)
        }
        return c.json(
          {
            id: item.id,
            title: item.title,
            completed: item.completed,
            position: item.position,
            taskId: item.taskId,
            createdAt: item.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Checklist Items"],
        summary: "Update a checklist item",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(UpdateChecklistItemSchema) as any,
            },
          },
        },
        responses: {
          200: {
            description: "Checklist item updated",
            content: {
              "application/json": { schema: resolver(ChecklistItemSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Checklist item not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateChecklistItemSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const taskId = c.req.param("taskId")
        const id = c.req.param("id")
        if (!taskId || !id) {
          return c.json({ error: "Task ID and item ID are required" }, 400)
        }
        const body = c.req.valid("json")
        const [item] = await db
          .update(checklistItems)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(checklistItems.id, id), eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId)))
          .returning()
        if (!item) {
          return c.json({ error: "Checklist item not found" }, 404)
        }
        return c.json(
          {
            id: item.id,
            title: item.title,
            completed: item.completed,
            position: item.position,
            taskId: item.taskId,
            createdAt: item.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Checklist Items"],
        summary: "Delete a checklist item",
        responses: {
          200: {
            description: "Checklist item deleted",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Checklist item not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const taskId = c.req.param("taskId")
        const id = c.req.param("id")
        if (!taskId || !id) {
          return c.json({ error: "Task ID and item ID are required" }, 400)
        }
        const result = await db
          .delete(checklistItems)
          .where(and(eq(checklistItems.id, id), eq(checklistItems.taskId, taskId), eq(checklistItems.userId, userId)))
          .returning()
        if (result.length === 0) {
          return c.json({ error: "Checklist item not found" }, 404)
        }
        return c.json({ success: true, message: "Checklist item deleted" }, 200)
      },
    )
}
