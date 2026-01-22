/**
 * Run database migrations using bun:sqlite
 * This script reads SQL files from the drizzle folder and executes them
 */
import { Database } from 'bun:sqlite';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

const dbUrl = process.env.DATABASE_URL || './data/things.db';
const migrationsDir = join(dirname(import.meta.dir), 'drizzle');

// Ensure data directory exists
const dbDir = dirname(dbUrl);
if (dbDir && !existsSync(dbDir)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbUrl);

// Create migrations tracking table
db.run(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Get applied migrations
const applied = new Set(
  db
    .query('SELECT hash FROM __drizzle_migrations')
    .all()
    .map((r: any) => r.hash),
);

// Get migration files
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }

  console.log(`Applying ${file}...`);
  const sql = readFileSync(join(migrationsDir, file), 'utf-8');

  // Split by statement breakpoint and execute each statement
  const statements = sql.split('--> statement-breakpoint');

  try {
    db.transaction(() => {
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          db.run(trimmed);
        }
      }
      db.run(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [file, Date.now()],
      );
    })();

    console.log(`Applied ${file}`);
  } catch (err: any) {
    // If tables already exist, mark migration as applied and continue
    if (err?.message?.includes('already exists')) {
      console.log(`Tables from ${file} already exist, marking as applied`);
      db.run(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [file, Date.now()],
      );
    } else {
      throw err;
    }
  }
}

console.log('Migrations complete');
db.close();
