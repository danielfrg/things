import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Bus } from "@/bus"
import { db } from "@/db"
import { tasks } from "@/db/schema"
import { computeFirstOccurrence, createTemplateFromTask, formatTemplateResponse } from "@/services/templates"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import {
  CreateRepeatingRuleSchema,
  ErrorSchema,
  RepeatingRuleSchema,
  SuccessSchema,
  UpdateRepeatingRuleSchema,
} from "./schemas"
import { createId } from "@/lib/id"

export function RepeatingRuleRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "List all repeating rules (templates)",
        responses: {
          200: {
            description: "List of repeating rules",
            content: {
              "application/json": {
                schema: resolver(z.array(RepeatingRuleSchema)),
              },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.userId, userId), eq(tasks.isTemplate, true), isNull(tasks.trashedAt)))
        const formatted = await Promise.all(result.map(formatTemplateResponse))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Create a new repeating rule (template)",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(CreateRepeatingRuleSchema) as any,
            },
          },
        },
        responses: {
          201: {
            description: "Repeating rule created",
            content: {
              "application/json": { schema: resolver(RepeatingRuleSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateRepeatingRuleSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        const now = new Date()

        // Compute the actual first occurrence based on the rrule and provided start date
        const firstOccurrence = computeFirstOccurrence(body.rrule, body.nextOccurrence)
        if (!firstOccurrence) {
          return c.json({ error: "Could not compute first occurrence from rrule" }, 400)
        }

        const [template] = await db
          .insert(tasks)
          .values({
            id: createId("task"),
            userId,
            title: body.title,
            notes: body.notes,
            status: "active", // Templates are always active or trashed (paused = trashed for templates)
            isTemplate: true,
            rrule: body.rrule,
            nextOccurrence: firstOccurrence,
            listId: body.listId ?? null,
            headingId: body.headingId ?? null,
            isSomeday: false,
            isEvening: false,
            createdAt: now,
            updatedAt: now,
          })
          .returning()

        if (!template) {
          return c.json({ error: "Failed to create repeating rule" }, 500)
        }

        const formatted = await formatTemplateResponse(template)
        Bus.publish({
          type: "repeatingRule.created",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 201)
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Get a repeating rule by ID",
        responses: {
          200: {
            description: "Repeating rule details",
            content: {
              "application/json": { schema: resolver(RepeatingRuleSchema) },
            },
          },
          404: {
            description: "Repeating rule not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [template] = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.id, id),
              eq(tasks.userId, userId),
              eq(tasks.isTemplate, true),
              isNull(tasks.trashedAt),
              isNull(tasks.trashedAt),
            ),
          )
        if (!template) {
          return c.json({ error: "Repeating rule not found" }, 404)
        }
        return c.json(await formatTemplateResponse(template), 200)
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Update a repeating rule",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(UpdateRepeatingRuleSchema) as any,
            },
          },
        },
        responses: {
          200: {
            description: "Repeating rule updated",
            content: {
              "application/json": { schema: resolver(RepeatingRuleSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Repeating rule not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateRepeatingRuleSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")

        const updateData: Record<string, unknown> = { updatedAt: new Date() }
        if (body.rrule !== undefined) updateData.rrule = body.rrule
        if (body.status !== undefined) updateData.status = body.status
        if (body.title !== undefined) updateData.title = body.title
        if (body.notes !== undefined) updateData.notes = body.notes
        if (body.listId !== undefined) updateData.listId = body.listId
        if (body.headingId !== undefined) updateData.headingId = body.headingId

        // When rrule is being updated along with nextOccurrence, compute the actual first occurrence
        // The client sends the "start date" but we need the first date that matches the rrule pattern
        if (body.rrule !== undefined && body.nextOccurrence !== undefined) {
          const firstOccurrence = computeFirstOccurrence(body.rrule, body.nextOccurrence)
          if (!firstOccurrence) {
            return c.json({ error: "Could not compute first occurrence from rrule" }, 400)
          }
          updateData.nextOccurrence = firstOccurrence
        } else if (body.nextOccurrence !== undefined) {
          updateData.nextOccurrence = body.nextOccurrence
        }

        const [template] = await db
          .update(tasks)
          .set(updateData)
          .where(
            and(
              eq(tasks.id, id),
              eq(tasks.userId, userId),
              eq(tasks.isTemplate, true),
              isNull(tasks.trashedAt),
              isNull(tasks.trashedAt),
            ),
          )
          .returning()

        if (!template) {
          return c.json({ error: "Repeating rule not found" }, 404)
        }

        const formatted = await formatTemplateResponse(template)
        Bus.publish({
          type: "repeatingRule.updated",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 200)
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Delete a repeating rule",
        responses: {
          200: {
            description: "Repeating rule deleted",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Repeating rule not found",
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
        const now = new Date()

        const [template] = await db
          .update(tasks)
          .set({ trashedAt: now, updatedAt: now })
          .where(
            and(
              eq(tasks.id, id),
              eq(tasks.userId, userId),
              eq(tasks.isTemplate, true),
              isNull(tasks.trashedAt),
              isNull(tasks.trashedAt),
            ),
          )
          .returning()

        if (!template) {
          return c.json({ error: "Repeating rule not found" }, 404)
        }

        Bus.publish({
          type: "repeatingRule.deleted",
          userId,
          properties: { id },
        })
        return c.json({ success: true, message: "Repeating rule deleted" }, 200)
      },
    )
    .post(
      "/:id/pause",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Pause a repeating rule",
        responses: {
          200: {
            description: "Repeating rule paused",
            content: {
              "application/json": { schema: resolver(RepeatingRuleSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Repeating rule not found",
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

        // Note: We use "trashed" status to represent "paused" for templates
        // since tasks don't have a "paused" status
        const [template] = await db
          .update(tasks)
          .set({ status: "trashed", updatedAt: new Date() })
          .where(
            and(
              eq(tasks.id, id),
              eq(tasks.userId, userId),
              eq(tasks.isTemplate, true),
              isNull(tasks.trashedAt),
              isNull(tasks.trashedAt),
            ),
          )
          .returning()

        if (!template) {
          return c.json({ error: "Repeating rule not found" }, 404)
        }

        const formatted = await formatTemplateResponse(template)
        Bus.publish({
          type: "repeatingRule.updated",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 200)
      },
    )
    .post(
      "/:id/resume",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Resume a repeating rule",
        responses: {
          200: {
            description: "Repeating rule resumed",
            content: {
              "application/json": { schema: resolver(RepeatingRuleSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Repeating rule not found",
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

        const [template] = await db
          .update(tasks)
          .set({ status: "active", updatedAt: new Date() })
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isTemplate, true), isNull(tasks.trashedAt)))
          .returning()

        if (!template) {
          return c.json({ error: "Repeating rule not found" }, 404)
        }

        const formatted = await formatTemplateResponse(template)
        Bus.publish({
          type: "repeatingRule.updated",
          userId,
          properties: formatted,
        })
        return c.json(formatted, 200)
      },
    )
    .post(
      "/from-task",
      describeRoute({
        tags: ["Repeating Rules"],
        summary: "Create a repeating rule from an existing task",
        requestBody: {
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  taskId: z.string(),
                  rrule: z.string(),
                  startDate: z.string(),
                }),
              ) as any,
            },
          },
        },
        responses: {
          201: {
            description: "Repeating rule created from task",
            content: {
              "application/json": {
                schema: resolver(z.object({ ruleId: z.string() })),
              },
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
      validator(
        "json",
        z.object({
          taskId: z.string(),
          rrule: z.string(),
          startDate: z.string(),
        }),
      ),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        try {
          const ruleId = await createTemplateFromTask(body.taskId, body.rrule, body.startDate, userId)
          return c.json({ ruleId }, 201)
        } catch (e: any) {
          if (e.message === "Task not found") {
            return c.json({ error: "Task not found" }, 404)
          }
          throw e
        }
      },
    )
}
