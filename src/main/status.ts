import { asc, eq } from 'drizzle-orm'
import type { AppStatus } from '../shared/api'
import { countRows, type OpenDatabase } from './db/client'
import { bank, concept, level, paymentMethod, schoolYear, user } from './db/schema'

export function getStatus({ db, sqlite }: OpenDatabase, databasePath: string): AppStatus {
  const tables = sqlite
    .prepare(
      "select count(*) as n from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_\\_%' escape '\\'"
    )
    .get() as { n: number }

  const activeYear = db
    .select({ name: schoolYear.name })
    .from(schoolYear)
    .where(eq(schoolYear.status, 'active'))
    .get()

  return {
    databasePath,
    tableCount: tables.n,
    activeSchoolYear: activeYear?.name ?? null,
    levels: db
      .select({ name: level.name })
      .from(level)
      .orderBy(asc(level.sortOrder))
      .all()
      .map((r) => r.name),
    concepts: db
      .select({ name: concept.name })
      .from(concept)
      .orderBy(asc(concept.id))
      .all()
      .map((r) => r.name),
    paymentMethods: db
      .select({ name: paymentMethod.name })
      .from(paymentMethod)
      .orderBy(asc(paymentMethod.id))
      .all()
      .map((r) => r.name),
    bankCount: countRows(db, bank),
    hasUser: countRows(db, user) > 0
  }
}
