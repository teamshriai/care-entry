// The only functions allowed to change operational state. Each one reads
// the CURRENT state at call time, validates against it (so a slot taken a
// moment ago is correctly rejected), computes the next state immutably,
// appends activity-log entries, and commits with a single setState() — so
// every subscribed screen updates together, never out of sync.
//
// DEV NOTE: with a real backend, each body becomes an async API call that
// throws DomainError on a 4xx and reconciles the response into state (or
// applies a server-sent event). Callers already treat these as fallible, so
// no component needs to change.
import { getState, setState } from './store'
import { getAvailableSlots } from './selectors'
import { DomainError } from './errors'
import type { AppState } from '../types/store'
import type { Patient, RegisterPatientInput, PatientDemographicsInput } from '../types/patient'
import type { Provider, RegisterDoctorInput, DoctorChanges, ProviderStatus } from '../types/doctor'
import type { Appointment, BookAppointmentInput } from '../types/appointment'
import type { CheckInResult, OpenWalkInVisitInput } from '../types/queue'
import type {
  AddEstimateItemInput,
  AttendantPass,
  Estimate,
  IssueAttendantPassInput,
  MlcRecord,
  RegisterMlcInput,
  RemoveEstimateItemInput,
  UpdateEstimateItemQuantityInput,
} from '../types/frontDesk'
import type { ActivityLogEntry } from '../types/activity'
import type {
  CancelPaymentInput,
  CollectPaymentInput,
  CreatePaymentInput,
  Payment,
  RefundPaymentInput,
} from '../types/payment'

const DEPARTMENT_PREFIX: Record<string, string> = {
  Neurology: 'NEU',
  Cardiology: 'CAR',
  'General Medicine': 'MED',
  Orthopedics: 'ORT',
}

interface ActivityInput {
  time?: number
  text: string
  meta?: string
}

export function withActivity(current: AppState, entries: ActivityInput[]): { activityLog: ActivityLogEntry[]; activitySeq: number } {
  let seq = current.nextIds.activity
  const appended: ActivityLogEntry[] = entries.map((entry) => ({
    id: `act-${seq++}`,
    time: entry.time ?? Date.now(),
    text: entry.text,
    meta: entry.meta,
  }))
  return { activityLog: [...current.activityLog, ...appended], activitySeq: seq }
}

function patientName(state: AppState, patientId: string): string {
  return state.patients.find((p) => p.patientId === patientId)?.name ?? patientId
}

function providerName(state: AppState, providerId: string): string {
  return state.providers.find((p) => p.providerId === providerId)?.name ?? providerId
}

function issueTokenNumber(state: AppState, department: string): { tokenNumber: string; tokenCounters: AppState['tokenCounters'] } {
  const prefix = DEPARTMENT_PREFIX[department] ?? 'GEN'
  const count = (state.tokenCounters[prefix] ?? 0) + 1
  return {
    tokenNumber: `${prefix}-${String(count).padStart(3, '0')}`,
    tokenCounters: { ...state.tokenCounters, [prefix]: count },
  }
}

function requireToken(state: AppState, tokenId: string) {
  const token = state.queueTokens.find((t) => t.tokenId === tokenId)
  if (!token) throw new DomainError('NOT_FOUND', 'That token no longer exists.')
  return token
}

function requireAppointment(state: AppState, appointmentId: string): Appointment {
  const appointment = state.appointments.find((a) => a.appointmentId === appointmentId)
  if (!appointment) throw new DomainError('NOT_FOUND', 'That appointment no longer exists.')
  return appointment
}

function requirePayment(state: AppState, paymentId: string): Payment {
  const payment = state.payments.find((p) => p.paymentId === paymentId)
  if (!payment) throw new DomainError('NOT_FOUND', 'That payment record no longer exists.')
  return payment
}

// ---------------------------------------------------------------- patients

export function registerPatient({ name, age, sex, mobile, abhaId }: RegisterPatientInput): Patient {
  if (!name?.trim()) throw new DomainError('VALIDATION', 'Patient name is required.')
  if (!mobile?.trim()) throw new DomainError('VALIDATION', 'Mobile number is required.')

  const state = getState()
  const seq = state.nextIds.patient
  const uhid = `SHRI-${String(130000 + seq).padStart(7, '0')}`
  const patient: Patient = {
    patientId: uhid,
    uhid,
    name: name.trim(),
    nameNative: null,
    age: Number(age) || null,
    sex: sex ?? 'Other',
    mobile: mobile.trim(),
    email: null,
    address: null,
    abhaId: abhaId?.trim() ? abhaId.trim() : null,
    registrationStatus: 'Registered',
    createdAt: Date.now(),
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'New patient registered', meta: `${patient.name} · ${uhid}` },
    ])
    return {
      ...current,
      patients: [...current.patients, patient],
      registrationLog: [...current.registrationLog, { patientId: uhid, registeredAt: Date.now() }],
      activityLog,
      nextIds: { ...current.nextIds, patient: seq + 1, activity: activitySeq },
    }
  })

  return patient
}

// ------------------------------------------------------------ appointments

export function bookAppointment({ patientId, providerId, department, slot, date, reason }: BookAppointmentInput): Appointment {
  const state = getState()
  const targetDate = date ?? state.today

  if (!getAvailableSlots(state, providerId, Date.now(), targetDate).includes(slot)) {
    throw new DomainError(
      'SLOT_ALREADY_BOOKED',
      'That slot was just taken (or has passed). Please choose another one.',
    )
  }

  const appointmentId = `apt-${state.nextIds.appointment}`
  const appointment: Appointment = {
    appointmentId,
    patientId,
    providerId,
    department,
    date: targetDate,
    slot,
    // Booking now always creates a bill in the same step (see the
    // Schedule Appointment / Care-entry-via-appointment flow), so a fresh
    // appointment starts out awaiting that payment, not merely "Scheduled".
    status: 'Payment Pending',
    visitId: null,
    reason: reason?.trim() || null,
    createdAt: Date.now(),
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: 'Appointment booked',
        meta: `${patientName(current, patientId)} → ${providerName(current, providerId)} at ${slot}`,
      },
    ])
    return {
      ...current,
      appointments: [...current.appointments, appointment],
      activityLog,
      nextIds: { ...current.nextIds, appointment: current.nextIds.appointment + 1, activity: activitySeq },
    }
  })

  return appointment
}

export function confirmAppointment(appointmentId: string): void {
  const state = getState()
  const appointment = requireAppointment(state, appointmentId)
  if (appointment.status !== 'Scheduled') {
    throw new DomainError('INVALID_TRANSITION', `Cannot confirm an appointment that is ${appointment.status}.`)
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: 'Appointment confirmed',
        meta: `${patientName(current, appointment.patientId)} · ${appointment.slot}`,
      },
    ])
    return {
      ...current,
      appointments: current.appointments.map((a) =>
        a.appointmentId === appointmentId ? { ...a, status: 'Confirmed' as const } : a,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function cancelAppointment(appointmentId: string, reason: string = 'Cancelled at front desk'): void {
  const state = getState()
  const appointment = requireAppointment(state, appointmentId)
  if (['Completed', 'Cancelled', 'Checked-in'].includes(appointment.status)) {
    throw new DomainError('INVALID_TRANSITION', `Cannot cancel an appointment that is ${appointment.status}.`)
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: 'Appointment cancelled',
        meta: `${patientName(current, appointment.patientId)} · ${appointment.slot} · ${reason}`,
      },
    ])
    return {
      ...current,
      appointments: current.appointments.map((a) =>
        a.appointmentId === appointmentId ? { ...a, status: 'Cancelled' as const } : a,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function rescheduleAppointment(appointmentId: string, newSlot: string): void {
  const state = getState()
  const appointment = requireAppointment(state, appointmentId)
  if (!getAvailableSlots(state, appointment.providerId, Date.now(), appointment.date).includes(newSlot)) {
    throw new DomainError('SLOT_ALREADY_BOOKED', 'That slot is no longer available. Please choose another.')
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: 'Appointment rescheduled',
        meta: `${patientName(current, appointment.patientId)} · ${appointment.slot} → ${newSlot}`,
      },
    ])
    return {
      ...current,
      appointments: current.appointments.map((a) =>
        a.appointmentId === appointmentId ? { ...a, slot: newSlot } : a,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

// ------------------------------------------------------- visits and tokens

/**
 * Check-in turns a booked appointment into a live queue presence: the
 * appointment status, the Visit and the QueueToken are all written in the
 * same commit, so no screen can ever observe a checked-in appointment
 * without its visit and token.
 */
export function checkInAppointment(appointmentId: string): CheckInResult {
  const state = getState()
  const appointment = requireAppointment(state, appointmentId)
  if (!['Scheduled', 'Payment Pending', 'Confirmed'].includes(appointment.status)) {
    throw new DomainError('INVALID_TRANSITION', `Cannot queue an appointment that is ${appointment.status}.`)
  }

  const now = Date.now()
  const visitId = `visit-${state.nextIds.visit}`
  const tokenId = `tok-${state.nextIds.token}`
  const { tokenNumber, tokenCounters } = issueTokenNumber(state, appointment.department)

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient added to queue', meta: `${patientName(current, appointment.patientId)} · ${providerName(current, appointment.providerId)}` },
      { text: 'Token generated', meta: `${tokenNumber} · ${patientName(current, appointment.patientId)}` },
    ])
    return {
      ...current,
      appointments: current.appointments.map((a) =>
        a.appointmentId === appointmentId ? { ...a, status: 'Checked-in' as const, visitId } : a,
      ),
      visits: [
        ...current.visits,
        {
          visitId,
          patientId: appointment.patientId,
          appointmentId,
          providerId: appointment.providerId,
          status: 'Open' as const,
          arrivalTime: now,
          checkInTime: now,
          closedAt: null,
        },
      ],
      queueTokens: [
        ...current.queueTokens,
        {
          tokenId,
          tokenNumber,
          patientId: appointment.patientId,
          visitId,
          providerId: appointment.providerId,
          status: 'Waiting' as const,
          createdAt: now,
          calledAt: null,
          startedAt: null,
          completedAt: null,
          recalled: false,
        },
      ],
      tokenCounters,
      activityLog,
      nextIds: {
        ...current.nextIds,
        visit: current.nextIds.visit + 1,
        token: current.nextIds.token + 1,
        activity: activitySeq,
      },
    }
  })

  return { visitId, tokenId, tokenNumber }
}

/** Walk-in: same visit + token creation, with no prior appointment. */
export function openWalkInVisit({ patientId, providerId, department }: OpenWalkInVisitInput): CheckInResult {
  const state = getState()
  const now = Date.now()
  const visitId = `visit-${state.nextIds.visit}`
  const tokenId = `tok-${state.nextIds.token}`
  const { tokenNumber, tokenCounters } = issueTokenNumber(state, department)

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Walk-in visit opened', meta: `${patientName(current, patientId)} · ${providerName(current, providerId)}` },
      { text: 'Token generated', meta: `${tokenNumber} · ${patientName(current, patientId)}` },
    ])
    return {
      ...current,
      visits: [
        ...current.visits,
        {
          visitId,
          patientId,
          appointmentId: null,
          providerId,
          status: 'Open' as const,
          arrivalTime: now,
          checkInTime: now,
          closedAt: null,
        },
      ],
      queueTokens: [
        ...current.queueTokens,
        {
          tokenId,
          tokenNumber,
          patientId,
          visitId,
          providerId,
          status: 'Waiting' as const,
          createdAt: now,
          calledAt: null,
          startedAt: null,
          completedAt: null,
          recalled: false,
        },
      ],
      tokenCounters,
      activityLog,
      nextIds: {
        ...current.nextIds,
        visit: current.nextIds.visit + 1,
        token: current.nextIds.token + 1,
        activity: activitySeq,
      },
    }
  })

  return { visitId, tokenId, tokenNumber }
}

// ------------------------------------------------------- queue progression
// NOTE ON OWNERSHIP: calling a patient in, starting and completing a
// consultation belong to the consultation room (the clinician side) in
// UI_ATLAS's permission model — M-05's "Call next" is P-04-gated, not P-03.
// They live here because the queue's state machine is part of this domain
// and the board has to reflect them; the OP Queue screen groups them under
// a clearly-labelled "consultation room" section rather than presenting
// them as ordinary front-desk actions.

export function callToken(tokenId: string): void {
  const state = getState()
  const token = requireToken(state, tokenId)
  if (token.status !== 'Waiting') {
    throw new DomainError('INVALID_TRANSITION', `Only a waiting token can be called (this one is ${token.status}).`)
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Patient called', meta: `${token.tokenNumber} · ${patientName(current, token.patientId)}` },
    ])
    return {
      ...current,
      queueTokens: current.queueTokens.map((t) =>
        t.tokenId === tokenId ? { ...t, status: 'Called' as const, calledAt: Date.now(), recalled: false } : t,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function startConsultation(tokenId: string): void {
  const state = getState()
  const token = requireToken(state, tokenId)
  if (token.status !== 'Called') {
    throw new DomainError('INVALID_TRANSITION', `A consultation can only start from a called token (this one is ${token.status}).`)
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Consultation started', meta: `${token.tokenNumber} · ${patientName(current, token.patientId)}` },
    ])
    return {
      ...current,
      queueTokens: current.queueTokens.map((t) =>
        t.tokenId === tokenId ? { ...t, status: 'In consultation' as const, startedAt: Date.now() } : t,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

/** Completing the consultation closes the whole chain: token, visit and
 *  (when there was one) the originating appointment. */
export function completeConsultation(tokenId: string): void {
  const state = getState()
  const token = requireToken(state, tokenId)
  if (token.status !== 'In consultation' && token.status !== 'Called') {
    throw new DomainError('INVALID_TRANSITION', `Cannot complete a token that is ${token.status}.`)
  }
  const visit = state.visits.find((v) => v.visitId === token.visitId) ?? null
  const now = Date.now()

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Consultation completed', meta: `${token.tokenNumber} · ${patientName(current, token.patientId)}` },
    ])
    return {
      ...current,
      queueTokens: current.queueTokens.map((t) =>
        t.tokenId === tokenId ? { ...t, status: 'Completed' as const, completedAt: now } : t,
      ),
      visits: current.visits.map((v) =>
        v.visitId === token.visitId ? { ...v, status: 'Closed' as const, closedAt: now } : v,
      ),
      appointments: current.appointments.map((a) =>
        visit?.appointmentId && a.appointmentId === visit.appointmentId ? { ...a, status: 'Completed' as const } : a,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

/** Recall a called-but-absent patient once; a second recall marks no-show
 *  and closes the visit. */
export function recallToken(tokenId: string): void {
  const state = getState()
  const token = requireToken(state, tokenId)
  if (token.status !== 'Called') {
    throw new DomainError('INVALID_TRANSITION', 'Only a called token can be recalled.')
  }
  const willMarkNoShow = token.recalled
  const now = Date.now()

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: willMarkNoShow ? 'Patient marked no-show' : 'Patient recalled',
        meta: `${token.tokenNumber} · ${patientName(current, token.patientId)}`,
      },
    ])
    return {
      ...current,
      queueTokens: current.queueTokens.map((t) => {
        if (t.tokenId !== tokenId) return t
        return willMarkNoShow ? { ...t, status: 'No-show' as const, completedAt: now } : { ...t, recalled: true }
      }),
      visits: willMarkNoShow
        ? current.visits.map((v) => (v.visitId === token.visitId ? { ...v, status: 'Closed' as const, closedAt: now } : v))
        : current.visits,
      appointments: willMarkNoShow
        ? current.appointments.map((a) => {
            const visit = current.visits.find((v) => v.visitId === token.visitId)
            return visit?.appointmentId && a.appointmentId === visit.appointmentId ? { ...a, status: 'No-show' as const } : a
          })
        : current.appointments,
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

// ------------------------------------------------------------------ doctors
// Doctor Management creates the doctor's HOSPITAL PROFILE — identity,
// department, schedule config and account status. It deliberately contains
// no clinical capability: registering a doctor here makes them bookable and
// visible to the front desk, nothing more.

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function registerDoctor(input: RegisterDoctorInput): Provider {
  const state = getState()
  const name = input.name?.trim()
  if (!name) throw new DomainError('VALIDATION', 'Doctor name is required.')
  if (!input.department) throw new DomainError('VALIDATION', 'Department is required.')
  if (!input.specialty?.trim()) throw new DomainError('VALIDATION', 'Specialty is required.')
  if (!input.mobile?.trim()) throw new DomainError('VALIDATION', 'Mobile number is required.')
  if (!input.registrationNumber?.trim()) {
    throw new DomainError('VALIDATION', 'Medical registration number is required.')
  }
  const schedule = input.schedule ?? {}
  if (!schedule.workingDays?.length) throw new DomainError('VALIDATION', 'Select at least one working day.')
  if (!schedule.startTime || !schedule.endTime) throw new DomainError('VALIDATION', 'Working hours are required.')
  if (schedule.startTime >= schedule.endTime) {
    throw new DomainError('VALIDATION', 'Session end time must be after the start time.')
  }

  const base = slugify(name) || `doctor-${state.nextIds.provider}`
  let providerId = base
  let suffix = 2
  while (state.providers.some((p) => p.providerId === providerId)) {
    providerId = `${base}-${suffix++}`
  }

  const provider: Provider = {
    providerId,
    name,
    gender: input.gender ?? 'Other',
    dateOfBirth: input.dateOfBirth || null,
    mobile: input.mobile.trim(),
    email: input.email?.trim() || null,
    photoUrl: input.photoUrl || null,
    department: input.department,
    specialty: input.specialty.trim(),
    qualification: input.qualification?.trim() || null,
    registrationNumber: input.registrationNumber.trim(),
    experienceYears: Number(input.experienceYears) || 0,
    employeeId: input.employeeId?.trim() || `SHRI-DOC-${String(100 + state.nextIds.provider)}`,
    consultationType: input.consultationType ?? 'OPD',
    consultationFee: Number(input.consultationFee) || 0,
    room: input.room?.trim() || null,
    loginEmail: input.loginEmail?.trim() || input.email?.trim() || null,
    role: input.role ?? 'Consultant',
    status: input.status ?? 'Active',
    schedule: {
      workingDays: schedule.workingDays,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotMinutes: Number(schedule.slotMinutes) || 15,
      breaks: schedule.breaks ?? [],
    },
    createdAt: Date.now(),
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Doctor registered', meta: `${provider.name} · ${provider.department}` },
    ])
    return {
      ...current,
      providers: [...current.providers, provider],
      activityLog,
      nextIds: { ...current.nextIds, provider: current.nextIds.provider + 1, activity: activitySeq },
    }
  })

  return provider
}

export function updateDoctor(providerId: string, changes: DoctorChanges): void {
  const state = getState()
  if (!state.providers.some((p) => p.providerId === providerId)) {
    throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  }
  setState((current) => ({
    ...current,
    providers: current.providers.map((p) => (p.providerId === providerId ? { ...p, ...changes } : p)),
  }))
}

export function setDoctorStatus(providerId: string, status: ProviderStatus): void {
  const state = getState()
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider) throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  if (status === 'Inactive') {
    const openCount = state.appointments.filter(
      (a) =>
        a.providerId === providerId &&
        a.date >= state.today &&
        ['Scheduled', 'Payment Pending', 'Confirmed'].includes(a.status),
    ).length
    if (openCount > 0) {
      throw new DomainError(
        'HAS_OPEN_APPOINTMENTS',
        `${provider.name} still has ${openCount} open appointment(s). Cancel or reassign them before deactivating.`,
      )
    }
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: status === 'Active' ? 'Doctor activated' : 'Doctor deactivated', meta: provider.name },
    ])
    return {
      ...current,
      providers: current.providers.map((p) => (p.providerId === providerId ? { ...p, status } : p)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function addDoctorLeave(providerId: string, date: string, reason: string = 'Leave'): string {
  const state = getState()
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider) throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  if (!date) throw new DomainError('VALIDATION', 'Choose a date.')
  if (state.leaves.some((l) => l.providerId === providerId && l.date === date)) {
    throw new DomainError('DUPLICATE', 'Leave is already recorded for that date.')
  }
  const affected = state.appointments.filter(
    (a) =>
      a.providerId === providerId &&
      a.date === date &&
      ['Scheduled', 'Payment Pending', 'Confirmed', 'Checked-in'].includes(a.status),
  )
  if (affected.length > 0) {
    throw new DomainError(
      'HAS_OPEN_APPOINTMENTS',
      `${affected.length} appointment(s) are booked on that date. Cancel or reschedule them first.`,
    )
  }

  const leaveId = `leave-${state.nextIds.leave}`
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Doctor leave recorded', meta: `${provider.name} · ${date}` },
    ])
    return {
      ...current,
      leaves: [...current.leaves, { leaveId, providerId, date, reason }],
      activityLog,
      nextIds: { ...current.nextIds, leave: current.nextIds.leave + 1, activity: activitySeq },
    }
  })
  return leaveId
}

export function removeDoctorLeave(leaveId: string): void {
  setState((current) => ({ ...current, leaves: current.leaves.filter((l) => l.leaveId !== leaveId) }))
}

// --------------------------------------------------------- patient records

export function updatePatientDemographics(patientId: string, changes: PatientDemographicsInput): void {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Demographics updated', meta: `${patient.name} · ${patient.uhid}` },
    ])
    return {
      ...current,
      patients: current.patients.map((p) => (p.patientId === patientId ? { ...p, ...changes } : p)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function linkAbha(patientId: string, abhaId: string): void {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')
  if (!abhaId?.trim()) throw new DomainError('VALIDATION', 'Enter an ABHA number or address.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'ABHA linked', meta: `${patient.name} · ${abhaId.trim()}` },
    ])
    return {
      ...current,
      patients: current.patients.map((p) => (p.patientId === patientId ? { ...p, abhaId: abhaId.trim() } : p)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

// -------------------------------------------------------- front desk services

export function issueAttendantPass({ patientId, ward, relationship }: IssueAttendantPassInput): AttendantPass {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('VALIDATION', 'Select a patient first.')
  if (!ward?.trim()) throw new DomainError('VALIDATION', 'Ward is required.')

  const openForPatient = state.attendantPasses.filter((p) => p.patientId === patientId && !p.returned).length
  if (openForPatient >= 1) {
    throw new DomainError(
      'PASS_LIMIT',
      `${patient.name} already has an active attendant pass. One attendant per patient — return the existing pass first.`,
    )
  }

  const seq = state.nextIds.pass
  const passId = `AP/${ward.trim().toUpperCase()}/${String(1000 + seq).slice(1)}`
  const pass: AttendantPass = {
    passId,
    patientId,
    patientName: patient.name,
    ward: ward.trim(),
    relationship: relationship?.trim() || 'Attendant',
    issuedAt: Date.now(),
    returnedAt: null,
    returned: false,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Attendant pass issued', meta: `${passId} · ${patient.name}` },
    ])
    return {
      ...current,
      attendantPasses: [...current.attendantPasses, pass],
      activityLog,
      nextIds: { ...current.nextIds, pass: seq + 1, activity: activitySeq },
    }
  })

  return pass
}

export function returnAttendantPass(passId: string): void {
  const state = getState()
  const pass = state.attendantPasses.find((p) => p.passId === passId)
  if (!pass) throw new DomainError('NOT_FOUND', 'That pass no longer exists.')
  if (pass.returned) throw new DomainError('INVALID_TRANSITION', 'That pass has already been returned.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Attendant pass returned', meta: `${passId} · ${pass.patientName}` },
    ])
    return {
      ...current,
      attendantPasses: current.attendantPasses.map((p) =>
        p.passId === passId ? { ...p, returned: true, returnedAt: Date.now() } : p,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

function estimateTotal(items: Estimate['items']): number {
  // Plain arithmetic over the hospital's own rate card — rates are never
  // estimated or predicted.
  return items.reduce((sum, item) => sum + item.rate * (item.quantity ?? 1), 0)
}

function activeEstimateIndex(state: AppState, patientId: string): number {
  return state.estimates.findIndex((e) => e.patientId === patientId && e.status !== 'Cancelled')
}

/** The single entry point for adding a service to a patient's estimate —
 *  finds that patient's open estimate (Draft/Saved) or starts one, then
 *  either bumps an existing line's quantity or appends a new one. An
 *  estimate can never exist without a patient: there is no anonymous/global
 *  estimate for staff to accidentally add into. */
export function addEstimateItem({ patientId, patientName, item }: AddEstimateItemInput): Estimate {
  const state = getState()
  if (!patientId) throw new DomainError('VALIDATION', 'Select a patient before adding a service.')
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')

  let saved!: Estimate
  setState((current) => {
    const index = activeEstimateIndex(current, patientId)
    let estimates: Estimate[]
    let nextIds = current.nextIds
    let logMeta: string

    if (index === -1) {
      const seq = current.nextIds.estimate
      const estimateId = `EST/${String(seq).padStart(5, '0')}`
      const items = [{ ...item, quantity: item.quantity ?? 1 }]
      saved = {
        estimateId,
        patientId,
        patientName,
        items,
        total: estimateTotal(items),
        payer: 'Self-pay',
        status: 'Draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      estimates = [...current.estimates, saved]
      nextIds = { ...current.nextIds, estimate: seq + 1 }
      logMeta = `${estimateId} · ${item.name} for ${patientName}`
    } else {
      const existing = current.estimates[index]
      const itemIndex = existing.items.findIndex((i) => i.code === item.code)
      const items =
        itemIndex === -1
          ? [...existing.items, { ...item, quantity: item.quantity ?? 1 }]
          : existing.items.map((i, idx) =>
              idx === itemIndex ? { ...i, quantity: (i.quantity ?? 1) + (item.quantity ?? 1) } : i,
            )
      saved = { ...existing, items, total: estimateTotal(items), updatedAt: Date.now() }
      estimates = current.estimates.map((e, idx) => (idx === index ? saved : e))
      logMeta = `${saved.estimateId} · ${item.name} for ${patientName}`
    }

    const { activityLog, activitySeq } = withActivity(current, [{ text: 'Estimate item added', meta: logMeta }])
    return { ...current, estimates, activityLog, nextIds: { ...nextIds, activity: activitySeq } }
  })

  return saved
}

export function updateEstimateItemQuantity({ estimateId, code, quantity }: UpdateEstimateItemQuantityInput): Estimate {
  const state = getState()
  const estimate = state.estimates.find((e) => e.estimateId === estimateId)
  if (!estimate) throw new DomainError('NOT_FOUND', 'That estimate no longer exists.')
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new DomainError('VALIDATION', 'Quantity must be at least 1 — remove the item instead of setting it to 0.')
  }

  let saved!: Estimate
  setState((current) => {
    const estimates = current.estimates.map((e) => {
      if (e.estimateId !== estimateId) return e
      const items = e.items.map((i) => (i.code === code ? { ...i, quantity } : i))
      saved = { ...e, items, total: estimateTotal(items), updatedAt: Date.now() }
      return saved
    })
    return { ...current, estimates }
  })

  return saved
}

export function removeEstimateItem({ estimateId, code }: RemoveEstimateItemInput): Estimate {
  const state = getState()
  const estimate = state.estimates.find((e) => e.estimateId === estimateId)
  if (!estimate) throw new DomainError('NOT_FOUND', 'That estimate no longer exists.')

  let saved!: Estimate
  setState((current) => {
    const estimates = current.estimates.map((e) => {
      if (e.estimateId !== estimateId) return e
      const items = e.items.filter((i) => i.code !== code)
      saved = { ...e, items, total: estimateTotal(items), updatedAt: Date.now() }
      return saved
    })
    return { ...current, estimates }
  })

  return saved
}

/** Marks the estimate reviewed and ready — items stay editable afterward
 *  (front-desk work is rarely a single pass), this just moves it out of
 *  Draft so it reads as a real record staff can print or bill against. */
export function saveEstimate(estimateId: string): Estimate {
  const state = getState()
  const estimate = state.estimates.find((e) => e.estimateId === estimateId)
  if (!estimate) throw new DomainError('NOT_FOUND', 'That estimate no longer exists.')
  if (estimate.status === 'Cancelled') throw new DomainError('INVALID_TRANSITION', 'This estimate was cancelled.')
  if (!estimate.items.length) throw new DomainError('VALIDATION', 'Add at least one service before saving.')

  let saved!: Estimate
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Estimate saved', meta: `${estimateId} · ₹${estimate.total.toLocaleString('en-IN')} · ${estimate.patientName}` },
    ])
    const estimates = current.estimates.map((e) => {
      if (e.estimateId !== estimateId) return e
      saved = { ...e, status: e.status === 'Draft' ? 'Saved' : e.status, updatedAt: Date.now() }
      return saved
    })
    return { ...current, estimates, activityLog, nextIds: { ...current.nextIds, activity: activitySeq } }
  })

  return saved
}

export function registerMlc({ patientId, category, broughtBy, policeStation, incidentAt }: RegisterMlcInput): MlcRecord {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('VALIDATION', 'An MLC is always recorded against a patient — select one first.')
  if (!category) throw new DomainError('VALIDATION', 'MLC category is required.')
  if (!broughtBy?.trim()) throw new DomainError('VALIDATION', 'Record who brought the patient in.')
  if (!policeStation?.trim()) throw new DomainError('VALIDATION', 'Police station is required.')

  const seq = state.nextIds.mlc
  const mlcId = `MLC/${String(seq).padStart(4, '0')}`
  const record: MlcRecord = {
    mlcId,
    patientId,
    patientName: patient.name,
    category,
    broughtBy: broughtBy.trim(),
    policeStation: policeStation.trim(),
    incidentAt: incidentAt || null,
    registeredAt: Date.now(),
    // Acknowledgement of the police intimation is captured, never assumed.
    intimationSent: false,
    acknowledgedAt: null,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'MLC registered', meta: `${mlcId} · ${patient.name}` },
    ])
    return {
      ...current,
      mlcRecords: [...current.mlcRecords, record],
      activityLog,
      nextIds: { ...current.nextIds, mlc: seq + 1, activity: activitySeq },
    }
  })

  return record
}

export function markMlcIntimationSent(mlcId: string): void {
  const state = getState()
  const record = state.mlcRecords.find((r) => r.mlcId === mlcId)
  if (!record) throw new DomainError('NOT_FOUND', 'That MLC record no longer exists.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Police intimation sent', meta: `${mlcId} · ${record.policeStation}` },
    ])
    return {
      ...current,
      mlcRecords: current.mlcRecords.map((r) => (r.mlcId === mlcId ? { ...r, intimationSent: true } : r)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function acknowledgeMlcIntimation(mlcId: string): void {
  const state = getState()
  const record = state.mlcRecords.find((r) => r.mlcId === mlcId)
  if (!record) throw new DomainError('NOT_FOUND', 'That MLC record no longer exists.')
  if (!record.intimationSent) throw new DomainError('INVALID_TRANSITION', 'Send the intimation memo first.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Police acknowledgement captured', meta: mlcId },
    ])
    return {
      ...current,
      mlcRecords: current.mlcRecords.map((r) => (r.mlcId === mlcId ? { ...r, acknowledgedAt: Date.now() } : r)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

// --------------------------------------------------------------- payments
// A Payment is one administrative bill — never a clinical charge. It is
// raised (createPaymentBill), collected against in one or more transactions
// (collectPayment, so partial payments are a first-class case), and can end
// in one of two ways: a full or partial refund (refundPayment) once money
// has moved, or a cancellation (cancelPayment) if nothing has been
// collected yet. Nothing here is a real payment gateway — collectPayment
// only ever records the simulated RESULT of a collection, never a card
// number, CVV, bank credential or UPI PIN.

function paymentTransactionId(state: AppState): { transactionId: string; nextSeq: number } {
  const seq = state.nextIds.transaction
  return { transactionId: `TXN-${String(seq).padStart(6, '0')}`, nextSeq: seq + 1 }
}

export function createPaymentBill({ patientId, items, appointmentId, estimateId }: CreatePaymentInput): Payment {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('VALIDATION', 'Select a patient first.')
  if (!items?.length) throw new DomainError('VALIDATION', 'Add at least one charge to the bill.')

  const seq = state.nextIds.payment
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const now = Date.now()
  const payment: Payment = {
    paymentId: `pay-${seq}`,
    receiptNo: `RCT-${String(seq).padStart(6, '0')}`,
    patientId,
    patientName: patient.name,
    appointmentId: appointmentId ?? null,
    estimateId: estimateId ?? null,
    items,
    totalAmount: total,
    paidAmount: 0,
    balance: total,
    status: 'Pending',
    transactions: [],
    refund: null,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    cancelReason: null,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Payment bill created', meta: `${patient.name} · ₹${total.toLocaleString('en-IN')}` },
    ])
    return {
      ...current,
      payments: [...current.payments, payment],
      activityLog,
      nextIds: { ...current.nextIds, payment: seq + 1, activity: activitySeq },
    }
  })

  return payment
}

export function collectPayment({ paymentId, amount, method }: CollectPaymentInput): Payment {
  const state = getState()
  const payment = requirePayment(state, paymentId)
  if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
    throw new DomainError('INVALID_TRANSITION', `Cannot collect against a payment that is ${payment.status}.`)
  }
  if (!(amount > 0)) throw new DomainError('VALIDATION', 'Enter an amount greater than zero.')
  if (amount > payment.balance) {
    throw new DomainError('VALIDATION', `That is more than the ₹${payment.balance.toLocaleString('en-IN')} balance due.`)
  }

  const now = Date.now()
  const { transactionId, nextSeq } = paymentTransactionId(state)
  const paidAmount = payment.paidAmount + amount
  const balance = payment.totalAmount - paidAmount
  const status = balance <= 0 ? 'Paid' : 'Partially Paid'
  const updated: Payment = {
    ...payment,
    paidAmount,
    balance: Math.max(0, balance),
    status,
    transactions: [...payment.transactions, { transactionId, amount, method, collectedAt: now }],
    updatedAt: now,
  }

  // A bill raised from booking an appointment carries that appointment's
  // id — once it's fully paid, that ONE appointment (never every
  // appointment for the patient) moves from "awaiting payment" to
  // Confirmed. An appointment already Checked-in/Completed/Cancelled by
  // the time payment lands is left alone; only the still-pending state
  // this payment was blocking gets released.
  const linkedAppointment =
    status === 'Paid' && payment.appointmentId
      ? state.appointments.find((a) => a.appointmentId === payment.appointmentId)
      : undefined
  const shouldConfirmAppointment = linkedAppointment?.status === 'Payment Pending'

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      {
        text: status === 'Paid' ? 'Payment collected' : 'Partial payment recorded',
        meta:
          status === 'Paid'
            ? `${payment.patientName} · ₹${amount.toLocaleString('en-IN')}`
            : `${payment.patientName} · ₹${paidAmount.toLocaleString('en-IN')} of ₹${payment.totalAmount.toLocaleString('en-IN')}`,
      },
      ...(shouldConfirmAppointment
        ? [{ text: 'Appointment confirmed', meta: `${payment.patientName} · payment received` }]
        : []),
    ])
    return {
      ...current,
      payments: current.payments.map((p) => (p.paymentId === paymentId ? updated : p)),
      appointments: shouldConfirmAppointment
        ? current.appointments.map((a) =>
            a.appointmentId === payment.appointmentId ? { ...a, status: 'Confirmed' as const } : a,
          )
        : current.appointments,
      activityLog,
      nextIds: { ...current.nextIds, transaction: nextSeq, activity: activitySeq },
    }
  })

  return updated
}

export function cancelPayment({ paymentId, reason }: CancelPaymentInput): void {
  const state = getState()
  const payment = requirePayment(state, paymentId)
  if (payment.paidAmount > 0) {
    throw new DomainError(
      'INVALID_TRANSITION',
      'Money has already been collected against this bill — refund it instead of cancelling.',
    )
  }
  if (payment.status !== 'Pending') {
    throw new DomainError('INVALID_TRANSITION', `Cannot cancel a payment that is ${payment.status}.`)
  }
  if (!reason?.trim()) throw new DomainError('VALIDATION', 'A cancellation reason is required.')

  const now = Date.now()
  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Payment bill cancelled', meta: `${payment.patientName} · ${payment.receiptNo} · ${reason.trim()}` },
    ])
    return {
      ...current,
      payments: current.payments.map((p) =>
        p.paymentId === paymentId
          ? { ...p, status: 'Cancelled' as const, cancelledAt: now, cancelReason: reason.trim(), updatedAt: now }
          : p,
      ),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

export function refundPayment({ paymentId, amount, reason }: RefundPaymentInput): Payment {
  const state = getState()
  const payment = requirePayment(state, paymentId)
  if (payment.status !== 'Paid' && payment.status !== 'Partially Paid') {
    throw new DomainError('INVALID_TRANSITION', 'Only a payment with money collected against it can be refunded.')
  }
  if (!(amount > 0) || amount > payment.paidAmount) {
    throw new DomainError('VALIDATION', `Enter an amount up to the ₹${payment.paidAmount.toLocaleString('en-IN')} collected.`)
  }
  if (!reason?.trim()) throw new DomainError('VALIDATION', 'A refund reason is required.')

  const now = Date.now()
  const updated: Payment = {
    ...payment,
    status: 'Refunded',
    refund: { refundId: `RFD-${payment.receiptNo.replace('RCT-', '')}`, amount, reason: reason.trim(), refundedAt: now },
    updatedAt: now,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Payment refunded', meta: `${payment.patientName} · ${payment.receiptNo} · ₹${amount.toLocaleString('en-IN')}` },
    ])
    return {
      ...current,
      payments: current.payments.map((p) => (p.paymentId === paymentId ? updated : p)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })

  return updated
}
