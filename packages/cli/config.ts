import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class ConfigError extends Error {
  readonly _tag = 'ConfigError';
}

export type CliConfig = {
  baseUrl: string;
  apiKey: string;
};

function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnvFileIntoProcess(path: string) {
  try {
    const contents = readFileSync(path, 'utf8');
    const parsed = parseEnvFile(contents);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing file
  }
}

// Find repo root by looking for package.json with workspaces
function findRepoRoot(): string {
  let dir = dirname(import.meta.dirname);
  while (dir !== '/') {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pkg.workspaces) return dir;
    } catch {
      // Continue searching
    }
    dir = dirname(dir);
  }
  return process.cwd();
}

const repoRoot = findRepoRoot();

// Load env files from repo root (where web app's .env lives)
// Load .env.local first (overrides), then .env (base config)
loadEnvFileIntoProcess(join(repoRoot, '.env.local'));
loadEnvFileIntoProcess(join(repoRoot, '.env'));

// Also check cwd for backwards compatibility
loadEnvFileIntoProcess('.env.local');
loadEnvFileIntoProcess('.env');

export function getConfig(env: NodeJS.ProcessEnv = process.env): CliConfig {
  const baseUrl = env.THINGS_API_BASE_URL ?? 'http://localhost:3000/api';
  const apiKey = env.THINGS_API_KEY;

  if (!apiKey) {
    throw new ConfigError(
      [
        'Missing env variable `THINGS_API_KEY`.',
        '',
        'Examples:',
        '  export THINGS_API_KEY=tk_...',
        '',
        'Also ensure the server is running and `THINGS_API_BASE_URL` is correct.',
      ].join('\n'),
    );
  }

  return { baseUrl, apiKey };
}
