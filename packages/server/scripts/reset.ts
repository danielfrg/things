#!/usr/bin/env bun

import { unlink } from "node:fs/promises"
import { join } from "node:path"

const dbPath = join(import.meta.dir, "../data/things.db")

async function clean() {
  console.log("Cleaning database...")

  try {
    await unlink(dbPath)
    console.log("Database file deleted:", dbPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("Database file does not exist, nothing to clean.")
    } else {
      throw error
    }
  }

  console.log("\nDone! Run `bun run db:migrate` to recreate the database.")
}

clean().catch((error) => {
  console.error("Error cleaning database:", error)
  process.exit(1)
})
