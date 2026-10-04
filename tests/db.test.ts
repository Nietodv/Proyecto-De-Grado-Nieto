import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { countRows, type OpenDatabase, openDatabase } from '../src/main/db/client'
import {
  authorizedPerson,
  charge,
  child,
  childGuardian,
  concept,
  enrollment,
  guardian,
  level,
  schoolYear,
  setting
} from '../src/main/db/schema'
import { seedDefaults } from '../src/main/db/seed'

const MIGRATIONS = join(__dirname, '..', 'drizzle')

let database: OpenDatabase

beforeEach(() => {
  database = openDatabase(':memory:', MIGRATIONS)
})

function addChild(): number {
  return database.db
    .insert(child)
    .values({ firstNames: 'Niño', lastNames: 'De Prueba', birthDate: '2024-03-10', sex: 'M' })
    .returning({ id: child.id })
    .get().id
}

function addGuardian(idNumber: string): number {
  return database.db
    .insert(guardian)
    .values({ idNumber, firstNames: 'Persona', lastNames: 'De Prueba' })
    .returning({ id: guardian.id })
    .get().id
}

describe('migration', () => {
  it('creates the sixteen tables of the model', () => {
    const tables = database.sqlite
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_\\_%' escape '\\' order by name"
      )
      .all()
      .map((row) => (row as { name: string }).name)

    expect(tables).toEqual([
      'authorized_person',
      'bank',
      'bcv_rate',
      'charge',
      'child',
      'child_guardian',
      'concept',
      'enrollment',
      'fee',
      'guardian',
      'level',
      'payment',
      'payment_method',
      'school_year',
      'setting',
      'user'
    ])
  })

  it('keeps all the data in a single file', () => {
    expect(database.sqlite.pragma('journal_mode', { simple: true })).not.toBe('wal')
    expect(database.sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })
})

describe('default data', () => {
  it('loads the proposed defaults', () => {
    const { db } = database
    const settings = Object.fromEntries(
      db
        .select()
        .from(setting)
        .all()
        .map((row) => [row.key, row.value])
    )

    expect(settings).toEqual({
      due_day: '5',
      late_fee_mode: 'suggested',
      late_fee_amount_usd: '500',
      advance_monthly_fees: 'first_and_last',
      late_enrollment_billing: 'from_enrollment_month'
    })
    expect(db.select().from(level).all().map((row) => row.name)).toEqual([
      'Maternal 1',
      'Maternal 2',
      'Maternal 3'
    ])
    expect(db.select().from(concept).all().map((row) => row.type)).toEqual([
      'one_time',
      'one_time',
      'monthly',
      'late_fee'
    ])
    expect(db.select().from(schoolYear).all()).toMatchObject([
      { name: '2026-2027', status: 'active' }
    ])
  })

  it('does not load them twice', () => {
    expect(seedDefaults(database.db)).toBe(false)
    expect(countRows(database.db, level)).toBe(3)
  })
})

describe('rules enforced by the schema', () => {
  it('allows only one representative per child', () => {
    const { db } = database
    const childId = addChild()
    const mother = addGuardian('V-1')
    const father = addGuardian('V-2')

    db.insert(childGuardian)
      .values({ childId, guardianId: mother, relationship: 'Madre', isRepresentative: true })
      .run()
    db.insert(childGuardian)
      .values({ childId, guardianId: father, relationship: 'Padre', isRepresentative: false })
      .run()

    expect(() =>
      db
        .update(childGuardian)
        .set({ isRepresentative: true })
        .where(eq(childGuardian.guardianId, father))
        .run()
    ).toThrow(/UNIQUE/)
  })

  it('lets siblings have different representatives', () => {
    const { db } = database
    const mother = addGuardian('V-1')
    const father = addGuardian('V-2')

    db.insert(childGuardian)
      .values([
        { childId: addChild(), guardianId: mother, relationship: 'Madre', isRepresentative: true },
        { childId: addChild(), guardianId: father, relationship: 'Padre', isRepresentative: true }
      ])
      .run()

    expect(countRows(db, childGuardian)).toBe(2)
  })

  it('keeps pick-up permission and emergency contact independent', () => {
    const { db } = database
    const childId = addChild()

    db.insert(authorizedPerson)
      .values([
        { childId, fullName: 'Tía', relationship: 'Tía', idNumber: 'V-3', canPickUp: true },
        { childId, fullName: 'Vecino', relationship: 'Vecino', phone: '0414', isEmergencyContact: true }
      ])
      .run()

    const people = db.select().from(authorizedPerson).all()
    expect(people.map((p) => [p.canPickUp, p.isEmergencyContact])).toEqual([
      [true, false],
      [false, true]
    ])
  })

  it('allows only one enrollment per child and school year', () => {
    const { db } = database
    const childId = addChild()
    const values = {
      childId,
      schoolYearId: 1,
      levelId: 1,
      shift: 'half' as const,
      enrollmentDate: '2026-09-01'
    }

    db.insert(enrollment).values(values).run()
    expect(() => db.insert(enrollment).values({ ...values, levelId: 2 }).run()).toThrow(/UNIQUE/)
  })

  it('allows only one active school year', () => {
    expect(() =>
      database.db
        .insert(schoolYear)
        .values({ name: '2027-2028', startDate: '2027-09-01', endDate: '2028-08-31' })
        .run()
    ).toThrow(/UNIQUE/)
  })

  it('rejects a paid charge without a payment and unknown references', () => {
    const { db } = database
    const enrollmentId = db
      .insert(enrollment)
      .values({
        childId: addChild(),
        schoolYearId: 1,
        levelId: 1,
        shift: 'full',
        enrollmentDate: '2026-09-01'
      })
      .returning({ id: enrollment.id })
      .get().id
    const base = { enrollmentId, conceptId: 3, amountUsd: 4000, dueDate: '2026-10-05' }

    expect(() => db.insert(charge).values({ ...base, status: 'paid' }).run()).toThrow(/CHECK/)
    expect(() => db.insert(charge).values({ ...base, conceptId: 999 }).run()).toThrow(/FOREIGN KEY/)
    expect(db.insert(charge).values(base).returning().get().status).toBe('pending')
  })
})
