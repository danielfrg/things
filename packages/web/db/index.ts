import { Database, drizzle } from './adapter';
import * as schema from './schema';

// Determine database path
const DB_PATH = process.env.DATABASE_URL || './data/things.db';

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
// Use exec for bun:sqlite, pragma for better-sqlite3
if (typeof (sqlite as { exec?: (sql: string) => void }).exec === 'function') {
  (sqlite as { exec: (sql: string) => void }).exec(
    'PRAGMA journal_mode = WAL;',
  );
} else {
  (sqlite as { pragma: (sql: string) => void }).pragma('journal_mode = WAL');
}

// Create Drizzle instance with schema
export const db = (drizzle as any)(sqlite, { schema });

// Export schema for convenience
export * from './schema';

// Export type helper
export type DbInstance = typeof db;
