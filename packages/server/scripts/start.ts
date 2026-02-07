import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { getDb } from "../src/db"

// Run migrations
console.log("Running migrations...")
migrate(getDb(), { migrationsFolder: "./drizzle" })
console.log("Migrations complete.")

// Start server
const serverConfig = (await import("../src/index.ts")).default
const server = Bun.serve(serverConfig)
console.log(`Started server: http://${server.hostname}:${server.port}`)
