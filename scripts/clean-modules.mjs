import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = path.join(root, "packages");

const rows = await readdir(pkg, { withFileTypes: true });
const mods = rows
  .filter((row) => row.isDirectory())
  .map((row) => path.join(pkg, row.name, "node_modules"));

const all = [path.join(root, "node_modules"), ...mods];

await Promise.all(all.map((dir) => rm(dir, { recursive: true, force: true })));

console.log("Removed node_modules directories:");
for (const dir of all) {
  console.log(`- ${path.relative(root, dir)}`);
}
