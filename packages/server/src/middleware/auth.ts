import type { Context, Next } from "hono"
import { auth } from "@/lib/auth"
import { hashKey } from "@/lib/crypto"
import { validateApiKey } from "@/services/apiKeys"

export type AuthContext = {
  Variables: {
    scope: "read" | "read-write"
    keyId: string | null
    userId: string
    keyHash: string | null
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization")

  // Try API key authentication first (for CLI/external clients)
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Invalid Authorization header format. Use: Bearer <api_key>" }, 401)
    }

    const apiKey = authHeader.slice(7)

    if (!apiKey || !(apiKey.startsWith("sk_") || apiKey.startsWith("tk_"))) {
      return c.json({ error: "Invalid API key format" }, 401)
    }

    const validation = await validateApiKey(apiKey)

    if (!validation.valid) {
      return c.json({ error: "Invalid or expired API key" }, 401)
    }

    const keyHash = await hashKey(apiKey)

    c.set("scope", validation.scope)
    c.set("keyId", validation.keyId)
    c.set("userId", validation.userId)
    c.set("keyHash", keyHash)

    return next()
  }

  // Fall back to session cookie authentication (for web UI)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (session?.user?.id) {
    // Session-authenticated users have full read-write access
    c.set("scope", "read-write")
    c.set("keyId", null)
    c.set("userId", session.user.id)
    c.set("keyHash", null)

    return next()
  }

  return c.json({ error: "Unauthorized" }, 401)
}

export function requireWriteScope(c: Context): boolean {
  const scope = c.get("scope")
  return scope === "read-write"
}
