import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  check,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'
import {
  CHARGE_STATUSES,
  CONCEPT_TYPES,
  CURRENCIES,
  ENROLLMENT_STATUSES,
  PICKUP_OPTIONS,
  SCHOOL_YEAR_STATUSES,
  SHIFTS
} from '../../shared/enums'

// Conventions:
// - Money columns (`amount_usd`, `amount_bs`) hold integer cents, never decimals.
// - Dates are ISO text: 'YYYY-MM-DD'. Periods are 'YYYY-MM'.
// - CHECK and partial-index conditions use bare column names so SQLite accepts them.

const list = (values: readonly string[]) => values.map((v) => `'${v}'`).join(', ')
const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} in (${list(values)})`)
const nullOrInList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} is null or ${column} in (${list(values)})`)

// ---------------------------------------------------------------- standalone

export const user = sqliteTable('user', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull()
})

export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

// Only used to suggest the rate of the day; each payment keeps its own rate.
export const bcvRate = sqliteTable('bcv_rate', {
  date: text('date').primaryKey(),
  rate: real('rate').notNull()
})

// ------------------------------------------------------------------ catalogs

export const schoolYear = sqliteTable(
  'school_year',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    status: text('status', { enum: SCHOOL_YEAR_STATUSES }).notNull().default('active')
  },
  () => [
    check('school_year_status_check', inList('status', SCHOOL_YEAR_STATUSES)),
    uniqueIndex('school_year_single_active').on(sql`status`).where(sql`status = 'active'`)
  ]
)

export const level = sqliteTable('level', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true)
})

export const concept = sqliteTable(
  'concept',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    type: text('type', { enum: CONCEPT_TYPES }).notNull(),
    chargedOnEnrollment: integer('charged_on_enrollment', { mode: 'boolean' })
      .notNull()
      .default(false),
    chargedOnPromotion: integer('charged_on_promotion', { mode: 'boolean' })
      .notNull()
      .default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true)
  },
  () => [check('concept_type_check', inList('type', CONCEPT_TYPES))]
)

// Empty level_id / shift mean "applies to all"; the most specific match wins.
export const fee = sqliteTable(
  'fee',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolYearId: integer('school_year_id')
      .notNull()
      .references(() => schoolYear.id),
    conceptId: integer('concept_id')
      .notNull()
      .references(() => concept.id),
    levelId: integer('level_id').references(() => level.id),
    shift: text('shift', { enum: SHIFTS }),
    amountUsd: integer('amount_usd').notNull()
  },
  () => [
    check('fee_shift_check', nullOrInList('shift', SHIFTS)),
    check('fee_amount_check', sql`amount_usd >= 0`)
  ]
)

export const paymentMethod = sqliteTable(
  'payment_method',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    currency: text('currency', { enum: CURRENCIES }).notNull(),
    requiresReference: integer('requires_reference', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true)
  },
  () => [check('payment_method_currency_check', inList('currency', CURRENCIES))]
)

export const bank = sqliteTable('bank', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true)
})

// -------------------------------------------------------------------- people

// Mother and father are both stored here; child_guardian marks the representative.
export const guardian = sqliteTable('guardian', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idNumber: text('id_number').notNull().unique(),
  firstNames: text('first_names').notNull(),
  lastNames: text('last_names').notNull(),
  mobilePhone: text('mobile_phone'),
  homePhone: text('home_phone'),
  address: text('address'),
  email: text('email'),
  occupation: text('occupation'),
  workplace: text('workplace')
})

export const child = sqliteTable(
  'child',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    firstNames: text('first_names').notNull(),
    lastNames: text('last_names').notNull(),
    birthDate: text('birth_date').notNull(),
    sex: text('sex', { enum: ['M', 'F'] }).notNull(),
    schoolIdNumber: text('school_id_number'),
    medicationAllergy: text('medication_allergy'),
    foodAllergy: text('food_allergy'),
    diagnosis: text('diagnosis'),
    notes: text('notes'),
    pickup: text('pickup', { enum: PICKUP_OPTIONS })
  },
  () => [
    check('child_sex_check', inList('sex', ['M', 'F'])),
    check('child_pickup_check', nullOrInList('pickup', PICKUP_OPTIONS))
  ]
)

export const childGuardian = sqliteTable(
  'child_guardian',
  {
    childId: integer('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardian.id),
    relationship: text('relationship').notNull(),
    isRepresentative: integer('is_representative', { mode: 'boolean' }).notNull().default(false)
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.guardianId] }),
    // Exactly one representative per child; the representative answers for payments.
    uniqueIndex('child_guardian_single_representative')
      .on(t.childId)
      .where(sql`is_representative = 1`)
  ]
)

// Holds both lists of the enrollment form: who may pick the child up and who to call
// in an emergency. The two flags are independent.
export const authorizedPerson = sqliteTable('authorized_person', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => child.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  idNumber: text('id_number'),
  relationship: text('relationship').notNull(),
  phone: text('phone'),
  canPickUp: integer('can_pick_up', { mode: 'boolean' }).notNull().default(false),
  isEmergencyContact: integer('is_emergency_contact', { mode: 'boolean' }).notNull().default(false)
})

// ---------------------------------------------------------------- operations

export const enrollment = sqliteTable(
  'enrollment',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    childId: integer('child_id')
      .notNull()
      .references(() => child.id),
    schoolYearId: integer('school_year_id')
      .notNull()
      .references(() => schoolYear.id),
    levelId: integer('level_id')
      .notNull()
      .references(() => level.id),
    shift: text('shift', { enum: SHIFTS }).notNull(),
    enrollmentDate: text('enrollment_date').notNull(),
    status: text('status', { enum: ENROLLMENT_STATUSES }).notNull().default('active'),
    withdrawalDate: text('withdrawal_date')
  },
  (t) => [
    uniqueIndex('enrollment_child_school_year').on(t.childId, t.schoolYearId),
    check('enrollment_shift_check', inList('shift', SHIFTS)),
    check('enrollment_status_check', inList('status', ENROLLMENT_STATUSES))
  ]
)

export const payment = sqliteTable(
  'payment',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    paymentMethodId: integer('payment_method_id')
      .notNull()
      .references(() => paymentMethod.id),
    bankId: integer('bank_id').references(() => bank.id),
    paymentDate: text('payment_date').notNull(),
    amountUsd: integer('amount_usd').notNull(),
    // Bolívares per dollar on the payment date. Never recalculated afterwards.
    bcvRate: real('bcv_rate').notNull(),
    amountBs: integer('amount_bs').notNull(),
    reference: text('reference'),
    note: text('note'),
    recordedAt: text('recorded_at').notNull()
  },
  () => [check('payment_amount_check', sql`amount_usd > 0 and amount_bs > 0 and bcv_rate > 0`)]
)

// Debt is stored as charges. With no partial payments, a charge points straight at
// the payment that settled it.
export const charge = sqliteTable(
  'charge',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    enrollmentId: integer('enrollment_id')
      .notNull()
      .references(() => enrollment.id),
    conceptId: integer('concept_id')
      .notNull()
      .references(() => concept.id),
    paymentId: integer('payment_id').references(() => payment.id),
    // A late-fee charge points at the charge that caused it.
    sourceChargeId: integer('source_charge_id').references((): AnySQLiteColumn => charge.id),
    period: text('period'),
    amountUsd: integer('amount_usd').notNull(),
    dueDate: text('due_date').notNull(),
    status: text('status', { enum: CHARGE_STATUSES }).notNull().default('pending')
  },
  () => [
    check('charge_status_check', inList('status', CHARGE_STATUSES)),
    check('charge_amount_check', sql`amount_usd >= 0`),
    check(
      'charge_paid_has_payment_check',
      sql`(status = 'paid') = (payment_id is not null)`
    )
  ]
)
