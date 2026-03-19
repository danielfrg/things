import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { existsSync, mkdirSync } from "fs"
import { dirname } from "path"
import * as schema from "./schema"

const DB_PATH = process.env.DATABASE_URL || "data/things.db"

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!instance) {
    const dir = dirname(DB_PATH)
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const sqlite = new Database(DB_PATH)
    sqlite.exec("PRAGMA journal_mode = WAL;")
    instance = drizzle(sqlite, { schema })
  }
  return instance
}

// Export db as a getter for compatibility with existing imports
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})

export { schema }
export type DbInstance = ReturnType<typeof getDb>
