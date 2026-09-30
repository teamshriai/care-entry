import type { Payment, PaymentItem, PaymentStatus } from '../types/payment'
import { toneFor } from './tone'
import type { Tone } from './tone'

/** The one Registration Fee charge — Care Entry and appointment booking's
 *  own bill-creation step both reuse this exact item, so there is a single
 *  definition of what "Registration Fee" means as a charge. */
export const REGISTRATION_FEE: PaymentItem = { code: 'REG-FEE', description: 'Registration Fee', amount: 100 }

// Billing & Accounts reuses the Payment record as the "Bill" — a Payment
// already carries everything a front-desk bill needs (items, total, paid,
// balance, a Draft→Paid lifecycle). Rather than a second, parallel Bill
// entity that could drift out of sync with the same charge, a Bill Number
// is a display-only reformatting of the Payment's own receipt number, so
// there is exactly one record and one source of truth per charge.
export function billNumberFor(payment: Payment): string {
  return `BIL-${payment.receiptNo.replace('RCT-', '')}`
}

export function billServicesSummary(payment: Payment): string {
  return payment.items.map((item) => item.description).join(' + ')
}

/** A bill's own status tone — deliberately separate from the shared,
 *  generic `toneFor('Pending')` (which many unrelated statuses across the
 *  app also key off, and stays amber for those). An unpaid bill reads as
 *  red here, everywhere a bill's status is shown, without touching that
 *  shared mapping or any other module's "Pending" badge. */
export function paymentStatusTone(status: PaymentStatus): Tone {
  if (status === 'Pending') return 'critical'
  return toneFor(status)
}
