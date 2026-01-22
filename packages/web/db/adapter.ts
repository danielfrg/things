/**
 * Database adapter using Bun's built-in SQLite
 */

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

export { Database, drizzle };
