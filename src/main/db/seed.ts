import type { ConceptType, Currency, SettingKey } from '../../shared/enums'
import type { Db } from './client'
import { bank, concept, level, paymentMethod, schoolYear, setting } from './schema'

// Defaults taken from the centre's enrollment form. None are confirmed by the centre;
// all of them can be changed from the settings screen. Fee amounts are not seeded:
// the administrator enters them.

const SETTINGS: Record<SettingKey, string> = {
  due_day: '5',
  late_fee_mode: 'suggested',
  late_fee_amount_usd: '500', // cents
  advance_monthly_fees: 'first_and_last',
  late_enrollment_billing: 'from_enrollment_month'
}

const LEVELS = ['Maternal 1', 'Maternal 2', 'Maternal 3']

const CONCEPTS: {
  name: string
  type: ConceptType
  chargedOnEnrollment: boolean
  chargedOnPromotion: boolean
}[] = [
  { name: 'Inscripción', type: 'one_time', chargedOnEnrollment: true, chargedOnPromotion: true },
  { name: 'Seguro escolar', type: 'one_time', chargedOnEnrollment: true, chargedOnPromotion: true },
  { name: 'Mensualidad', type: 'monthly', chargedOnEnrollment: false, chargedOnPromotion: false },
  { name: 'Mora', type: 'late_fee', chargedOnEnrollment: false, chargedOnPromotion: false }
]

const PAYMENT_METHODS: { name: string; currency: Currency; requiresReference: boolean }[] = [
  { name: 'Transferencia', currency: 'BS', requiresReference: true },
  { name: 'Pago móvil', currency: 'BS', requiresReference: true },
  { name: 'Efectivo', currency: 'USD', requiresReference: false }
]

const BANKS = [
  'Banco de Venezuela',
  'Banesco',
  'Mercantil',
  'Provincial',
  'Banco Nacional de Crédito',
  'Bancamiga',
  'Banco del Tesoro',
  'Bicentenario'
]

/** Loads the default catalogs and settings once, on a database that has none. */
export function seedDefaults(db: Db): boolean {
  const alreadySeeded = db.select({ key: setting.key }).from(setting).limit(1).get()
  if (alreadySeeded) return false

  db.transaction((tx) => {
    tx.insert(setting)
      .values(Object.entries(SETTINGS).map(([key, value]) => ({ key, value })))
      .run()
    tx.insert(level)
      .values(LEVELS.map((name, index) => ({ name, sortOrder: index + 1 })))
      .run()
    tx.insert(concept).values(CONCEPTS).run()
    tx.insert(paymentMethod).values(PAYMENT_METHODS).run()
    tx.insert(bank)
      .values(BANKS.map((name) => ({ name })))
      .run()
    tx.insert(schoolYear)
      .values({ name: '2026-2027', startDate: '2026-09-01', endDate: '2027-08-31' })
      .run()
  })
  return true
}
