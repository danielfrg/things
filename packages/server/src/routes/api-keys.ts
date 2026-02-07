import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { auth } from "@/lib/auth"
import { authMiddleware } from "@/middleware/auth"
import { createApiKey, listApiKeys, removeApiKey, removeApiKeyByName, revokeCurrentKey } from "@/services/apiKeys"

const CreateApiKeySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(["read", "read-write"]),
})

const CreateCliTokenSchema = z.object({
  name: z.string().min(1),
  hostname: z.string().min(1),
})

const ApiKeyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  scope: z.enum(["read", "read-write"]),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
})

const CreateApiKeyResponseSchema = z.object({
  keyId: z.string(),
  key: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  scope: z.enum(["read", "read-write"]),
})

export function ApiKeyRoutes() {
  return new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["API Keys"],
        summary: "List API keys for authenticated user",
        responses: {
          200: {
            description: "List of API keys",
            content: {
              "application/json": {
                schema: resolver(z.array(ApiKeyInfoSchema)),
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session?.user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const keys = await listApiKeys(session.user.id)
        return c.json(keys, 200)
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["API Keys"],
        summary: "Create a new API key",
        requestBody: {
          content: {
            "application/json": {
              // @ts-expect-error - hono-openapi resolver type mismatch
              schema: resolver(CreateApiKeySchema),
            },
          },
        },
        responses: {
          200: {
            description: "API key created",
            content: {
              "application/json": {
                schema: resolver(CreateApiKeyResponseSchema),
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      validator("json", CreateApiKeySchema),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session?.user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const body = c.req.valid("json")
        const result = await createApiKey(session.user.id, body.name, body.scope)
        return c.json(result, 200)
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["API Keys"],
        summary: "Delete an API key",
        responses: {
          200: {
            description: "API key deleted",
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session?.user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const keyId = c.req.param("id")
        await removeApiKey(keyId, session.user.id)
        return c.json({ success: true }, 200)
      },
    )
    .post(
      "/cli-token",
      describeRoute({
        tags: ["API Keys"],
        summary: "Create a CLI API key (replaces existing CLI key for this hostname)",
        requestBody: {
          content: {
            "application/json": {
              // @ts-expect-error - hono-openapi resolver type mismatch
              schema: resolver(CreateCliTokenSchema),
            },
          },
        },
        responses: {
          200: {
            description: "CLI API key created",
            content: {
              "application/json": {
                schema: resolver(CreateApiKeyResponseSchema),
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      validator("json", CreateCliTokenSchema),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session?.user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const body = c.req.valid("json")

        // Remove existing CLI key with same name
        await removeApiKeyByName(body.name, session.user.id)

        // Create new key
        const result = await createApiKey(session.user.id, body.name, "read-write")
        return c.json(result, 200)
      },
    )
    .post(
      "/cli-logout",
      describeRoute({
        tags: ["API Keys"],
        summary: "Revoke the current API key (for CLI logout)",
        responses: {
          200: {
            description: "API key revoked",
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      authMiddleware,
      async (c) => {
        const keyHash = (c as any).get("keyHash") as string
        if (!keyHash) {
          return c.json({ error: "No API key in request" }, 400)
        }

        await revokeCurrentKey(keyHash)
        return c.json({ success: true }, 200)
      },
    )
    .get(
      "/me",
      describeRoute({
        tags: ["API Keys"],
        summary: "Get current user info",
        responses: {
          200: {
            description: "User info",
          },
          401: {
            description: "Unauthorized",
          },
        },
      }),
      authMiddleware,
      async (c) => {
        const userId = (c as any).get("userId") as string
        // Get user info from database
        const { users } = await import("@/db/schema")
        const { eq } = await import("drizzle-orm")
        const { db } = await import("@/db")

        const [user] = await db.select().from(users).where(eq(users.id, userId))
        if (!user) {
          return c.json({ error: "User not found" }, 404)
        }

        return c.json({ email: user.email, name: user.name }, 200)
      },
    )
}
