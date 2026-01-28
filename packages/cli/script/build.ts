#!/usr/bin/env bun

import { $ } from 'bun';
import path from 'path';

const dir = path.resolve(import.meta.dirname, '..');
process.chdir(dir);

const single = process.argv.includes('--single');

const targets: { os: string; arch: 'arm64' | 'x64' }[] = [
  { os: 'darwin', arch: 'arm64' },
  { os: 'darwin', arch: 'x64' },
  { os: 'linux', arch: 'arm64' },
  { os: 'linux', arch: 'x64' },
];

const selected = single
  ? targets.filter((t) => t.os === process.platform && t.arch === process.arch)
  : targets;

if (selected.length === 0) {
  console.error(`No target found for ${process.platform}-${process.arch}`);
  process.exit(1);
}

function getVersion(): string {
  const prNumber = process.env.PR_NUMBER;

  try {
    const hash = new TextDecoder()
      .decode(Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD']).stdout)
      .trim();

    if (prNumber) {
      return `pr${prNumber}-${hash}`;
    }

    const count = new TextDecoder()
      .decode(Bun.spawnSync(['git', 'rev-list', '--count', 'HEAD']).stdout)
      .trim();
    return `v${count}-${hash}`;
  } catch {
    return 'dev';
  }
}

const version = getVersion();
console.log(`Building CLI version: ${version}`);

await $`rm -rf dist`;

for (const target of selected) {
  const name = `things-${target.os}-${target.arch}`;
  console.log(`Building ${name}...`);

  await $`mkdir -p dist/${name}`;

  const bunTarget = `bun-${target.os}-${target.arch}`;

  await Bun.build({
    entrypoints: ['./index.ts'],
    compile: {
      target: bunTarget as any,
      outfile: `dist/${name}/things`,
    },
    define: {
      THINGS_CLI_VERSION: JSON.stringify(version),
    },
  });

  await Bun.write(`dist/${name}/version.txt`, `${version}\n`);

  console.log(`Built ${name}`);
}

console.log('\nBuild complete!');
console.log(`Output: ${path.join(dir, 'dist')}`);

export { version };
