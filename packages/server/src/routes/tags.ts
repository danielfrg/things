import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { db } from "@/db"
import { tags } from "@/db/schema"
import type { AuthContext } from "../middleware/auth"
import { requireWriteScope } from "../middleware/auth"
import { CreateTagSchema, ErrorSchema, SuccessSchema, TagSchema, UpdateTagSchema } from "./schemas"

export function TagRoutes() {
  return new Hono<AuthContext>()
    .get(
      "/",
      describeRoute({
        tags: ["Tags"],
        summary: "List all tags",
        responses: {
          200: {
            description: "List of tags",
            content: {
              "application/json": { schema: resolver(z.array(TagSchema)) },
            },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const result = await db
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), isNull(tags.trashedAt)))
        const formatted = result.map((t) => ({
          id: t.id,
          title: t.title,
          position: t.position,
          createdAt: t.createdAt.toISOString(),
        }))
        return c.json(formatted, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Tags"],
        summary: "Create a new tag",
        requestBody: {
          content: {
            "application/json": { schema: resolver(CreateTagSchema) as any },
          },
        },
        responses: {
          201: {
            description: "Tag created",
            content: { "application/json": { schema: resolver(TagSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", CreateTagSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const body = c.req.valid("json")
        const [tag] = await db
          .insert(tags)
          .values({
            userId,
            title: body.title,
            position: body.position ?? 0,
          })
          .returning()
        if (!tag) {
          return c.json({ error: "Failed to create tag" }, 500)
        }
        return c.json(
          {
            id: tag.id,
            title: tag.title,
            position: tag.position,
            createdAt: tag.createdAt.toISOString(),
          },
          201,
        )
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Tags"],
        summary: "Get a tag by ID",
        responses: {
          200: {
            description: "Tag details",
            content: { "application/json": { schema: resolver(TagSchema) } },
          },
          404: {
            description: "Tag not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      async (c) => {
        const userId = c.get("userId")
        const id = c.req.param("id")
        const [tag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.id, id), eq(tags.userId, userId)))
        if (!tag) {
          return c.json({ error: "Tag not found" }, 404)
        }
        return c.json(
          {
            id: tag.id,
            title: tag.title,
            position: tag.position,
            createdAt: tag.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Tags"],
        summary: "Update a tag",
        requestBody: {
          content: {
            "application/json": { schema: resolver(UpdateTagSchema) as any },
          },
        },
        responses: {
          200: {
            description: "Tag updated",
            content: { "application/json": { schema: resolver(TagSchema) } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Tag not found",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
        },
      }),
      validator("json", UpdateTagSchema),
      async (c) => {
        if (!requireWriteScope(c)) {
          return c.json({ error: "Forbidden - API key does not have write permission" }, 403)
        }
        const userId = c.get("userId")
        const id = c.req.param("id")
        const body = c.req.valid("json")
        const [tag] = await db
          .update(tags)
          .set({ ...body, updatedAt: new Date() })
          .where(and(eq(tags.id, id), eq(tags.userId, userId)))
          .returning()
        if (!tag) {
          return c.json({ error: "Tag not found" }, 404)
        }
        return c.json(
          {
            id: tag.id,
            title: tag.title,
            position: tag.position,
            createdAt: tag.createdAt.toISOString(),
          },
          200,
        )
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Tags"],
        summary: "Delete a tag (soft-delete)",
        responses: {
          200: {
            description: "Tag deleted",
            content: {
              "application/json": { schema: resolver(SuccessSchema) },
            },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: resolver(ErrorSchema) } },
          },
          404: {
            description: "Tag not found",
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
        const result = await db
          .update(tags)
          .set({ trashedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(tags.id, id), eq(tags.userId, userId), isNull(tags.trashedAt)))
          .returning()
        if (result.length === 0) {
          return c.json({ error: "Tag not found" }, 404)
        }
        return c.json({ success: true, message: "Tag deleted" }, 200)
      },
    )
}
