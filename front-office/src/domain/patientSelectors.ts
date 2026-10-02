// What the patient profile shows — derived, read-only, from the same records
// every other screen uses. The front office has no clinical read, so the
// "risk" here is built only from facts this desk owns: where the patient is
// admitted and whether a medico-legal case is open.
import type { AppState } from '../types/store'
import type { Admission } from '../types/admission'
import type { Payment } from '../types/payment'
import type { PatientAppointmentRow } from '../types/appointment'
import type { Provider } from '../types/doctor'
import type { QueueToken } from '../types/queue'
import { computeAdmissionBilling } from './admissionSelectors'
import { getAppointmentsForPatient, getProviderById } from './selectors'
import { billDisplayStatus, billNumberFor, billServicesSummary, formatRupees, isBillDue, stayDays } from '../utils/billing'
import { appointmentStatusLabel } from '../utils/appointment'
import { formatDateKey } from '../utils/dates'

export type RiskLevel = 'High' | 'Watch' | 'Normal'

export interface PatientHeaderSummary {
  risk: { level: RiskLevel; reason: string }
  payment: { status: 'Paid' | 'Partial' | 'Pending' | 'Failed' | 'No bills'; due: number }
  /** The current admission — admitted, or waiting for a bed. */
  admission: Admission | null
  inpatient: { ward: string; bed: string; day: number; critical: boolean } | null
}

const OPEN_ADMISSION = ['Pending', 'Bed Reserved', 'Admitted']

export function getCurrentAdmissionForPatient(state: AppState, patientId: string): Admission | null {
  return state.admissions.find((a) => a.patientId === patientId && OPEN_ADMISSION.includes(a.status)) ?? null
}

/** The profile header: risk dot, payment chip and inpatient tag. An
 *  inpatient's bill is read live (the stay keeps accruing), so day 3 never
 *  reads "Paid" off a day-1 bill. */
export function getPatientHeader(state: AppState, patientId: string, asOf: number): PatientHeaderSummary {
  const admission = getCurrentAdmissionForPatient(state, patientId)
  const admitted = admission?.status === 'Admitted' ? admission : null
  const critical = Boolean(admitted && (admitted.wardLabel === 'ICU' || admitted.wardLabel === 'Emergency'))
  const openMlc = state.mlcRecords.find((r) => r.patientId === patientId && r.acknowledgedAt === null) ?? null

  const reasons: string[] = []
  let level: RiskLevel = 'Normal'
  if (admitted && critical) {
    level = 'High'
    reasons.push(`In ${admitted.wardLabel} · ${admitted.bedNumber}`)
  }
  if (openMlc) {
    level = 'High'
    reasons.push(`${openMlc.mlcId} open — police acknowledgement awaited`)
  }
  if (level === 'Normal' && admission) {
    level = 'Watch'
    reasons.push(admitted ? `Inpatient · ${admitted.wardLabel} · ${admitted.bedNumber}` : 'Admission waiting for a bed')
  }

  const bills = state.payments.filter((p) => p.patientId === patientId)
  const dues = bills.filter(isBillDue)
  const admissionBillId = admitted?.paymentId ?? null
  const live = admitted ? computeAdmissionBilling(state, admitted, asOf) : null
  const due =
    dues.filter((bill) => bill.paymentId !== admissionBillId).reduce((sum, bill) => sum + bill.balance, 0) + (live?.pending ?? 0)
  const anyFailed = dues.some((bill) => billDisplayStatus(bill) === 'Failed')
  const anyPaidTowardDue =
    dues.some((bill) => bill.paidAmount > 0 && bill.paymentId !== admissionBillId) || (live ? live.paid > 0 && live.pending > 0 : false)

  return {
    risk: { level, reason: reasons.join(' · ') || 'Outpatient — no admission or open MLC' },
    payment: {
      status: anyFailed ? 'Failed' : due > 0 ? (anyPaidTowardDue ? 'Partial' : 'Pending') : bills.length > 0 ? 'Paid' : 'No bills',
      due,
    },
    admission,
    inpatient:
      admitted && admitted.wardLabel && admitted.bedNumber
        ? { ward: admitted.wardLabel, bed: admitted.bedNumber, day: stayDays(admitted.admittedAt ?? admitted.createdAt, asOf), critical }
        : null,
  }
}

// ------------------------------------------------------------------ timeline

/** What is coming up today and after: booked encounters and open walk-ins. */
export type UpcomingItem =
  | { kind: 'appointment'; id: string; at: number; appointment: PatientAppointmentRow; bill: Payment | null }
  | { kind: 'walk-in'; id: string; at: number; token: QueueToken; provider: Provider | null }

export type TimelineKind = 'registered' | 'encounter' | 'walk-in' | 'bill' | 'admitted' | 'discharged' | 'admission-cancelled' | 'mlc' | 'guest-pass'

export interface TimelineEvent {
  id: string
  at: number
  kind: TimelineKind
  title: string
  detail: string
  /** A status word, shown as a badge. */
  status?: string
  paymentId?: string
}

export interface PatientTimeline {
  upcoming: UpcomingItem[]
  history: TimelineEvent[]
}

const OPEN_APPOINTMENT = ['Scheduled', 'Payment Pending', 'Confirmed', 'Checked-in']
const OPEN_TOKEN = ['Waiting', 'Called', 'In consultation']

/** One patient's front-office story: what's coming up, then everything that
 *  happened — encounters, bills, admissions, MLC, guest passes — newest first. */
export function getPatientTimeline(state: AppState, patientId: string): PatientTimeline {
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) return { upcoming: [], history: [] }

  const upcoming: UpcomingItem[] = []
  const history: TimelineEvent[] = []

  for (const appointment of getAppointmentsForPatient(state, patientId)) {
    const doctor = appointment.provider?.name ?? 'Doctor'
    if (OPEN_APPOINTMENT.includes(appointment.status) && appointment.date >= state.today) {
      upcoming.push({
        kind: 'appointment',
        id: appointment.appointmentId,
        at: appointment.slotTimestamp,
        appointment,
        bill: state.payments.find((p) => p.appointmentId === appointment.appointmentId && p.status !== 'Cancelled') ?? null,
      })
      continue
    }
    history.push({
      id: `enc-${appointment.appointmentId}`,
      at: appointment.slotTimestamp,
      kind: 'encounter',
      title: `Outpatient encounter · ${doctor}`,
      detail: `${appointment.department} · ${formatDateKey(appointment.date)} ${appointment.slot}`,
      status: appointmentStatusLabel(appointment.status),
    })
  }

  for (const visit of state.visits) {
    if (visit.patientId !== patientId || visit.appointmentId) continue
    const token = state.queueTokens.find((t) => t.visitId === visit.visitId)
    const provider = getProviderById(state, visit.providerId)
    if (token && OPEN_TOKEN.includes(token.status)) {
      upcoming.push({ kind: 'walk-in', id: visit.visitId, at: visit.arrivalTime, token, provider })
    } else {
      history.push({
        id: `walk-${visit.visitId}`,
        at: visit.arrivalTime,
        kind: 'walk-in',
        title: `Walk-in encounter · ${provider?.name ?? 'Doctor'}`,
        detail: `${provider?.department ?? ''}${token ? ` · ${token.tokenNumber}` : ''}`,
        status: token?.status === 'No-show' ? 'No-show' : 'Completed',
      })
    }
  }

  for (const bill of state.payments) {
    if (bill.patientId !== patientId) continue
    history.push({
      id: `bill-${bill.paymentId}`,
      at: bill.createdAt,
      kind: 'bill',
      title: billServicesSummary(bill),
      detail: `${billNumberFor(bill)} · ${formatRupees(bill.totalAmount)}${isBillDue(bill) ? ` · ${formatRupees(bill.balance)} due` : ''}`,
      status: billDisplayStatus(bill),
      paymentId: bill.paymentId,
    })
  }

  for (const admission of state.admissions) {
    if (admission.patientId !== patientId) continue
    const where = [admission.wardLabel, admission.bedNumber].filter(Boolean).join(' · ') || 'Waiting for a bed'
    if (admission.admittedAt) {
      history.push({
        id: `adm-${admission.admissionId}`,
        at: admission.admittedAt,
        kind: 'admitted',
        title: `Admitted · ${where}`,
        detail: `${admission.admissionNumber} · ${admission.doctorName} · ${admission.department}`,
        status: admission.status === 'Admitted' ? 'Admitted' : undefined,
      })
    } else if (admission.status === 'Pending' || admission.status === 'Bed Reserved') {
      history.push({
        id: `adm-${admission.admissionId}`,
        at: admission.createdAt,
        kind: 'admitted',
        title: 'Admission requested',
        detail: `${admission.admissionNumber} · ${admission.doctorName} · ${admission.department}`,
        status: 'Pending',
      })
    }
    if (admission.status === 'Discharged' && admission.dischargedAt) {
      history.push({
        id: `dis-${admission.admissionId}`,
        at: admission.dischargedAt,
        kind: 'discharged',
        title: `Discharged · ${admission.dischargeType ?? 'Normal Discharge'}`,
        detail: `${admission.admissionNumber} · ${where}`,
        status: 'Discharged',
      })
    }
    if (admission.status === 'Cancelled' && admission.cancelledAt) {
      history.push({
        id: `can-${admission.admissionId}`,
        at: admission.cancelledAt,
        kind: 'admission-cancelled',
        title: 'Admission cancelled',
        detail: `${admission.admissionNumber} · ${admission.cancelReason ?? ''}`,
        status: 'Cancelled',
      })
    }
  }

  for (const record of state.mlcRecords) {
    if (record.patientId !== patientId) continue
    history.push({
      id: `mlc-${record.mlcId}`,
      at: record.registeredAt,
      kind: 'mlc',
      title: `Medico-legal case · ${record.mlcId}`,
      detail: `${record.category} · ${record.policeStation}`,
      status: record.acknowledgedAt ? 'Acknowledged' : 'Open',
    })
  }

  for (const pass of state.guestPasses) {
    if (pass.patientId !== patientId) continue
    history.push({
      id: `pass-${pass.passId}`,
      at: pass.issuedAt,
      kind: 'guest-pass',
      title: `Guest pass · ${pass.passId}`,
      detail: `Ward ${pass.ward} · ${pass.relationship}`,
      status: pass.returned ? 'Returned' : 'Issued',
    })
  }

  history.push({ id: 'registered', at: patient.createdAt, kind: 'registered', title: 'Registered', detail: patient.uhid })

  upcoming.sort((a, b) => a.at - b.at)
  history.sort((a, b) => b.at - a.at)
  return { upcoming, history }
}
