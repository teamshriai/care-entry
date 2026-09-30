// IP Admission's own mutation path — same discipline as actions.ts,
// inventoryActions.ts and labActions.ts. Billing is NOT reimplemented here:
// createBillForAdmission calls the existing createPaymentBill and only
// stores the resulting paymentId back onto the Admission.
import { getState, setState } from './store'
import { withActivity, createPaymentBill } from './actions'
import { DomainError } from './errors'
import type { AppState } from '../types/store'
import type { Admission, Bed, CreateAdmissionInput } from '../types/admission'

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

export function admitPatient(input: CreateAdmissionInput): Admission {
  const state = getState()
  if (!input.patientId) throw new DomainError('VALIDATION', 'Select a patient before admitting.')
  const patient = state.patients.find((p) => p.patientId === input.patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')

  const doctor = state.providers.find((p) => p.providerId === input.doctorId)
  if (!doctor) throw new DomainError('VALIDATION', 'Select an admitting doctor.')

  if (!input.reason?.trim()) throw new DomainError('VALIDATION', 'A reason for admission is required.')
  if (!input.attendant.name?.trim() || !input.attendant.phone?.trim()) {
    throw new DomainError('VALIDATION', 'Attendant name and phone are required.')
  }

  const bed = requireBed(state, input.bedId)
  if (bed.status !== 'Available') {
    throw new DomainError('BED_UNAVAILABLE', `${bed.bedNumber} is no longer available — choose another bed.`)
  }

  const seq = state.nextIds.admission
  const year = new Date().getFullYear()
  const admissionNumber = `ADM-${year}-${String(seq).padStart(5, '0')}`
  const now = Date.now()

  const admission: Admission = {
    admissionId: `adm-${seq}`,
    admissionNumber,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorId: doctor.providerId,
    doctorName: doctor.name,
    department: input.department,
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
    insuranceProvider: input.insuranceProvider ?? null,
    policyNumber: input.policyNumber ?? null,
    paymentId: null,
    status: 'Admitted',
    admittedAt: now,
    dischargedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
  }

  setState((current) => {
    const currentBed = current.beds.find((b) => b.bedId === input.bedId)
    if (!currentBed || currentBed.status !== 'Available') {
      throw new DomainError('BED_UNAVAILABLE', 'That bed was just taken — choose another bed.')
    }
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient admitted', meta: `${admissionNumber} · ${input.patientName} · ${bed.bedNumber}` },
    ])
    return {
      ...current,
      admissions: [...current.admissions, admission],
      beds: setBedStatus(current, bed.bedId, 'Occupied', admission.admissionId),
      activityLog,
      nextIds: { ...current.nextIds, admission: seq + 1, activity: activitySeq },
    }
  })

  return admission
}

/** Raises a bill against the existing Payment/Billing system for admission
 *  charges — the SAME createPaymentBill every other module uses. */
export function createBillForAdmission(admissionId: string, items: { code: string; description: string; amount: number }[]): Admission {
  const state = getState()
  const admission = requireAdmission(state, admissionId)
  if (admission.paymentId) throw new DomainError('INVALID_TRANSITION', 'This admission already has a bill.')
  if (!items.length) throw new DomainError('VALIDATION', 'Select at least one charge.')

  const bill = createPaymentBill({ patientId: admission.patientId, items })

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
    return { ...current, admissions, beds, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return updated
}

export function dischargeAdmission(admissionId: string): Admission {
  const state = getState()
  const admission = requireAdmission(state, admissionId)
  if (admission.status !== 'Admitted') {
    throw new DomainError('INVALID_TRANSITION', `Cannot discharge an admission that is ${admission.status}.`)
  }

  const now = Date.now()
  let updated!: Admission
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient discharged', meta: admission.admissionNumber },
    ])
    const admissions = current.admissions.map((a) => {
      if (a.admissionId !== admissionId) return a
      updated = { ...a, status: 'Discharged', dischargedAt: now, updatedAt: now }
      return updated
    })
    const beds = admission.bedId ? setBedStatus(current, admission.bedId, 'Available', null) : current.beds
    return { ...current, admissions, beds, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return updated
}
