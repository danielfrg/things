#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(dir);

const single = process.argv.includes("--single");

const targets: { os: string; arch: "arm64" | "x64" }[] = [
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
];

const selected = single
  ? targets.filter(
      (target) =>
        target.os === process.platform && target.arch === process.arch,
    )
  : targets;

if (selected.length === 0) {
  console.error(`No target found for ${process.platform}-${process.arch}`);
  process.exit(1);
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout.trim();
}

function getVersion(): string {
  const pr = process.env.PR_NUMBER;

  try {
    const hash = runGit(["rev-parse", "--short", "HEAD"]);

    if (pr) {
      return `pr${pr}-${hash}`;
    }

    const count = runGit(["rev-list", "--count", "HEAD"]);
    return `v${count}-${hash}`;
  } catch {
    return "dev";
  }
}

const version = getVersion();
console.log(`Building CLI version: ${version}`);

await rm("dist", { recursive: true, force: true });

for (const target of selected) {
  const name = `things-${target.os}-${target.arch}`;
  const outdir = path.join("dist", name);
  const outfile = path.join(outdir, "things");

  console.log(`Building ${name}...`);
  await mkdir(outdir, { recursive: true });

  await build({
    entryPoints: ["./index.ts"],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile,
    banner: { js: "#!/usr/bin/env node" },
    define: {
      THINGS_CLI_VERSION: JSON.stringify(version),
    },
  });

  await chmod(outfile, 0o755);
  await writeFile(path.join(outdir, "version.txt"), `${version}\n`);

  console.log(`Built ${name}`);
}

console.log("\nBuild complete!");
console.log(`Output: ${path.join(dir, "dist")}`);

export { version };
