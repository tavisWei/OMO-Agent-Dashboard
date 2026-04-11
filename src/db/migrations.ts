import type { Database } from 'sql.js';
import { ALL_SCHEMA } from './schema.js';

export function runMigrations(db: Database): void {
  db.run(ALL_SCHEMA);
  db.run("PRAGMA journal_mode=WAL;");
  db.run("PRAGMA foreign_keys=ON;");
}

export function initializeDatabase(db: Database): void {
  runMigrations(db);
}
