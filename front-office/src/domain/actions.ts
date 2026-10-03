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
import {
  FEE_DIFFERENCE_CODE,
  consultationFeePaid,
  findAbhaHolder,
  getAvailableSlots,
  getBillLock,
  getBillsForAppointment,
  getConsultationBillItems,
  getDoctorStatus,
} from './selectors'
import { slotToTimestamp, todayKey } from './time'
import { DomainError } from './errors'
import { MOBILE_ERROR, formatMobile, isValidMobile } from '../utils/phone'
import {
  abhaError,
  addressError,
  ageError,
  ageNeedsConfirmation,
  emailError,
  mobileError,
  nameError,
  normalizeAbha,
  normalizeName,
  sexError,
} from '../utils/validation'
import { formatRupees } from '../utils/billing'
import { formatDateKey } from '../utils/dates'
import { NO_SHOW_GRACE_MINUTES, appointmentStatusLabel, modesFor, takesWalkIns } from '../utils/appointment'
import type { AppState } from '../types/store'
import type { Patient, RegisterPatientInput, PatientDemographicsInput, Sex } from '../types/patient'
import type { Provider, RegisterDoctorInput, DoctorChanges, ProviderStatus } from '../types/doctor'
import type { Appointment, BookAppointmentInput, ConsultMode, UnavailableParty } from '../types/appointment'
import type { CheckInResult, OpenWalkInVisitInput } from '../types/queue'
import type {
  AddEstimateItemInput,
  GuestPass,
  Estimate,
  IssueGuestPassInput,
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
  PaymentMethod,
  RecordFailedPaymentInput,
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

/** A pure state step: the next state and what the step made. An action
 *  chains the steps it needs and commits once, so a booking, its bill and
 *  its payment land together or not at all. */
interface Step<T> {
  state: AppState
  value: T
}

/** The state with these entries added to the activity log. */
function logged(state: AppState, entries: ActivityInput[]): AppState {
  const { activityLog, activitySeq } = withActivity(state, entries)
  return { ...state, activityLog, nextIds: { ...state.nextIds, activity: activitySeq } }
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

/** The registration rules every patient record must meet — the same checks
 *  the form shows inline (utils/validation.ts). */
function assertPatientFields(input: { name: string; age: string | number; sex: Sex | ''; mobile: string; abhaId?: string; ageConfirmed?: boolean }) {
  const problem =
    nameError(input.name) ?? ageError(input.age) ?? sexError(input.sex) ?? mobileError(input.mobile) ?? abhaError(input.abhaId)
  if (problem) throw new DomainError('VALIDATION', problem)
  if (ageNeedsConfirmation(input.age) && !input.ageConfirmed) {
    throw new DomainError('VALIDATION', `Confirm the age (${Number(input.age)}) with the patient first.`)
  }
}

/** One ABHA belongs to one patient. */
function assertAbhaFree(state: AppState, abhaId: string, exceptPatientId?: string) {
  const holder = findAbhaHolder(state, abhaId)
  if (holder && holder.patientId !== exceptPatientId) {
    throw new DomainError('DUPLICATE', `This ABHA is already linked to ${holder.name} (${holder.uhid}).`)
  }
}

export function registerPatient(input: RegisterPatientInput): Patient {
  assertPatientFields(input)
  const { name, age, sex, mobile } = input
  const abhaId = input.abhaId?.trim() ? normalizeAbha(input.abhaId) : null

  const state = getState()
  if (abhaId) assertAbhaFree(state, abhaId)
  const seq = state.nextIds.patient
  const uhid = `SHRI-${String(130000 + seq).padStart(7, '0')}`
  const patient: Patient = {
    patientId: uhid,
    uhid,
    name: normalizeName(name),
    nameNative: null,
    age: Number(age),
    sex: sex as Sex,
    mobile: formatMobile(mobile),
    email: null,
    address: null,
    abhaId,
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

/** Reserves the slot and records the booking, awaiting its payment. */
function applyBooking(
  state: AppState,
  { patientId, providerId, department, slot, date, reason, mode = 'In person' }: BookAppointmentInput,
  now: number,
): Step<Appointment> {
  const targetDate = date ?? todayKey(new Date(now))
  if (!getAvailableSlots(state, providerId, now, targetDate).includes(slot)) {
    throw new DomainError('SLOT_ALREADY_BOOKED', 'That slot was just taken (or has passed). Please choose another one.')
  }
  const appointment: Appointment = {
    appointmentId: `apt-${state.nextIds.appointment}`,
    patientId,
    providerId,
    department,
    date: targetDate,
    slot,
    // The bill is raised and paid in the same save (bookAndPayAppointment);
    // collecting it is what confirms the booking.
    status: 'Payment Pending',
    visitId: null,
    reason: reason?.trim() || null,
    mode,
    createdAt: now,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    reschedules: [],
  }
  const next = logged(
    {
      ...state,
      appointments: [...state.appointments, appointment],
      nextIds: { ...state.nextIds, appointment: state.nextIds.appointment + 1 },
    },
    [{ text: 'Appointment booked', meta: `${patientName(state, patientId)} → ${providerName(state, providerId)} at ${slot}` }],
  )
  return { state: next, value: appointment }
}

/** A consultation's bill — registration fee the first time, then the
 *  doctor's own fee — raised like every other bill. */
function applyConsultationBill(
  state: AppState,
  { patientId, providerId, appointmentId = null }: { patientId: string; providerId: string; appointmentId?: string | null },
  now: number,
): Step<Payment> {
  const items = getConsultationBillItems(state, patientId, providerId)
  if (items.length === 0) throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  return applyNewBill(state, { patientId, items, appointmentId }, now)
}

/** Books a slot, raises its bill and takes the payment, saved together. The
 *  hospital has no pay-later: if any part fails nothing is saved, so an
 *  abandoned or failed payment leaves no booking behind. */
export function bookAndPayAppointment({
  patientId,
  providerId,
  date,
  slot,
  reason,
  mode,
  method,
}: {
  patientId: string
  providerId: string
  date: string
  slot: string
  reason?: string
  mode?: ConsultMode
  method: PaymentMethod
}): { appointment: Appointment; bill: Payment } {
  const state = getState()
  const now = Date.now()
  if (!state.patients.some((p) => p.patientId === patientId)) throw new DomainError('VALIDATION', 'Select a patient first.')
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider || provider.status !== 'Active') throw new DomainError('VALIDATION', 'That doctor is not taking bookings.')
  if (mode && !modesFor(provider).includes(mode)) {
    throw new DomainError('VALIDATION', `${provider.name} does not offer ${mode === 'Teleconsult' ? 'teleconsults' : 'in-person visits'}.`)
  }

  const booked = applyBooking(
    state,
    { patientId, providerId, department: provider.department, slot, date, reason, mode: mode ?? modesFor(provider)[0] },
    now,
  )
  const billed = applyConsultationBill(booked.state, { patientId, providerId, appointmentId: booked.value.appointmentId }, now)
  // Fully paid → the collection confirms the booking it belongs to.
  const paid = applyCollection(billed.state, { paymentId: billed.value.paymentId, amount: billed.value.balance, method }, now)
  setState(paid.state)
  return { appointment: requireAppointment(paid.state, booked.value.appointmentId), bill: paid.value }
}

/** A walk-in (Schedule → Now): a token for a doctor in session now, its bill
 *  and the payment, saved together — the token exists only once it is paid. */
export function startPaidWalkIn({
  patientId,
  providerId,
  method,
}: {
  patientId: string
  providerId: string
  method: PaymentMethod
}): CheckInResult & { bill: Payment } {
  const state = getState()
  const now = Date.now()
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider) throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  const visit = applyWalkIn(state, { patientId, providerId, department: provider.department }, now)
  const billed = applyConsultationBill(visit.state, { patientId, providerId }, now)
  const paid = applyCollection(billed.state, { paymentId: billed.value.paymentId, amount: billed.value.balance, method }, now)
  setState(paid.state)
  return { ...visit.value, bill: paid.value }
}

// ------------------------------------------------- cancel, move, no-show
// The money follows who could not keep the booking: when the doctor is
// unavailable the patient is refunded in full; when the patient cancels or
// does not come, the fee is kept. A move never refunds — it collects the
// difference only when the patient chooses a dearer doctor.

const OPEN_BOOKING_STATUSES = ['Scheduled', 'Payment Pending', 'Confirmed']

/** Cancels one booking inside a chain of steps. */
function applyCancelBooking(state: AppState, appointmentId: string, by: UnavailableParty, note: string, now: number): Step<Appointment> {
  const appointment = requireAppointment(state, appointmentId)
  if (!OPEN_BOOKING_STATUSES.includes(appointment.status)) {
    throw new DomainError('INVALID_TRANSITION', `This booking is ${appointmentStatusLabel(appointment.status).toLowerCase()} — it can't be cancelled.`)
  }
  const reason = note.trim() || (by === 'Doctor' ? 'Doctor unavailable' : 'Patient cancelled')
  let next = state
  for (const bill of getBillsForAppointment(state, appointmentId)) {
    if (bill.paidAmount > 0) {
      // Doctor unavailable: everything paid for this booking goes back.
      if (by === 'Doctor') next = applyFullRefund(next, bill.paymentId, 'Doctor unavailable', now).state
    } else if (bill.status === 'Pending') {
      next = applyBillCancel(next, bill.paymentId, 'Appointment cancelled', now).state
    }
  }
  const cancelled: Appointment = { ...appointment, status: 'Cancelled', cancelledAt: now, cancelledBy: by, cancelReason: reason }
  next = logged({ ...next, appointments: next.appointments.map((a) => (a.appointmentId === appointmentId ? cancelled : a)) }, [
    {
      text: 'Appointment cancelled',
      meta: `${patientName(state, appointment.patientId)} · ${providerName(state, appointment.providerId)} · ${appointment.date} ${appointment.slot} · ${reason}`,
    },
  ])
  return { state: next, value: cancelled }
}

/** Cancels a booking because the patient or the doctor can't keep it. */
export function cancelAppointment({ appointmentId, by, note = '' }: { appointmentId: string; by: UnavailableParty; note?: string }): Appointment {
  const { state, value } = applyCancelBooking(getState(), appointmentId, by, note, Date.now())
  setState(state)
  return value
}

/** Every open booking a doctor has on one day, cancelled as doctor
 *  unavailable and refunded — clearing the day for leave, in one save. */
export function cancelDoctorDayBookings({ providerId, date, note = '' }: { providerId: string; date: string; note?: string }): {
  cancelled: number
  refunded: number
} {
  const state = getState()
  const now = Date.now()
  const open = state.appointments.filter((a) => a.providerId === providerId && a.date === date && OPEN_BOOKING_STATUSES.includes(a.status))
  if (open.length === 0) throw new DomainError('VALIDATION', 'There are no open bookings on that day.')
  let next = state
  let refunded = 0
  for (const appointment of open) {
    refunded += getBillsForAppointment(next, appointment.appointmentId).reduce((sum, bill) => sum + bill.paidAmount, 0)
    next = applyCancelBooking(next, appointment.appointmentId, 'Doctor', note || 'Doctor unavailable', now).state
  }
  setState(next)
  return { cancelled: open.length, refunded }
}

/** The patient did not come: the booking closes as a no-show and the fee
 *  is kept. Only once its time is past by the grace period. */
export function markNoShow(appointmentId: string): Appointment {
  const state = getState()
  const now = Date.now()
  const appointment = requireAppointment(state, appointmentId)
  if (appointment.status !== 'Confirmed') {
    throw new DomainError('INVALID_TRANSITION', `This booking is ${appointmentStatusLabel(appointment.status).toLowerCase()}.`)
  }
  if (now < slotToTimestamp(appointment.date, appointment.slot) + NO_SHOW_GRACE_MINUTES * 60000) {
    throw new DomainError('INVALID_TRANSITION', `A no-show can be marked ${NO_SHOW_GRACE_MINUTES} minutes after the booked time.`)
  }
  const updated: Appointment = { ...appointment, status: 'No-show' }
  setState(
    logged({ ...state, appointments: state.appointments.map((a) => (a.appointmentId === appointmentId ? updated : a)) }, [
      { text: 'Marked as no-show', meta: `${patientName(state, appointment.patientId)} · ${providerName(state, appointment.providerId)} · ${appointment.slot} · fee kept` },
    ]),
  )
  return updated
}

export interface RescheduleInput {
  appointmentId: string
  providerId: string
  date: string
  slot: string
  mode: ConsultMode
  by: UnavailableParty
  note?: string
  /** How the patient pays the difference, when they move to a dearer doctor. */
  method?: PaymentMethod
}

/** Moves a booking to another time, or another doctor in the same
 *  department. The booking keeps its id and records the move. */
export function rescheduleAppointment({ appointmentId, providerId, date, slot, mode, by, note = '', method }: RescheduleInput): {
  appointment: Appointment
  differenceBill: Payment | null
} {
  const state = getState()
  const now = Date.now()
  const appointment = requireAppointment(state, appointmentId)
  if (appointment.status !== 'Confirmed') {
    throw new DomainError('INVALID_TRANSITION', `Only a confirmed booking can be moved — this one is ${appointmentStatusLabel(appointment.status).toLowerCase()}.`)
  }
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider || provider.status !== 'Active') throw new DomainError('VALIDATION', 'That doctor is not taking bookings.')
  if (provider.department !== appointment.department) {
    throw new DomainError('VALIDATION', `Choose a doctor in ${appointment.department} — a move stays in the same department.`)
  }
  if (!modesFor(provider).includes(mode)) {
    throw new DomainError('VALIDATION', `${provider.name} does not offer ${mode === 'Teleconsult' ? 'teleconsults' : 'in-person visits'}.`)
  }
  if (providerId === appointment.providerId && date === appointment.date && slot === appointment.slot) {
    throw new DomainError('VALIDATION', 'That is the time it is already booked for — choose another.')
  }
  if (!getAvailableSlots(state, providerId, now, date).includes(slot)) {
    throw new DomainError('SLOT_ALREADY_BOOKED', 'That slot was just taken (or has passed). Please choose another one.')
  }

  const difference = provider.consultationFee - consultationFeePaid(state, appointmentId)
  // Only a patient's own move to a dearer doctor is charged; when the
  // doctor is the reason, the hospital absorbs the difference.
  const charge = difference > 0 && by === 'Patient' ? difference : 0
  if (charge > 0 && !method) throw new DomainError('VALIDATION', 'Collect the fee difference to move the booking.')

  let next = state
  let differenceBill: Payment | null = null
  if (charge > 0 && method) {
    const billed = applyNewBill(
      next,
      { patientId: appointment.patientId, items: [{ code: FEE_DIFFERENCE_CODE, description: `Fee difference — ${provider.name}`, amount: charge }], appointmentId },
      now,
    )
    const paid = applyCollection(billed.state, { paymentId: billed.value.paymentId, amount: charge, method }, now)
    next = paid.state
    differenceBill = paid.value
  }

  const from = { providerId: appointment.providerId, date: appointment.date, slot: appointment.slot, mode: appointment.mode }
  const to = { providerId, date, slot, mode }
  const moved: Appointment = {
    ...appointment,
    providerId,
    date,
    slot,
    mode,
    reschedules: [
      ...appointment.reschedules,
      { at: now, from, to, by, note: note.trim() || null, differencePaymentId: differenceBill?.paymentId ?? null },
    ],
  }
  // The consultation line names the doctor the patient will now see; what
  // was paid for it stays as it was.
  const renamed = providerId !== appointment.providerId
  next = logged(
    {
      ...next,
      appointments: next.appointments.map((a) => (a.appointmentId === appointmentId ? moved : a)),
      payments: renamed
        ? next.payments.map((bill) =>
            bill.appointmentId === appointmentId && bill.status !== 'Cancelled'
              ? {
                  ...bill,
                  items: bill.items.map((item) => (item.code === 'CONS-FEE' ? { ...item, description: `Consultation — ${provider.name}` } : item)),
                }
              : bill,
          )
        : next.payments,
    },
    [
      {
        text: 'Appointment rescheduled',
        meta: `${patientName(state, appointment.patientId)} · ${providerName(state, from.providerId)} ${from.date} ${from.slot} → ${provider.name} ${date} ${slot} · ${by === 'Doctor' ? 'doctor unavailable' : 'patient’s request'}`,
      },
    ],
  )
  setState(next)
  return { appointment: moved, differenceBill }
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
  // No pay-later: only a paid (Confirmed) booking joins the queue.
  if (appointment.status === 'Scheduled' || appointment.status === 'Payment Pending') {
    throw new DomainError('INVALID_TRANSITION', 'This booking is not paid yet — collect the payment first.')
  }
  if (appointment.status !== 'Confirmed') {
    throw new DomainError('INVALID_TRANSITION', `Cannot queue an appointment that is ${appointment.status}.`)
  }
  const today = todayKey()
  if (appointment.date !== today) {
    throw new DomainError(
      'INVALID_TRANSITION',
      appointment.date > today
        ? `This booking is for ${formatDateKey(appointment.date)} — check the patient in on that day.`
        : `This booking was for ${formatDateKey(appointment.date)} — it can't be checked in now.`,
    )
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

/** Walk-in: the same visit and token as a check-in, with no booking. */
function applyWalkIn(state: AppState, { patientId, providerId, department }: OpenWalkInVisitInput, now: number): Step<CheckInResult> {
  const provider = state.providers.find((p) => p.providerId === providerId)
  if (!provider) throw new DomainError('NOT_FOUND', 'That doctor no longer exists.')
  if (!takesWalkIns(provider)) {
    throw new DomainError('INVALID_TRANSITION', `${provider.name} sees patients by teleconsult only — book a teleconsult instead.`)
  }
  const status = getDoctorStatus(state, providerId, now, todayKey(new Date(now)))
  if (!['Available', 'Running late', 'In consultation', 'On break', 'Fully booked'].includes(status)) {
    throw new DomainError('INVALID_TRANSITION', `${provider.name} is not seeing patients right now (${status.toLowerCase()}).`)
  }
  if (
    state.queueTokens.some(
      (t) => t.patientId === patientId && t.providerId === providerId && ['Waiting', 'Called', 'In consultation'].includes(t.status),
    )
  ) {
    throw new DomainError('DUPLICATE', `${patientName(state, patientId)} already has a token with ${provider.name}.`)
  }
  const visitId = `visit-${state.nextIds.visit}`
  const tokenId = `tok-${state.nextIds.token}`
  const { tokenNumber, tokenCounters } = issueTokenNumber(state, department)

  const next = logged(
    {
      ...state,
      visits: [
        ...state.visits,
        { visitId, patientId, appointmentId: null, providerId, status: 'Open' as const, arrivalTime: now, checkInTime: now, closedAt: null },
      ],
      queueTokens: [
        ...state.queueTokens,
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
      nextIds: { ...state.nextIds, visit: state.nextIds.visit + 1, token: state.nextIds.token + 1 },
    },
    [
      { text: 'Walk-in token issued', meta: `${patientName(state, patientId)} · ${providerName(state, providerId)}` },
      { text: 'Token generated', meta: `${tokenNumber} · ${patientName(state, patientId)}` },
    ],
  )
  return { state: next, value: { visitId, tokenId, tokenNumber } }
}

// ------------------------------------------------------- queue progression
// NOTE ON OWNERSHIP: calling a patient in, starting and completing a
// consultation belong to the consultation room (the clinician side) in
// UI_ATLAS's permission model — M-05's "Call next" is P-04-gated, not P-03.
// They live here because the queue's state machine is part of this domain
// and the board has to reflect them; the Outpatients page shows them on
// each patient's row at that stage, beside the desk's own Check in.

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
  if (!isValidMobile(input.mobile.trim())) throw new DomainError('VALIDATION', MOBILE_ERROR)
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
    consultationType: input.consultationType ?? 'Outpatient',
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
  const today = todayKey()
  if (date < today) throw new DomainError('VALIDATION', 'Leave can only be recorded for today or a later day.')
  if (state.leaves.some((l) => l.providerId === providerId && l.date === date)) {
    throw new DomainError('DUPLICATE', 'Leave is already recorded for that date.')
  }
  if (date === today && state.queueTokens.some((t) => t.providerId === providerId && ['Waiting', 'Called', 'In consultation'].includes(t.status))) {
    throw new DomainError('HAS_OPEN_APPOINTMENTS', `Patients are still waiting for ${provider.name} today — see them or send them to another doctor first.`)
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

/** Counts a profile being opened — feeds the search box's "Most opened". */
export function recordPatientOpen(patientId: string): void {
  const state = getState()
  if (!state.patients.some((p) => p.patientId === patientId)) return
  setState((current) => {
    const stat = current.patientOpens[patientId]
    return {
      ...current,
      patientOpens: { ...current.patientOpens, [patientId]: { count: (stat?.count ?? 0) + 1, lastOpenedAt: Date.now() } },
    }
  })
}

export function updatePatientDemographics(patientId: string, changes: PatientDemographicsInput): void {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('NOT_FOUND', 'That patient no longer exists.')
  // Same rules as registration, for whichever fields are being changed.
  const problem =
    (changes.name !== undefined ? nameError(changes.name) : null) ??
    (changes.age !== undefined ? ageError(changes.age) : null) ??
    (changes.sex !== undefined ? sexError(changes.sex) : null) ??
    (changes.mobile !== undefined ? mobileError(changes.mobile) : null) ??
    (changes.email !== undefined ? emailError(changes.email) : null) ??
    (changes.address !== undefined ? addressError(changes.address) : null)
  if (problem) throw new DomainError('VALIDATION', problem)
  if (changes.age !== undefined && Number(changes.age) !== patient.age && ageNeedsConfirmation(changes.age) && !changes.ageConfirmed) {
    throw new DomainError('VALIDATION', `Confirm the age (${Number(changes.age)}) with the patient first.`)
  }

  const next: Partial<Patient> = {}
  if (changes.name !== undefined) next.name = normalizeName(changes.name)
  if (changes.age !== undefined) next.age = Number(changes.age)
  if (changes.sex !== undefined) next.sex = changes.sex
  if (changes.mobile !== undefined) next.mobile = formatMobile(changes.mobile)
  if (changes.email !== undefined) next.email = changes.email?.trim() || null
  if (changes.address !== undefined) next.address = changes.address?.trim() || null

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Demographics updated', meta: `${patient.name} · ${patient.uhid}` },
    ])
    return {
      ...current,
      patients: current.patients.map((p) => (p.patientId === patientId ? { ...p, ...next } : p)),
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
  const problem = abhaError(abhaId)
  if (problem) throw new DomainError('VALIDATION', problem)
  const value = normalizeAbha(abhaId)
  assertAbhaFree(state, value, patientId)

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'ABHA linked', meta: `${patient.name} · ${value}` },
    ])
    return {
      ...current,
      patients: current.patients.map((p) => (p.patientId === patientId ? { ...p, abhaId: value } : p)),
      activityLog,
      nextIds: { ...current.nextIds, activity: activitySeq },
    }
  })
}

// -------------------------------------------------------- front desk services

export function issueGuestPass({ patientId, relationship }: IssueGuestPassInput): GuestPass {
  const state = getState()
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('VALIDATION', 'Select a patient first.')
  // A guest pass is for an admitted patient's companion, for the ward they are in.
  const stay = state.admissions.find((a) => a.patientId === patientId && a.status === 'Admitted')
  if (!stay?.wardLabel) throw new DomainError('VALIDATION', `${patient.name} is not admitted — guest passes are for inpatients.`)
  const ward = stay.wardLabel

  const openForPatient = state.guestPasses.filter((p) => p.patientId === patientId && !p.returned).length
  if (openForPatient >= 1) {
    throw new DomainError(
      'PASS_LIMIT',
      `${patient.name} already has an active guest pass. One guest per patient — return the existing pass first.`,
    )
  }

  const seq = state.nextIds.pass
  const passId = `GP/${ward.trim().toUpperCase()}/${String(1000 + seq).slice(1)}`
  const pass: GuestPass = {
    passId,
    patientId,
    patientName: patient.name,
    ward: ward.trim(),
    relationship: relationship?.trim() || 'Guest',
    issuedAt: Date.now(),
    returnedAt: null,
    returned: false,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Guest pass issued', meta: `${passId} · ${patient.name}` },
    ])
    return {
      ...current,
      guestPasses: [...current.guestPasses, pass],
      activityLog,
      nextIds: { ...current.nextIds, pass: seq + 1, activity: activitySeq },
    }
  })

  return pass
}

export function returnGuestPass(passId: string): void {
  const state = getState()
  const pass = state.guestPasses.find((p) => p.passId === passId)
  if (!pass) throw new DomainError('NOT_FOUND', 'That pass no longer exists.')
  if (pass.returned) throw new DomainError('INVALID_TRANSITION', 'That pass has already been returned.')

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Guest pass returned', meta: `${passId} · ${pass.patientName}` },
    ])
    return {
      ...current,
      guestPasses: current.guestPasses.map((p) =>
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
      { text: 'Estimate saved', meta: `${estimateId} · ${formatRupees(estimate.total)} · ${estimate.patientName}` },
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

/** Raises a bill. */
function applyNewBill(
  state: AppState,
  { patientId, items, appointmentId, estimateId, admissionId }: CreatePaymentInput,
  now: number,
): Step<Payment> {
  const patient = state.patients.find((p) => p.patientId === patientId)
  if (!patient) throw new DomainError('VALIDATION', 'Select a patient first.')
  if (!items?.length) throw new DomainError('VALIDATION', 'Add at least one charge to the bill.')

  const seq = state.nextIds.payment
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const payment: Payment = {
    paymentId: `pay-${seq}`,
    receiptNo: `RCT-${String(seq).padStart(6, '0')}`,
    patientId,
    patientName: patient.name,
    appointmentId: appointmentId ?? null,
    estimateId: estimateId ?? null,
    admissionId: admissionId ?? null,
    items,
    totalAmount: total,
    paidAmount: 0,
    balance: total,
    status: 'Pending',
    transactions: [],
    failedAttempts: [],
    refund: null,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    cancelReason: null,
  }
  const next = logged(
    { ...state, payments: [...state.payments, payment], nextIds: { ...state.nextIds, payment: seq + 1 } },
    [{ text: 'Payment bill created', meta: `${patient.name} · ${formatRupees(total)}` }],
  )
  return { state: next, value: payment }
}

/** Records money collected on a bill. Fully paying a booking's bill
 *  confirms that one booking. */
function applyCollection(state: AppState, { paymentId, amount, method }: CollectPaymentInput, now: number): Step<Payment> {
  const payment = requirePayment(state, paymentId)
  if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
    throw new DomainError('INVALID_TRANSITION', `Cannot collect against a payment that is ${payment.status}.`)
  }
  if (!(amount > 0)) throw new DomainError('VALIDATION', 'Enter an amount greater than zero.')
  if (amount > payment.balance) {
    throw new DomainError('VALIDATION', `That is more than the ${formatRupees(payment.balance)} balance due.`)
  }
  // Only a stay billed to an insurer, TPA or company is settled by that payer.
  if (method === 'Insurance/TPA') {
    const admission = payment.admissionId ? state.admissions.find((a) => a.admissionId === payment.admissionId) : undefined
    if (!admission || admission.paymentType === 'Self Pay') {
      throw new DomainError('VALIDATION', 'Only an insured inpatient’s bill can be settled by the insurer.')
    }
  }

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

  // Only the booking this bill was blocking moves from "awaiting payment"
  // to Confirmed — never every booking the patient has, and never one that
  // has already moved on.
  const linkedAppointment =
    status === 'Paid' && payment.appointmentId ? state.appointments.find((a) => a.appointmentId === payment.appointmentId) : undefined
  const confirms = linkedAppointment?.status === 'Payment Pending'

  const next = logged(
    {
      ...state,
      payments: state.payments.map((p) => (p.paymentId === paymentId ? updated : p)),
      appointments: confirms
        ? state.appointments.map((a) => (a.appointmentId === payment.appointmentId ? { ...a, status: 'Confirmed' as const } : a))
        : state.appointments,
      nextIds: { ...state.nextIds, transaction: nextSeq },
    },
    [
      {
        text: status === 'Paid' ? 'Payment collected' : 'Partial payment recorded',
        meta:
          status === 'Paid'
            ? `${payment.patientName} · ${formatRupees(amount)} · ${method}`
            : `${payment.patientName} · ${formatRupees(paidAmount)} of ${formatRupees(payment.totalAmount)}`,
      },
      ...(confirms ? [{ text: 'Appointment confirmed', meta: `${payment.patientName} · payment received` }] : []),
    ],
  )
  return { state: next, value: updated }
}

/** Gives back everything collected on a bill, by the methods it came in. */
function applyFullRefund(state: AppState, paymentId: string, reason: string, now: number): Step<Payment> {
  const payment = requirePayment(state, paymentId)
  if ((payment.status !== 'Paid' && payment.status !== 'Partially Paid') || !(payment.paidAmount > 0)) {
    throw new DomainError('INVALID_TRANSITION', 'Only a bill with money collected on it can be refunded.')
  }
  if (!reason.trim()) throw new DomainError('VALIDATION', 'A refund reason is required.')
  const methods = [...new Set(payment.transactions.map((t) => t.method))]
  const updated: Payment = {
    ...payment,
    status: 'Refunded',
    refund: {
      refundId: `RFD-${payment.receiptNo.replace('RCT-', '')}`,
      amount: payment.paidAmount,
      reason: reason.trim(),
      refundedAt: now,
      methods,
    },
    updatedAt: now,
  }
  const next = logged({ ...state, payments: state.payments.map((p) => (p.paymentId === paymentId ? updated : p)) }, [
    {
      text: 'Payment refunded',
      meta: `${payment.patientName} · ${payment.receiptNo} · ${formatRupees(payment.paidAmount)} · ${methods.join(' + ')}`,
    },
  ])
  return { state: next, value: updated }
}

/** Closes a bill nothing was collected on. */
function applyBillCancel(state: AppState, paymentId: string, reason: string, now: number): Step<Payment> {
  const payment = requirePayment(state, paymentId)
  if (payment.paidAmount > 0) {
    throw new DomainError('INVALID_TRANSITION', 'Money has already been collected against this bill — refund it instead of cancelling.')
  }
  if (payment.status !== 'Pending') {
    throw new DomainError('INVALID_TRANSITION', `Cannot cancel a payment that is ${payment.status}.`)
  }
  if (!reason.trim()) throw new DomainError('VALIDATION', 'A cancellation reason is required.')
  const updated: Payment = { ...payment, status: 'Cancelled', cancelledAt: now, cancelReason: reason.trim(), updatedAt: now }
  const next = logged({ ...state, payments: state.payments.map((p) => (p.paymentId === paymentId ? updated : p)) }, [
    { text: 'Payment bill cancelled', meta: `${payment.patientName} · ${payment.receiptNo} · ${reason.trim()}` },
  ])
  return { state: next, value: updated }
}

export function createPaymentBill(input: CreatePaymentInput): Payment {
  const { state, value } = applyNewBill(getState(), input, Date.now())
  setState(state)
  return value
}

export function collectPayment(input: CollectPaymentInput): Payment {
  const { state, value } = applyCollection(getState(), input, Date.now())
  setState(state)
  return value
}

/** Records a collection that did not go through — the UPI payment never
 *  arrived, the card was declined. No money moves; the bill reads "Failed"
 *  until the next successful collection. */
export function recordFailedPayment({ paymentId, amount, method, reason }: RecordFailedPaymentInput): Payment {
  const state = getState()
  const payment = requirePayment(state, paymentId)
  if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
    throw new DomainError('INVALID_TRANSITION', `This bill is ${payment.status.toLowerCase()}.`)
  }
  if (!(payment.balance > 0)) throw new DomainError('INVALID_TRANSITION', 'Nothing is due on this bill.')
  if (!(amount > 0) || amount > payment.balance) {
    throw new DomainError('VALIDATION', `Enter an amount up to the ${formatRupees(payment.balance)} due.`)
  }

  const now = Date.now()
  const seq = state.nextIds.attempt
  const updated: Payment = {
    ...payment,
    failedAttempts: [
      ...payment.failedAttempts,
      { attemptId: `ATT-${String(seq).padStart(6, '0')}`, amount, method, reason: reason.trim() || 'Payment not completed', attemptedAt: now },
    ],
    updatedAt: now,
  }

  setState((current) => {
    const { activityLog, activitySeq } = withActivity(current, [
      { text: 'Payment attempt failed', meta: `${payment.patientName} · ${formatRupees(amount)} · ${method} · ${updated.failedAttempts[updated.failedAttempts.length - 1].reason}` },
    ])
    return {
      ...current,
      payments: current.payments.map((p) => (p.paymentId === paymentId ? updated : p)),
      activityLog,
      nextIds: { ...current.nextIds, attempt: seq + 1, activity: activitySeq },
    }
  })

  return updated
}

/** Cancels a bill on its own — only one nothing was collected on, and not
 *  one held by an open booking or a current stay (getBillLock). */
export function cancelPayment({ paymentId, reason }: CancelPaymentInput): void {
  const state = getState()
  const lock = getBillLock(state, requirePayment(state, paymentId))
  if (lock) throw new DomainError('INVALID_TRANSITION', lock)
  setState(applyBillCancel(state, paymentId, reason ?? '', Date.now()).state)
}

/** Refunds a bill in full, on its own — not one held by a booking or a
 *  current stay (getBillLock); a booking's fee is refunded by cancelling
 *  the booking because the doctor is unavailable. */
export function refundPayment({ paymentId, reason }: RefundPaymentInput): Payment {
  const state = getState()
  const payment = requirePayment(state, paymentId)
  const lock = getBillLock(state, payment)
  if (lock) throw new DomainError('INVALID_TRANSITION', lock)
  const { state: next, value } = applyFullRefund(state, paymentId, reason ?? '', Date.now())
  setState(next)
  return value
}
