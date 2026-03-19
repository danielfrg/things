import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getDb } from "@/db"
import * as schema from "@/db/schema"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const isDev = process.env.NODE_ENV !== "production"

const getAllowedOrigins = () => {
  if (!isDev) return [baseUrl]

  const origins = [baseUrl, "http://localhost:3000", "http://localhost:5173"]

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(","))
  }

  return origins
}

const createAuth = () =>
  betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    baseURL: baseUrl,
    trustedOrigins: isDev
      ? (req) => {
          const origin = req?.headers.get("origin")
          if (!origin) return getAllowedOrigins()

          if (
            origin.startsWith("http://localhost:") ||
            origin.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/.*\.local:\d+$/)
          ) {
            return [origin]
          }

          return getAllowedOrigins()
        }
      : [baseUrl],
  })

let instance: ReturnType<typeof betterAuth> | null = null

const getAuth = () => {
  if (instance) {
    return instance
  }

  instance = createAuth()
  return instance
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver)
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
