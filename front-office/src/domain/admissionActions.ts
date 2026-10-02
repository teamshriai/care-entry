// IP Admission's own mutation path — same discipline as actions.ts,
// inventoryActions.ts and labActions.ts. Billing is NOT reimplemented here:
// createBillForAdmission calls the existing createPaymentBill and only
// stores the resulting paymentId back onto the Admission.
import { getState, setState } from './store'
import { withActivity, createPaymentBill, collectPayment } from './actions'
import { DomainError } from './errors'
import { MOBILE_ERROR, isValidMobile } from '../utils/phone'
import type { AppState } from '../types/store'
import { computeAdmissionBilling } from './admissionSelectors'
import { IP_PAYMENT_METHODS, admissionBillItems, formatRupees, sumItems } from '../utils/billing'
import type { Admission, AdmissionPaymentInput, Bed, CreateAdmissionInput, DischargeDetails } from '../types/admission'
import type { Payment, PaymentItem } from '../types/payment'

function requireAdmission(state: AppState, admissionId: string): Admission {
  const admission = state.admissions.find((a) => a.admissionId === admissionId)
  if (!admission) throw new DomainError('NOT_FOUND', 'That admission no longer exists.')
  return admission
}

function requireBed(state: AppState, bedId: string): Bed {
  const bed = state.beds.find((b) => b.bedId === bedId)
  if (!bed) throw new DomainError('NOT_FOUND', 'That bed no longer exists.')
  return bed
}

/** The only place a bed's status changes — every admit/cancel/discharge
 *  action routes through here so a bed can never end up pointing at two
 *  admissions at once. */
function setBedStatus(current: AppState, bedId: string, status: Bed['status'], admissionId: string | null): AppState['beds'] {
  return current.beds.map((b) => (b.bedId === bedId ? { ...b, status, currentAdmissionId: admissionId } : b))
}

/** A payment collected at admission/discharge must use an allowed method and be the
 *  exact amount due. */
function assertPayment(payment: AdmissionPaymentInput | undefined, due: number, what: string): void {
  if (!payment || !IP_PAYMENT_METHODS.includes(payment.method)) {
    throw new DomainError('VALIDATION', 'Select a payment method.')
  }
  if (!(payment.amount > 0)) throw new DomainError('VALIDATION', 'Payment amount must be greater than zero.')
  if (payment.amount !== due) {
    throw new DomainError('VALIDATION', `Collect the full ${what} of ${formatRupees(due)}.`)
  }
}

/**
 * Admits a patient to a bed, raises the admission's bill and — for a
 * self-pay patient — takes the first-day payment, as one step. The hospital
 * has no pay-later, so a self-pay admission is saved only with its payment;
 * an insured, TPA or corporate patient is billed to the payer and settled at
 * discharge. A request already waiting for a bed is admitted rather than
 * duplicated. Everything is checked before anything is saved.
 */
export function admitPatient(input: CreateAdmissionInput): { admission: Admission; bill: Payment } {
  const state = getState()
  if (!input.patientId) throw new DomainError('VALIDATION', 'Select a patient before admitting.')
  const patient = state.patients.find((p) => p.patientId === input.patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')
  const already = state.admissions.find((a) => a.patientId === patient.patientId && a.status === 'Admitted')
  if (already) {
    throw new DomainError('ALREADY_ADMITTED', `${patient.name} is already admitted (${already.wardLabel} · ${already.bedNumber}).`)
  }

  const doctor = state.providers.find((p) => p.providerId === input.doctorId)
  if (!doctor || doctor.status !== 'Active') throw new DomainError('VALIDATION', 'Select an admitting doctor.')

  if (!input.reason?.trim()) throw new DomainError('VALIDATION', 'A reason for admission is required.')
  if (!input.attendant.name?.trim() || !input.attendant.phone?.trim()) {
    throw new DomainError('VALIDATION', 'Attendant name and phone are required.')
  }
  if (!isValidMobile(input.attendant.phone.trim())) throw new DomainError('VALIDATION', MOBILE_ERROR)

  const bed = requireBed(state, input.bedId)
  if (bed.status !== 'Available') {
    throw new DomainError('BED_UNAVAILABLE', `${bed.bedNumber} is no longer available — choose another bed.`)
  }

  const selfPay = input.paymentType === 'Self Pay'
  if (selfPay && !input.paymentMethod) {
    throw new DomainError('VALIDATION', 'A self-pay admission is paid when admitted — take the first-day payment.')
  }
  const billItems = admissionBillItems(bed.roomType, 1)

  // A request already waiting for a bed (Pending / Bed Reserved) becomes this admission.
  const waiting = state.admissions.find(
    (a) => a.patientId === patient.patientId && (a.status === 'Pending' || a.status === 'Bed Reserved'),
  )
  const seq = state.nextIds.admission
  const now = Date.now()
  const admissionId = waiting?.admissionId ?? `adm-${seq}`
  const admissionNumber = waiting?.admissionNumber ?? `ADM-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`

  const admission: Admission = {
    admissionId,
    admissionNumber,
    patientId: patient.patientId,
    patientName: patient.name,
    doctorId: doctor.providerId,
    doctorName: doctor.name,
    department: doctor.department,
    admissionType: input.admissionType,
    reason: input.reason.trim(),
    referralSource: input.referralSource,
    bedId: bed.bedId,
    wardLabel: bed.ward,
    roomNumber: bed.roomNumber,
    bedNumber: bed.bedNumber,
    roomType: bed.roomType,
    attendant: input.attendant,
    paymentType: input.paymentType,
    insuranceProvider: selfPay ? null : input.insuranceProvider?.trim() || null,
    policyNumber: selfPay ? null : input.policyNumber?.trim() || null,
    paymentId: null,
    status: 'Admitted',
    admittedAt: now,
    dischargedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: waiting?.createdAt ?? now,
    updatedAt: now,
  }

  setState((current) => {
    const currentBed = current.beds.find((b) => b.bedId === input.bedId)
    if (!currentBed || currentBed.status !== 'Available') {
      throw new DomainError('BED_UNAVAILABLE', 'That bed was just taken — choose another bed.')
    }
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient admitted', meta: `${admissionNumber} · ${patient.name} · ${bed.bedNumber}` },
    ])
    return {
      ...current,
      admissions: waiting
        ? current.admissions.map((a) => (a.admissionId === admissionId ? admission : a))
        : [...current.admissions, admission],
      beds: setBedStatus(current, bed.bedId, 'Occupied', admission.admissionId),
      activityLog,
      nextIds: waiting ? { ...current.nextIds, activity: activitySeq } : { ...current.nextIds, admission: seq + 1, activity: activitySeq },
    }
  })

  // The admission's bill, linked both ways; a self-pay patient pays the first day now.
  const billed = createBillForAdmission(admissionId, billItems)
  let bill = getState().payments.find((p) => p.paymentId === billed.paymentId)!
  if (selfPay && input.paymentMethod) {
    bill = collectPayment({ paymentId: bill.paymentId, amount: bill.balance, method: input.paymentMethod })
  }

  return { admission: requireAdmission(getState(), admissionId), bill }
}

/** Raises a bill against the existing Payment/Billing system for admission
 *  charges — the SAME createPaymentBill every other module uses. */
export function createBillForAdmission(admissionId: string, items: { code: string; description: string; amount: number }[]): Admission {
  const state = getState()
  const admission = requireAdmission(state, admissionId)
  if (admission.paymentId) throw new DomainError('INVALID_TRANSITION', 'This admission already has a bill.')
  if (!items.length) throw new DomainError('VALIDATION', 'Select at least one charge.')

  const bill = createPaymentBill({ patientId: admission.patientId, items, admissionId })

  let updated!: Admission
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Admission billed', meta: `${admission.admissionNumber} · ${bill.receiptNo}` },
    ])
    const admissions = current.admissions.map((a) => {
      if (a.admissionId !== admissionId) return a
      updated = { ...a, paymentId: bill.paymentId, updatedAt: Date.now() }
      return updated
    })
    return { ...current, admissions, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return updated
}

export function cancelAdmission(admissionId: string, reason: string): Admission {
  const state = getState()
  const admission = requireAdmission(state, admissionId)
  if (admission.status === 'Cancelled' || admission.status === 'Discharged') {
    throw new DomainError('INVALID_TRANSITION', `This admission is already ${admission.status.toLowerCase()}.`)
  }
  if (!reason?.trim()) throw new DomainError('VALIDATION', 'A cancellation reason is required.')

  const now = Date.now()
  let updated!: Admission
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Admission cancelled', meta: `${admission.admissionNumber} · ${reason.trim()}` },
    ])
    const admissions = current.admissions.map((a) => {
      if (a.admissionId !== admissionId) return a
      updated = { ...a, status: 'Cancelled', cancelledAt: now, cancelReason: reason.trim(), updatedAt: now }
      return updated
    })
    const beds = admission.bedId ? setBedStatus(current, admission.bedId, 'Available', null) : current.beds
    // Its bill goes with it while nothing has been paid; a paid deposit stays
    // on the bill for a refund.
    const payments = current.payments.map((p) =>
      p.paymentId === admission.paymentId && p.status === 'Pending' && p.paidAmount === 0
        ? { ...p, status: 'Cancelled' as const, cancelledAt: now, cancelReason: 'Admission cancelled', updatedAt: now }
        : p,
    )
    return { ...current, admissions, beds, payments, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return updated
}

/** Discharges an admitted patient. The final bill (admission charge + bed/room charge
 *  for the days stayed) is compared with what is already paid on the admission's
 *  Payment record; any pending amount must be collected here, in full, before the
 *  discharge goes through. Bed release, history and billing then follow from the one
 *  shared admission/bed/payment state. */
export function dischargeAdmission(
  admissionId: string,
  details?: DischargeDetails,
  pendingPayment?: AdmissionPaymentInput,
): Admission {
  const state = getState()
  const admission = requireAdmission(state, admissionId)
  if (admission.status !== 'Admitted') {
    throw new DomainError('INVALID_TRANSITION', `Cannot discharge an admission that is ${admission.status}.`)
  }

  const now = Date.now()
  const dischargedAt = details?.dischargedAt ?? now
  if (details) {
    if (dischargedAt > now + 60_000) throw new DomainError('VALIDATION', 'Discharge date cannot be in the future.')
    if (admission.admittedAt && dischargedAt < new Date(admission.admittedAt).setHours(0, 0, 0, 0)) {
      throw new DomainError('VALIDATION', 'Discharge date cannot be before the admission date.')
    }
  }

  // Final bill vs. what is already paid.
  const billing = computeAdmissionBilling(state, admission, dischargedAt)
  if (billing.pending > 0) assertPayment(pendingPayment, billing.pending, 'pending amount')

  // Make the admission's Payment record carry the final bill (create it if the admission
  // never had one), then collect the pending amount against it.
  let paymentId = admission.paymentId
  if (!paymentId) {
    const bill = createPaymentBill({ patientId: admission.patientId, items: billing.items, admissionId })
    paymentId = bill.paymentId
    setState((current) => ({
      ...current,
      admissions: current.admissions.map((a) => (a.admissionId === admissionId ? { ...a, paymentId: bill.paymentId } : a)),
    }))
  } else {
    syncPaymentToBill(paymentId, billing.items)
  }
  if (billing.pending > 0 && pendingPayment) {
    collectPayment({ paymentId, amount: pendingPayment.amount, method: pendingPayment.method })
  }

  let updated!: Admission
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient discharged', meta: admission.admissionNumber },
    ])
    const admissions = current.admissions.map((a) => {
      if (a.admissionId !== admissionId) return a
      updated = {
        ...a,
        status: 'Discharged',
        dischargedAt,
        dischargeType: details?.dischargeType ?? a.dischargeType ?? null,
        dischargeRemarks: details?.remarks?.trim() ? details.remarks.trim() : (a.dischargeRemarks ?? null),
        updatedAt: now,
      }
      return updated
    })
    const beds = admission.bedId ? setBedStatus(current, admission.bedId, 'Available', null) : current.beds
    return { ...current, admissions, beds, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return updated
}

/** Brings an admission's Payment record up to date with the final line items — the
 *  record's own items/total/balance/status, nothing else (paid amount and
 *  transactions are untouched). A cancelled or refunded bill is closed and is
 *  never re-opened by re-pricing. */
function syncPaymentToBill(paymentId: string, items: PaymentItem[]): void {
  const total = sumItems(items)
  setState((current) => ({
    ...current,
    payments: current.payments.map((p) => {
      if (p.paymentId !== paymentId) return p
      if (p.status === 'Cancelled' || p.status === 'Refunded') return p
      const balance = Math.max(0, total - p.paidAmount)
      const status = balance === 0 ? 'Paid' : p.paidAmount > 0 ? 'Partially Paid' : 'Pending'
      return { ...p, items, totalAmount: total, balance, status, updatedAt: Date.now() }
    }),
  }))
}
