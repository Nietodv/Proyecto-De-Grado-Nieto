// Values stored in the database. The Spanish labels shown to the user live in the renderer.

export const SCHOOL_YEAR_STATUSES = ['active', 'closed'] as const
export type SchoolYearStatus = (typeof SCHOOL_YEAR_STATUSES)[number]

export const CONCEPT_TYPES = ['one_time', 'monthly', 'late_fee'] as const
export type ConceptType = (typeof CONCEPT_TYPES)[number]

export const SHIFTS = ['half', 'full'] as const
export type Shift = (typeof SHIFTS)[number]

export const CURRENCIES = ['USD', 'BS'] as const
export type Currency = (typeof CURRENCIES)[number]

export const PICKUP_OPTIONS = ['mother', 'father', 'both'] as const
export type PickupOption = (typeof PICKUP_OPTIONS)[number]

export const ENROLLMENT_STATUSES = ['active', 'withdrawn', 'completed'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const CHARGE_STATUSES = ['pending', 'paid', 'void'] as const
export type ChargeStatus = (typeof CHARGE_STATUSES)[number]

export const LATE_FEE_MODES = ['automatic', 'suggested', 'disabled'] as const
export type LateFeeMode = (typeof LATE_FEE_MODES)[number]

export const ADVANCE_MONTHLY_FEES = ['none', 'first', 'first_and_last'] as const
export type AdvanceMonthlyFees = (typeof ADVANCE_MONTHLY_FEES)[number]

export const LATE_ENROLLMENT_BILLING = ['from_enrollment_month', 'full_year'] as const
export type LateEnrollmentBilling = (typeof LATE_ENROLLMENT_BILLING)[number]

// Keys of the `setting` table. Values are stored as text.
export const SETTING_KEYS = [
  'due_day',
  'late_fee_mode',
  'late_fee_amount_usd',
  'advance_monthly_fees',
  'late_enrollment_billing'
] as const
export type SettingKey = (typeof SETTING_KEYS)[number]
