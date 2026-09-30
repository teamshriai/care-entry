// Pure, read-only derivations over store state. Nothing here mutates
// anything — every function takes `state` (and a `now` timestamp where time
// matters) and computes a fresh value. This is the ONLY place doctor
// status, slot availability, waiting time, queue position and the
// dashboard's numbers are computed. No screen hardcodes any of them.
import { slotToTimestamp, slotLabel, dayStartTimestamp, minutesBetween, todayKey } from './time'
import type { AppState } from '../types/store'
import type { Patient, PatientSearchMatch } from '../types/patient'
import type { Provider, DoctorRow, DoctorStatus } from '../types/doctor'
import type { DoctorLeave, DoctorSchedule, ScheduleBreak } from '../types/schedule'
import type { Appointment, AppointmentRow, PatientAppointmentRow, SlotBoardEntry, UpcomingAppointmentRow } from '../types/appointment'
import type { QueueTokenRow, QueueView } from '../types/queue'
import type { AttendantPass, Estimate, MlcRecord, Tariff } from '../types/frontDesk'
import type { ActivityLogEntry } from '../types/activity'
import type { Connectivity } from '../types/connectivity'
import type { Payment, PaymentSummary } from '../types/payment'
import type { Tone } from '../utils/tone'

// Only a CANCELLED appointment releases its slot. Completed and No-show
// appointments still occupy the slot they were booked into.
const RELEASED_APPOINTMENT_STATUSES = ['Cancelled']
const LATE_THRESHOLD_MINUTES = 10
const LONG_WAIT_MINUTES = 15

export function getPatients(state: AppState): Patient[] {
  return state.patients
}

export function getProviders(state: AppState): Provider[] {
  return state.providers
}

export function getActiveProviders(state: AppState): Provider[] {
  return state.providers.filter((p) => p.status === 'Active')
}

export function getPatientById(state: AppState, patientId: string): Patient | null {
  return state.patients.find((p) => p.patientId === patientId) ?? null
}

export function getProviderById(state: AppState, providerId: string): Provider | null {
  return state.providers.find((p) => p.providerId === providerId) ?? null
}

export function getDepartments(state: AppState): string[] {
  return [...new Set(state.providers.map((p) => p.department))].sort()
}

export function getSpecialties(state: AppState): string[] {
  return [...new Set(state.providers.map((p) => p.specialty))].sort()
}

export function getTariffs(state: AppState): Tariff[] {
  return state.tariffs
}

export function getAttendantPasses(state: AppState): AttendantPass[] {
  return [...state.attendantPasses].sort((a, b) => b.issuedAt - a.issuedAt)
}

/** Wards already defined in the project — every ward that has beds in the
 *  admission data plus any ward an existing pass was issued against. The
 *  Attendant Pass form offers these (with a few standard wards) as its only
 *  choices; no ward name is ever typed in freehand. */
export function getKnownWards(state: AppState): string[] {
  const wards = new Set<string>()
  for (const bed of state.beds) wards.add(bed.ward)
  for (const pass of state.attendantPasses) wards.add(pass.ward)
  return [...wards]
}

export function getEstimates(state: AppState): Estimate[] {
  return [...state.estimates].sort((a, b) => b.createdAt - a.createdAt)
}

/** The one estimate a patient is currently working on — Cancelled ones don't
 *  count, so a fresh Add after a cancellation starts a clean estimate rather
 *  than reviving the old one. */
export function getActiveEstimateForPatient(state: AppState, patientId: string): Estimate | null {
  if (!patientId) return null
  return state.estimates.find((e) => e.patientId === patientId && e.status !== 'Cancelled') ?? null
}

export function getMlcRecords(state: AppState): MlcRecord[] {
  return [...state.mlcRecords].sort((a, b) => b.registeredAt - a.registeredAt)
}

export function getDoctorLeaves(state: AppState, providerId: string): DoctorLeave[] {
  return state.leaves.filter((leave) => leave.providerId === providerId).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The doctor's session for a date, COMPUTED from their schedule config
 * (working days + hours + slot length) rather than stored per-day. This is
 * what lets a doctor registered a minute ago be immediately bookable, and
 * lets booking work for any date — not just today.
 */
export function getDoctorSchedule(state: AppState, providerId: string, date: string = state.today): DoctorSchedule | null {
  const provider = getProviderById(state, providerId)
  if (!provider || provider.status !== 'Active' || !provider.schedule) return null

  const config = provider.schedule
  const dayOfWeek = new Date(dayStartTimestamp(date)).getDay()
  if (!config.workingDays.includes(dayOfWeek)) return null

  const leave = state.leaves.find((item) => item.providerId === providerId && item.date === date)
  const slots: string[] = []
  const startTs = slotToTimestamp(date, config.startTime)
  const endTs = slotToTimestamp(date, config.endTime)
  for (let ts = startTs; ts <= endTs; ts += config.slotMinutes * 60000) slots.push(slotLabel(ts))

  return {
    providerId,
    date,
    slots,
    breaks: config.breaks ?? [],
    onLeave: Boolean(leave),
    leaveReason: leave?.reason ?? null,
    sessionStart: config.startTime,
    sessionEnd: config.endTime,
    slotMinutes: config.slotMinutes,
  }
}

function isWithinBreak(schedule: DoctorSchedule, date: string, timestamp: number): boolean {
  return (schedule.breaks ?? []).some((window: ScheduleBreak) => {
    const start = slotToTimestamp(date, window.start)
    const end = slotToTimestamp(date, window.end)
    return timestamp >= start && timestamp < end
  })
}

function appointmentsFor(state: AppState, providerId: string, date: string): Appointment[] {
  return state.appointments.filter(
    (a) => a.providerId === providerId && a.date === date && !RELEASED_APPOINTMENT_STATUSES.includes(a.status),
  )
}

/**
 * The whole slot grid for a date, each slot tagged with what it actually is
 * right now: booked / past / break / available. Booking shows all of them —
 * a booked slot is information, not something to hide.
 */
export function getSlotBoard(state: AppState, providerId: string, now: number = Date.now(), date: string = state.today): SlotBoardEntry[] {
  const schedule = getDoctorSchedule(state, providerId, date)
  if (!schedule || schedule.onLeave) return []

  const bySlot = new Map(appointmentsFor(state, providerId, date).map((a) => [a.slot, a]))

  return schedule.slots.map((slot) => {
    const timestamp = slotToTimestamp(date, slot)
    const appointment = bySlot.get(slot) ?? null
    let status: SlotBoardEntry['status'] = 'available'
    if (appointment) status = 'booked'
    else if (isWithinBreak(schedule, date, timestamp)) status = 'break'
    else if (timestamp < now - 60000) status = 'past'
    return { slot, timestamp, status, appointment }
  })
}

export function getAvailableSlots(state: AppState, providerId: string, now: number = Date.now(), date: string = state.today): string[] {
  return getSlotBoard(state, providerId, now, date)
    .filter((entry) => entry.status === 'available')
    .map((entry) => entry.slot)
}

/**
 * How far behind the session is running: the longest overdue wait among
 * patients checked in but not yet seen, measured against the slot they were
 * booked into. Real arithmetic on real timestamps.
 */
export function getDoctorDelayMinutes(state: AppState, providerId: string, now: number = Date.now(), date: string = state.today): number {
  const appointmentsById = new Map(state.appointments.map((a) => [a.appointmentId, a]))
  let worst = 0
  for (const token of state.queueTokens) {
    if (token.providerId !== providerId) continue
    if (token.status !== 'Waiting' && token.status !== 'Called') continue
    const visit = state.visits.find((v) => v.visitId === token.visitId)
    const appointment = visit?.appointmentId ? appointmentsById.get(visit.appointmentId) : null
    if (!appointment || appointment.date !== date) continue
    worst = Math.max(worst, minutesBetween(now, slotToTimestamp(date, appointment.slot)))
  }
  return worst
}

/**
 * Operational status — never stored on the provider. Derived, in priority
 * order, from account status > leave > break > live queue activity >
 * schedule adherence > remaining availability.
 */
export function getDoctorStatus(state: AppState, providerId: string, now: number = Date.now(), date: string = state.today): DoctorStatus {
  const provider = getProviderById(state, providerId)
  if (!provider) return 'Not scheduled'
  if (provider.status !== 'Active') return 'Inactive'

  const schedule = getDoctorSchedule(state, providerId, date)
  if (!schedule) return 'Not scheduled'
  if (schedule.onLeave) return 'On leave'
  if (schedule.slots.length === 0) return 'Not scheduled'

  // "Currently in session", "on break", "with a patient" and "running late"
  // are all live-clock signals — they only mean something when `date` is
  // the day the clock is actually in. For any other date (past or future,
  // e.g. picked from the monthly calendar), status is schedule/booking-only.
  if (date === todayKey(new Date(now))) {
    const sessionStart = slotToTimestamp(date, schedule.sessionStart)
    const sessionEnd = slotToTimestamp(date, schedule.sessionEnd)
    if (now < sessionStart || now > sessionEnd) return 'Not scheduled'

    if (isWithinBreak(schedule, date, now)) return 'On break'

    // Live activity outranks schedule drift: if the doctor is actually with a
    // patient, that's the more useful signal. Any delay is surfaced separately.
    const busy = state.queueTokens.some(
      (t) => t.providerId === providerId && (t.status === 'Called' || t.status === 'In consultation'),
    )
    if (busy) return 'In consultation'

    if (getDoctorDelayMinutes(state, providerId, now, date) >= LATE_THRESHOLD_MINUTES) return 'Running late'
  }

  if (getAvailableSlots(state, providerId, now, date).length === 0) return 'Fully booked'
  return 'Available'
}

export function getTodaysAppointmentCount(state: AppState, providerId: string, date: string = state.today): number {
  return appointmentsFor(state, providerId, date).length
}

export function getDoctorRows(state: AppState, now: number = Date.now(), date: string = state.today): DoctorRow[] {
  return state.providers.map((provider) => {
    const status = getDoctorStatus(state, provider.providerId, now, date)
    const schedule = getDoctorSchedule(state, provider.providerId, date)
    return {
      provider,
      status,
      schedule,
      nextSlot: getAvailableSlots(state, provider.providerId, now, date)[0] ?? null,
      openSlotCount: getAvailableSlots(state, provider.providerId, now, date).length,
      todaysAppointmentCount: getTodaysAppointmentCount(state, provider.providerId, date),
      // Always computed — a doctor can be In consultation *and* behind.
      delayMinutes: getDoctorDelayMinutes(state, provider.providerId, now, date),
    }
  })
}

export function getDoctorRow(state: AppState, providerId: string, now: number = Date.now(), date: string = state.today): DoctorRow | null {
  return getDoctorRows(state, now, date).find((row) => row.provider.providerId === providerId) ?? null
}

export function getAppointmentsForDate(state: AppState, date: string = state.today): AppointmentRow[] {
  return state.appointments
    .filter((a) => a.date === date)
    .map((a) => {
      const visit = a.visitId ? state.visits.find((v) => v.visitId === a.visitId) ?? null : null
      const token = visit ? state.queueTokens.find((t) => t.visitId === visit.visitId) ?? null : null
      return {
        ...a,
        patient: getPatientById(state, a.patientId),
        provider: getProviderById(state, a.providerId),
        visit,
        token,
        slotTimestamp: slotToTimestamp(a.date, a.slot),
      }
    })
    .sort((a, b) => a.slot.localeCompare(b.slot))
}

/** Appointments across the next N days (today included), soonest first. */
export function getUpcomingAppointments(state: AppState, days: number = 7): UpcomingAppointmentRow[] {
  const start = dayStartTimestamp(state.today)
  const dates = new Set<string>()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start + i * 24 * 60 * 60 * 1000)
    dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return state.appointments
    .filter((a) => dates.has(a.date))
    .map((a) => ({
      ...a,
      patient: getPatientById(state, a.patientId),
      provider: getProviderById(state, a.providerId),
      visit: a.visitId ? state.visits.find((v) => v.visitId === a.visitId) ?? null : null,
      slotTimestamp: slotToTimestamp(a.date, a.slot),
    }))
    .sort((a, b) => a.slotTimestamp - b.slotTimestamp)
}

export function getAppointmentsForPatient(state: AppState, patientId: string): PatientAppointmentRow[] {
  return state.appointments
    .filter((a) => a.patientId === patientId)
    .map((a) => ({
      ...a,
      provider: getProviderById(state, a.providerId),
      slotTimestamp: slotToTimestamp(a.date, a.slot),
    }))
    .sort((a, b) => b.slotTimestamp - a.slotTimestamp)
}

export function getAppointmentsForProvider(state: AppState, providerId: string, date: string = state.today): AppointmentRow[] {
  return getAppointmentsForDate(state, date).filter((a) => a.providerId === providerId)
}

/** Observed consultation pace for a doctor — the mean of today's completed
 *  consultations, falling back to their configured slot length. Used for
 *  estimated waits, so the estimate reflects how this doctor actually runs. */
export function getAverageConsultationMinutes(state: AppState, providerId: string): number {
  const completed = state.queueTokens.filter(
    (t) => t.providerId === providerId && t.status === 'Completed' && t.startedAt && t.completedAt,
  )
  if (completed.length === 0) {
    return getProviderById(state, providerId)?.schedule?.slotMinutes ?? 15
  }
  const total = completed.reduce((sum, t) => sum + ((t.completedAt as number) - (t.startedAt as number)), 0)
  return Math.max(5, Math.round(total / completed.length / 60000))
}

export function getQueueView(state: AppState, now: number = Date.now()): QueueView {
  const waitingByProvider = new Map<string, typeof state.queueTokens>()
  for (const token of state.queueTokens) {
    if (token.status !== 'Waiting') continue
    if (!waitingByProvider.has(token.providerId)) waitingByProvider.set(token.providerId, [])
    waitingByProvider.get(token.providerId)!.push(token)
  }
  for (const list of waitingByProvider.values()) list.sort((a, b) => a.createdAt - b.createdAt)

  const rows: QueueTokenRow[] = state.queueTokens.map((token) => {
    const visit = state.visits.find((v) => v.visitId === token.visitId) ?? null
    const appointment = visit?.appointmentId
      ? state.appointments.find((a) => a.appointmentId === visit.appointmentId) ?? null
      : null

    let position: number | null = null
    let estimatedWaitMinutes: number | null = null
    if (token.status === 'Waiting') {
      const queueForDoctor = waitingByProvider.get(token.providerId) ?? []
      position = queueForDoctor.findIndex((t) => t.tokenId === token.tokenId) + 1
      const doctorBusy = state.queueTokens.some(
        (t) => t.providerId === token.providerId && (t.status === 'Called' || t.status === 'In consultation'),
      )
      const ahead = position - 1 + (doctorBusy ? 1 : 0)
      estimatedWaitMinutes = ahead * getAverageConsultationMinutes(state, token.providerId)
    }

    return {
      ...token,
      patient: getPatientById(state, token.patientId),
      provider: getProviderById(state, token.providerId),
      appointment,
      position,
      estimatedWaitMinutes,
      waitingMinutes: token.status === 'Waiting' ? minutesBetween(now, token.createdAt) : null,
      calledMinutes: token.status === 'Called' ? minutesBetween(now, token.calledAt ?? token.createdAt) : null,
      consultingMinutes:
        token.status === 'In consultation' ? minutesBetween(now, token.startedAt ?? token.createdAt) : null,
    }
  })

  return {
    all: rows,
    waiting: rows.filter((t) => t.status === 'Waiting').sort((a, b) => a.createdAt - b.createdAt),
    called: rows.filter((t) => t.status === 'Called').sort((a, b) => (a.calledAt ?? 0) - (b.calledAt ?? 0)),
    inConsultation: rows.filter((t) => t.status === 'In consultation'),
    closed: rows
      .filter((t) => t.status === 'Completed' || t.status === 'No-show')
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)),
  }
}

export function getAverageWaitMinutes(state: AppState, now: number = Date.now()): number {
  const { waiting } = getQueueView(state, now)
  if (waiting.length === 0) return 0
  return Math.round(waiting.reduce((sum, t) => sum + (t.waitingMinutes ?? 0), 0) / waiting.length)
}

export interface OperationalSummary {
  todaysRegistrations: number
  todaysAppointments: number
  cancelledAppointments: number
  waitingPatients: number
  averageWaitMinutes: number
  pendingPayments: number
  doctorsAvailable: number
  doctorsOnDuty: number
  doctorsTotal: number
  pendingActions: number
}

export function getOperationalSummary(state: AppState, now: number = Date.now()): OperationalSummary {
  const date = state.today
  const appointments = getAppointmentsForDate(state, date)
  const queue = getQueueView(state, now)
  const doctorRows = getDoctorRows(state, now, date)

  return {
    todaysRegistrations: state.registrationLog.length,
    todaysAppointments: appointments.filter((a) => a.status !== 'Cancelled').length,
    cancelledAppointments: appointments.filter((a) => a.status === 'Cancelled').length,
    waitingPatients: queue.waiting.length,
    averageWaitMinutes: getAverageWaitMinutes(state, now),
    pendingPayments: getPendingPayments(state).length,
    doctorsAvailable: doctorRows.filter((r) => r.status === 'Available').length,
    doctorsOnDuty: doctorRows.filter((r) => !['On leave', 'Not scheduled', 'Inactive'].includes(r.status)).length,
    doctorsTotal: doctorRows.filter((r) => r.provider.status === 'Active').length,
    pendingActions: getNeedsAttention(state, now).length,
  }
}

/** Patient records that look like the same human being — matched on an
 *  identical mobile number, derived from the records themselves. */
export function getPossibleDuplicates(state: AppState): Patient[][] {
  const byMobile = new Map<string, Patient[]>()
  for (const patient of state.patients) {
    const key = patient.mobile.replace(/[^0-9]/g, '').slice(-10)
    if (!key) continue
    if (!byMobile.has(key)) byMobile.set(key, [])
    byMobile.get(key)!.push(patient)
  }
  return [...byMobile.values()].filter((group) => group.length > 1)
}

export function findPossibleDuplicatesFor(
  state: AppState,
  { name = '', mobile = '' }: { name?: string; mobile?: string },
): Patient[] {
  const digits = mobile.replace(/[^0-9]/g, '').slice(-10)
  const normalizedName = name.trim().toLowerCase()
  if (digits.length < 10 && normalizedName.length < 3) return []

  return state.patients.filter((patient) => {
    const patientDigits = patient.mobile.replace(/[^0-9]/g, '').slice(-10)
    if (digits.length === 10 && patientDigits === digits) return true
    if (normalizedName.length >= 3) {
      if (patient.name.toLowerCase().includes(normalizedName)) return true
      if (patient.aliases?.some((alias) => alias.includes(normalizedName))) return true
    }
    return false
  })
}

export interface NeedsAttentionItem {
  id: string
  tone: 'warning' | 'neutral' | 'info' | 'critical'
  title: string
  detail: string
}

export function getNeedsAttention(state: AppState, now: number = Date.now()): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = []

  for (const group of getPossibleDuplicates(state)) {
    items.push({
      id: `na-dup-${group[0].patientId}`,
      tone: 'warning',
      title: 'Possible duplicate patient',
      detail: `${group.map((p) => p.uhid).join(' and ')} share a mobile number (${group[0].name})`,
    })
  }

  for (const token of getQueueView(state, now).waiting) {
    if ((token.waitingMinutes ?? 0) >= LONG_WAIT_MINUTES) {
      items.push({
        id: `na-wait-${token.tokenId}`,
        tone: 'warning',
        title: 'Patient awaiting doctor',
        detail: `${token.patient?.name ?? 'A patient'} has been awaiting the doctor for ${token.waitingMinutes} minutes (${token.tokenNumber}).`,
      })
    }
  }

  for (const row of getDoctorRows(state, now)) {
    if (row.status === 'Running late') {
      items.push({
        id: `na-late-${row.provider.providerId}`,
        tone: 'warning',
        title: 'Doctor running late',
        detail: `${row.provider.name} is about ${row.delayMinutes} minutes behind schedule.`,
      })
    }
    if (row.status === 'On leave') {
      items.push({
        id: `na-leave-${row.provider.providerId}`,
        tone: 'neutral',
        title: 'Doctor unavailable',
        detail: `${row.provider.name} is on leave today — no bookable slots in ${row.provider.department}.`,
      })
    }
  }

  for (const appointment of getAppointmentsForDate(state)) {
    if (appointment.status === 'Scheduled' && appointment.slotTimestamp <= now + 60 * 60000) {
      items.push({
        id: `na-confirm-${appointment.appointmentId}`,
        tone: 'info',
        title: 'Appointment needs confirmation',
        detail: `${appointment.patient?.name ?? 'A patient'} at ${appointment.slot} with ${appointment.provider?.name ?? ''}.`,
      })
    }
  }

  const dayMs = 24 * 60 * 60 * 1000
  for (const pass of state.attendantPasses) {
    if (!pass.returned && now - pass.issuedAt > dayMs) {
      items.push({
        id: `na-pass-${pass.passId}`,
        tone: 'critical',
        title: 'Attendant pass overdue',
        detail: `${pass.passId} (${pass.patientName}, ward ${pass.ward}) has not been returned.`,
      })
    }
  }

  return items
}

export function getActivityLog(state: AppState): ActivityLogEntry[] {
  return [...state.activityLog].sort((a, b) => b.time - a.time)
}

export interface ActivityCategoryCount {
  label: string
  value: number
  tone: Tone
}

// Every text value below is a literal string actually written by
// domain/actions.ts and domain/admissionActions.ts (see withActivity call
// sites) — this only re-groups real activity-log entries into the counts
// the Dashboard's chart shows, it never invents a count. Entries whose text
// isn't one of these (ABHA linking, attendant passes, MLC, doctor
// registration/leave, estimates, queue/token events) aren't part of these
// five categories and are left out of the chart, same as they were never
// singled out in the list view either.
const ACTIVITY_CATEGORY_TEXT: Record<string, string> = {
  'Appointment booked': 'Appointments',
  'Appointment confirmed': 'Appointments',
  'Appointment rescheduled': 'Appointments',
  'Consultation started': 'Appointments',
  'Consultation completed': 'Appointments',
  'New patient registered': 'Patients Registered',
  'Payment bill created': 'Payments',
  'Payment refunded': 'Payments',
  'Patient admitted': 'Admissions',
  'Admission billed': 'Admissions',
  'Patient discharged': 'Admissions',
  'Appointment cancelled': 'Cancellations',
  'Admission cancelled': 'Cancellations',
  'Payment bill cancelled': 'Cancellations',
}

const ACTIVITY_CATEGORY_TONE: Record<string, Tone> = {
  Appointments: 'info',
  'Patients Registered': 'teal',
  Payments: 'warning',
  Admissions: 'purple',
  Cancellations: 'rose',
}

export function getActivitySummary(state: AppState): ActivityCategoryCount[] {
  const counts = new Map<string, number>()
  for (const entry of state.activityLog) {
    const category = ACTIVITY_CATEGORY_TEXT[entry.text]
    if (!category) continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value, tone: ACTIVITY_CATEGORY_TONE[label] }))
    .sort((a, b) => b.value - a.value)
}

export function getConnectivity(state: AppState): Connectivity {
  return state.connectivity
}

const MIN_QUERY_LENGTH = 2

function digitsOf(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

/** Client-side patient index search — stands in for a real patient-index
 *  API. The alias list simulates transliteration matching; it is not a real
 *  identity-matching implementation. */
export function searchPatients(state: AppState, rawQuery: string): PatientSearchMatch[] {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < MIN_QUERY_LENGTH) return []
  const queryDigits = digitsOf(query)

  return state.patients
    .map((patient): PatientSearchMatch | null => {
      if (patient.uhid.toLowerCase().includes(query)) return { patient, matchedOn: 'UHID' }
      if (patient.name.toLowerCase().includes(query)) return { patient, matchedOn: 'Name' }
      if (patient.nameNative && patient.nameNative.includes(rawQuery.trim())) {
        return { patient, matchedOn: 'Name (native script)' }
      }
      if (patient.aliases?.some((alias) => alias.includes(query))) {
        return { patient, matchedOn: 'Name (known alias)' }
      }
      if (queryDigits.length >= 3 && digitsOf(patient.mobile).includes(queryDigits)) {
        return { patient, matchedOn: 'Phone' }
      }
      if (patient.abhaId && patient.abhaId.toLowerCase().includes(query)) return { patient, matchedOn: 'ABHA' }
      return null
    })
    .filter((result): result is PatientSearchMatch => result !== null)
}

export interface PatientSearchResult extends PatientSearchMatch {
  appointmentToday: AppointmentRow | null
  appointmentCount: number
}

/** Search results with the operational context staff need to act on. */
export function getPatientSearchResults(state: AppState, rawQuery: string): PatientSearchResult[] {
  const appointments = getAppointmentsForDate(state)
  return searchPatients(state, rawQuery).map((result) => {
    const todays = appointments
      .filter((a) => a.patientId === result.patient.patientId && a.status !== 'Cancelled')
      .sort((a, b) => a.slot.localeCompare(b.slot))
    return { ...result, appointmentToday: todays[0] ?? null, appointmentCount: todays.length }
  })
}

// -------------------------------------------------------------- payments

export function getPayments(state: AppState): Payment[] {
  return [...state.payments].sort((a, b) => b.createdAt - a.createdAt)
}

export function getPaymentById(state: AppState, paymentId: string): Payment | null {
  return state.payments.find((p) => p.paymentId === paymentId) ?? null
}

export function getPaymentsForPatient(state: AppState, patientId: string): Payment[] {
  return getPayments(state).filter((p) => p.patientId === patientId)
}

/** Everything a patient still owes money on — the front desk's worklist.
 *  Cancelled and Refunded bills carry no live balance, so they never appear
 *  here even if `balance` happens to be non-zero on the record. */
export function getPendingPayments(state: AppState): Payment[] {
  return getPayments(state).filter(
    (p) => p.balance > 0 && p.status !== 'Cancelled' && p.status !== 'Refunded',
  )
}

/** Today's headline figures — the same derivation feeds the Payment
 *  Dashboard and the small Front Office Home widget, so the two numbers can
 *  never drift apart. */
export function getPaymentSummary(state: AppState): PaymentSummary {
  let collectedToday = 0
  let transactionsToday = 0
  let refundsToday = 0

  for (const payment of state.payments) {
    for (const txn of payment.transactions) {
      if (todayKey(new Date(txn.collectedAt)) === state.today) {
        collectedToday += txn.amount
        transactionsToday += 1
      }
    }
    if (payment.refund && todayKey(new Date(payment.refund.refundedAt)) === state.today) {
      refundsToday += 1
    }
  }

  const pendingAmount = getPendingPayments(state).reduce((sum, p) => sum + p.balance, 0)

  return { collectedToday, pendingAmount, transactionsToday, refundsToday }
}

/** The Billing & Accounts dashboard's own headline figures — built on the
 *  same Payment records as getPaymentSummary, just counted from the bill's
 *  own side (how many were raised today) rather than the collection side. */
export function getBillingSummary(state: AppState): {
  billsToday: number
  collectedToday: number
  pendingPayments: number
  outstandingAmount: number
} {
  const paymentSummary = getPaymentSummary(state)
  const billsToday = state.payments.filter((p) => todayKey(new Date(p.createdAt)) === state.today).length
  const pending = getPendingPayments(state)

  return {
    billsToday,
    collectedToday: paymentSummary.collectedToday,
    pendingPayments: pending.length,
    outstandingAmount: paymentSummary.pendingAmount,
  }
}
