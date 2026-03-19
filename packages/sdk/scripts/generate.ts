import { fileURLToPath } from "url";
import { createClient } from "@hey-api/openapi-ts";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "path";

const dir = fileURLToPath(new URL("..", import.meta.url));
process.chdir(dir);

// Generate OpenAPI spec from the server
console.log("Generating OpenAPI spec...");
const spec = spawnSync("pnpm", ["exec", "tsx", "scripts/generate.ts"], {
  cwd: path.join(dir, "../server"),
  encoding: "utf8",
});

if (spec.status !== 0) {
  process.stderr.write(spec.stderr);
  process.exit(spec.status ?? 1);
}

writeFileSync(path.join(dir, "openapi.json"), spec.stdout);

// Generate SDK from OpenAPI spec
console.log("Generating SDK...");
await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "ThingsClient",
      exportFromIndex: false,
      auth: false,
      paramsStructure: "flat",
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:3000",
    },
  ],
});

// Format
console.log("Formatting...");
const fmt = spawnSync("vp", ["fmt", "src/gen"], {
  cwd: dir,
  stdio: "inherit",
});

if (fmt.status !== 0) {
  process.exit(fmt.status ?? 1);
}

console.log("SDK generated successfully!");
