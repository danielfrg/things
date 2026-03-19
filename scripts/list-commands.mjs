import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const file = path.join(root, "package.json")
const raw = await readFile(file, "utf8")
const json = JSON.parse(raw)
const scripts = json.scripts || {}
const keys = Object.keys(scripts).sort()

if (keys.length === 0) {
  console.log("No commands found.")
  process.exit(0)
}

for (const key of keys) {
  console.log(key)
}
