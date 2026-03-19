import { serve } from "@hono/node-server"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { getDb } from "../src/db"
import { app } from "../src/index"

// Run migrations
console.log("Running migrations...")
migrate(getDb(), { migrationsFolder: "./drizzle" })
console.log("Migrations complete.")

// Start server
const port = process.env.PORT ? Number(process.env.PORT) : 3000
const server = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" })
console.log(`Started server: http://0.0.0.0:${port}`)

// Handle shutdown signals for graceful termination
const shutdown = () => {
  console.log("\nShutting down server...")
  server.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
