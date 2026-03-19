#!/usr/bin/env node

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dbPath = join(
  fileURLToPath(new URL("../data/things.db", import.meta.url)),
);

async function clean() {
  console.log("Cleaning database...");

  try {
    await unlink(dbPath);
    console.log("Database file deleted:", dbPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("Database file does not exist, nothing to clean.");
    } else {
      throw error;
    }
  }

  console.log("\nDone! Run `vp run db:migrate` to recreate the database.");
}

clean().catch((error) => {
  console.error("Error cleaning database:", error);
  process.exit(1);
});
