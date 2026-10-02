import type { AppState } from '../types/store'
import { todayKey } from './time'
import { WARDS } from '../types/admission'
import type { Admission, Bed, Ward } from '../types/admission'
import type { PaymentItem } from '../types/payment'
import { admissionBillItems, stayDays, sumItems } from '../utils/billing'

export function getBeds(state: AppState): Bed[] {
  return [...state.beds].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

export function getBedById(state: AppState, bedId: string): Bed | null {
  return state.beds.find((b) => b.bedId === bedId) ?? null
}

export function getAvailableBeds(state: AppState): Bed[] {
  return getBeds(state).filter((b) => b.status === 'Available')
}

/** A ward's beds, in room order. */
export function getBedsForWard(state: AppState, ward: Ward): Bed[] {
  return getBeds(state).filter((b) => b.ward === ward)
}

/** The bed the admit flow suggests for a ward — the first free one. */
export function getFirstFreeBed(state: AppState, ward: Ward): Bed | null {
  return getBeds(state).find((b) => b.ward === ward && b.status === 'Available') ?? null
}

export function getAdmissions(state: AppState): Admission[] {
  return [...state.admissions].sort((a, b) => b.createdAt - a.createdAt)
}

export function getAdmissionById(state: AppState, admissionId: string): Admission | null {
  return state.admissions.find((a) => a.admissionId === admissionId) ?? null
}

export function getAdmissionsForPatient(state: AppState, patientId: string): Admission[] {
  return getAdmissions(state).filter((a) => a.patientId === patientId)
}

// ------------------------------------------------- Ward Status

export interface WardSummary {
  ward: Ward
  /** Plain-language ward type shown beside the name. */
  type: string
  total: number
  occupied: number
  available: number
  beds: Bed[]
}

const WARD_TYPE_LABEL: Record<Ward, string> = {
  'General Ward': 'General',
  'Private Ward': 'Private',
  'Semi-Private Ward': 'Semi-Private',
  ICU: 'ICU',
  Emergency: 'Emergency',
}

/** One row per ward, counted straight from the bed records — the same beds an
 *  admission occupies — so capacity, occupied and available can never drift
 *  from the admissions themselves. */
export function getWardSummaries(state: AppState): WardSummary[] {
  return WARDS.map((ward) => {
    const beds = getBeds(state).filter((b) => b.ward === ward)
    return {
      ward,
      type: WARD_TYPE_LABEL[ward],
      total: beds.length,
      occupied: beds.filter((b) => b.status === 'Occupied').length,
      available: beds.filter((b) => b.status === 'Available').length,
      beds,
    }
  }).filter((w) => w.total > 0)
}

export interface AdmissionOverview {
  totalAdmitted: number
  todaysAdmissions: number
  pendingAdmissions: number
  availableBeds: number
  occupiedBeds: number
}

export function getAdmissionOverview(state: AppState): AdmissionOverview {
  const today = todayKey()
  return {
    totalAdmitted: state.admissions.filter((a) => a.status === 'Admitted').length,
    todaysAdmissions: state.admissions.filter(
      (a) => a.status !== 'Cancelled' && todayKey(new Date(a.admittedAt ?? a.createdAt)) === today,
    ).length,
    pendingAdmissions: state.admissions.filter((a) => a.status === 'Pending' || a.status === 'Bed Reserved').length,
    availableBeds: state.beds.filter((b) => b.status === 'Available').length,
    occupiedBeds: state.beds.filter((b) => b.status === 'Occupied').length,
  }
}

/** Patients who are in a bed right now. */
export function getCurrentAdmissions(state: AppState): Admission[] {
  return getAdmissions(state).filter((a) => a.status === 'Admitted')
}

// --------------------------------------------------------- admission billing

export interface AdmissionBilling {
  items: PaymentItem[]
  days: number
  total: number
  paid: number
  pending: number
  paymentId: string | null
}

/** One admission's bill as of a moment: what the stay costs so far (admission
 *  charge + bed/room charge for the days stayed), what is already paid against
 *  the admission's Payment record, and what is still pending. For a discharged
 *  admission it reads the settled Payment record instead. */
export function computeAdmissionBilling(state: AppState, admission: Admission, asOf: number): AdmissionBilling {
  const payment = admission.paymentId ? state.payments.find((p) => p.paymentId === admission.paymentId) ?? null : null
  if (admission.status === 'Discharged' && payment) {
    return {
      items: payment.items,
      days: stayDays(admission.admittedAt ?? admission.createdAt, admission.dischargedAt ?? asOf),
      total: payment.totalAmount,
      paid: payment.paidAmount,
      pending: payment.balance,
      paymentId: payment.paymentId,
    }
  }
  const start = admission.admittedAt ?? admission.createdAt
  const days = stayDays(start, asOf)
  const items = admissionBillItems(admission.roomType ?? 'General', days)
  const total = sumItems(items)
  const paid = payment ? payment.paidAmount : 0
  return { items, days, total, paid, pending: Math.max(0, total - paid), paymentId: payment ? payment.paymentId : null }
}

export function getAdmissionBilling(state: AppState, admissionId: string, asOf: number): AdmissionBilling | null {
  const admission = state.admissions.find((a) => a.admissionId === admissionId)
  return admission ? computeAdmissionBilling(state, admission, asOf) : null
}

/** Patients discharged today — counted from the admission records the Discharge
 *  workflow writes to. */
export function getDischargesToday(state: AppState): number {
  const today = todayKey()
  return state.admissions.filter(
    (a) => a.status === 'Discharged' && a.dischargedAt !== null && todayKey(new Date(a.dischargedAt)) === today,
  ).length
}
