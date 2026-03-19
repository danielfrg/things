import { spawnSync } from "node:child_process";

const major = Number(process.versions.node.split(".")[0]);

if (major < 25) {
  console.error(
    "vp pack --exe requires Node.js 25.7+ (current: " +
      process.versions.node +
      ")",
  );
  console.error("Use Node 25+ when running @danielfrg/things-cli build");
  process.exit(1);
}

const run = spawnSync("vp", ["pack"], { stdio: "inherit" });
process.exit(run.status ?? 1);
