import Database from 'better-sqlite3'
import { count } from 'drizzle-orm'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { seedDefaults } from './seed'

export type Db = BetterSQLite3Database<typeof schema>

export function countRows(db: Db, table: SQLiteTable): number {
  return db.select({ n: count() }).from(table).get()!.n
}

export interface OpenDatabase {
  db: Db
  sqlite: Database.Database
}

/**
 * Opens the single SQLite file, applies pending migrations and loads the defaults.
 * Kept free of Electron imports so it can run under plain Node in tests.
 */
export function openDatabase(filePath: string, migrationsFolder: string): OpenDatabase {
  const sqlite = new Database(filePath)
  // Rollback journal instead of WAL: all the data must stay in one file, because
  // backup and transfer between computers copy that file.
  sqlite.pragma('journal_mode = DELETE')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })
  seedDefaults(db)
  return { db, sqlite }
}
