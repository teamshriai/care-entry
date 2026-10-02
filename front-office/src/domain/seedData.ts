// ============================================================================
// DEVELOPMENT SEED DATA — NOT A BACKEND.
//
// This repository has no backend, no API, no database and no real-time
// service (verified: no fetch/axios/websocket usage, no .env, no server or
// api directory). Nothing here is "live" data and the UI says so.
//
// Timestamps and working hours are generated RELATIVE TO APP START, so
// past/upcoming appointments, "running late" and "waiting N min" are real
// clock comparisons whatever time of day the app is opened.
//
// Replacing this with a real backend = delete this file and populate
// store.ts's initial state from an API response. selectors.ts and
// actions.ts are written against the state shape (src/types), not against
// this file.
//
// The full domain model is defined in src/types/ — one file per model,
// derived from exactly the shapes built below and consumed by
// selectors.ts/actions.ts.
// ============================================================================
import { todayKey, dayStartTimestamp, slotToTimestamp, roundDownToStep, slotLabel } from './time'
import type { AppState, TokenCounters } from '../types/store'
import type { Patient } from '../types/patient'
import type { Provider } from '../types/doctor'
import type { DoctorLeave } from '../types/schedule'
import type { Appointment, AppointmentStatus } from '../types/appointment'
import type { Visit } from '../types/visit'
import type { QueueToken, QueueTokenStatus } from '../types/queue'
import type { ActivityLogEntry } from '../types/activity'
import type { GuestPass, MlcRecord, RegistrationLogEntry, Tariff } from '../types/frontDesk'
import type { Payment } from '../types/payment'
import { createAdmissionSeed } from './admissionSeedData'
import { admissionBillItems } from '../utils/billing'

export { todayKey }

const MINUTE = 60000
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

interface AddAppointmentInput {
  patientId: string
  providerId: string
  offset?: number
  status: AppointmentStatus
  arrivedMinutesAgo?: number
  tokenStatus?: QueueTokenStatus
  slot?: string
}

export function createSeedState(): AppState {
  const now = Date.now()
  const today = todayKey()
  const dayStart = dayStartTimestamp(today)
  const minutesAgo = (m: number) => now - m * MINUTE
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

  // Working hours are generated around "now" so the board always looks like
  // a shift in progress, clamped to sane clinic hours.
  const earliest = dayStart + 8 * 60 * MINUTE
  const latest = dayStart + 21 * 60 * MINUTE
  const sessionStart = clamp(roundDownToStep(now - 150 * MINUTE, 15), earliest, latest - 240 * MINUTE)
  const sessionEnd = clamp(roundDownToStep(now + 210 * MINUTE, 15), sessionStart + 180 * MINUTE, latest)
  const t = (ts: number) => slotLabel(ts)

  const providers: Provider[] = [
    {
      providerId: 'dr-arun-kumar',
      name: 'Dr. Arun Kumar',
      gender: 'Male',
      dateOfBirth: '1974-03-12',
      mobile: '+91 98450 11020',
      email: 'arun.kumar@shrimedical.mock',
      department: 'Neurology',
      specialty: 'Stroke & Neurology',
      qualification: 'MBBS, MD, DM (Neurology)',
      registrationNumber: 'KMC-48120',
      experienceYears: 18,
      employeeId: 'SHRI-DOC-014',
      consultationType: 'Outpatient',
      consultationFee: 800,
      room: 'Room 12, Block B',
      loginEmail: 'arun.kumar@shrimedical.mock',
      role: 'Consultant',
      status: 'Active',
      schedule: { workingDays: ALL_DAYS, startTime: t(sessionStart), endTime: t(sessionEnd), slotMinutes: 15, breaks: [] },
      createdAt: minutesAgo(400 * 24 * 60),
    },
    {
      providerId: 'dr-priya-nair',
      name: 'Dr. Priya Nair',
      gender: 'Female',
      dateOfBirth: '1981-07-30',
      mobile: '+91 98451 33440',
      email: 'priya.nair@shrimedical.mock',
      department: 'Cardiology',
      specialty: 'Interventional Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology)',
      registrationNumber: 'KMC-52990',
      experienceYears: 12,
      employeeId: 'SHRI-DOC-021',
      consultationType: 'Outpatient',
      consultationFee: 900,
      room: 'Room 4, Block A',
      loginEmail: 'priya.nair@shrimedical.mock',
      role: 'Consultant',
      status: 'Active',
      schedule: { workingDays: ALL_DAYS, startTime: t(sessionStart + 30 * MINUTE), endTime: t(sessionEnd), slotMinutes: 15, breaks: [] },
      createdAt: minutesAgo(300 * 24 * 60),
    },
    {
      providerId: 'dr-rahul-menon',
      name: 'Dr. Rahul Menon',
      gender: 'Male',
      dateOfBirth: '1978-11-04',
      mobile: '+91 98452 77810',
      email: 'rahul.menon@shrimedical.mock',
      department: 'General Medicine',
      specialty: 'Internal Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      registrationNumber: 'KMC-44117',
      experienceYears: 15,
      employeeId: 'SHRI-DOC-008',
      consultationType: 'Outpatient',
      consultationFee: 600,
      room: 'Room 2, Block A',
      loginEmail: 'rahul.menon@shrimedical.mock',
      role: 'Consultant',
      status: 'Active',
      schedule: { workingDays: ALL_DAYS, startTime: t(sessionStart), endTime: t(sessionEnd), slotMinutes: 15, breaks: [] },
      createdAt: minutesAgo(500 * 24 * 60),
    },
    {
      providerId: 'dr-meera-shah',
      name: 'Dr. Meera Shah',
      gender: 'Female',
      dateOfBirth: '1983-01-22',
      mobile: '+91 98453 90015',
      email: 'meera.shah@shrimedical.mock',
      department: 'Orthopedics',
      specialty: 'Joint Replacement',
      qualification: 'MBBS, MS (Orthopedics)',
      registrationNumber: 'KMC-60441',
      experienceYears: 10,
      employeeId: 'SHRI-DOC-030',
      consultationType: 'Outpatient',
      consultationFee: 750,
      room: 'Room 8, Block C',
      loginEmail: 'meera.shah@shrimedical.mock',
      role: 'Consultant',
      status: 'Active',
      schedule: { workingDays: ALL_DAYS, startTime: t(sessionStart), endTime: t(sessionEnd), slotMinutes: 20, breaks: [] },
      createdAt: minutesAgo(220 * 24 * 60),
    },
    {
      providerId: 'dr-ananya-rao',
      name: 'Dr. Ananya Rao',
      gender: 'Female',
      dateOfBirth: '1986-05-18',
      mobile: '+91 98454 20077',
      email: 'ananya.rao@shrimedical.mock',
      department: 'Neurology',
      specialty: 'Epilepsy & Neurology',
      qualification: 'MBBS, MD, DM (Neurology)',
      registrationNumber: 'KMC-71203',
      experienceYears: 8,
      employeeId: 'SHRI-DOC-042',
      consultationType: 'Outpatient',
      consultationFee: 800,
      room: 'Room 14, Block B',
      loginEmail: 'ananya.rao@shrimedical.mock',
      role: 'Consultant',
      status: 'Active',
      schedule: {
        workingDays: ALL_DAYS,
        startTime: t(sessionStart + 60 * MINUTE),
        endTime: t(sessionEnd),
        slotMinutes: 30,
        // A real break window covering "now" — this is what makes the
        // "On break" status derivable rather than invented.
        breaks: [{ start: t(roundDownToStep(now - 10 * MINUTE, 5)), end: t(roundDownToStep(now + 20 * MINUTE, 5)) }],
      },
      createdAt: minutesAgo(150 * 24 * 60),
    },
    {
      providerId: 'dr-vikram-das',
      name: 'Dr. Vikram Das',
      gender: 'Male',
      dateOfBirth: '1976-09-09',
      mobile: '+91 98455 61234',
      email: 'vikram.das@shrimedical.mock',
      department: 'General Medicine',
      specialty: 'Diabetology',
      qualification: 'MBBS, MD (General Medicine)',
      registrationNumber: 'KMC-39088',
      experienceYears: 20,
      employeeId: 'SHRI-DOC-003',
      consultationType: 'Outpatient',
      consultationFee: 650,
      room: 'Room 1, Block A',
      loginEmail: 'vikram.das@shrimedical.mock',
      role: 'Senior Consultant',
      status: 'Active',
      // Coarse 30-minute grid; every slot gets consumed below -> Fully booked.
      schedule: { workingDays: ALL_DAYS, startTime: t(sessionStart), endTime: t(sessionStart + 240 * MINUTE), slotMinutes: 30, breaks: [] },
      createdAt: minutesAgo(700 * 24 * 60),
    },
  ]

  // Dr. Meera Shah is on approved leave today — drives the "On leave" status.
  const leaves: DoctorLeave[] = [{ leaveId: 'leave-1', providerId: 'dr-meera-shah', date: today, reason: 'Approved leave' }]

  const patients: Patient[] = [
    { patientId: 'SHRI-0044120', uhid: 'SHRI-0044120', name: 'Arun Kumar', nameNative: null, age: 64, sex: 'Male', mobile: '+91 98431 22456', email: null, address: '12 Raja Street, R.S. Puram', abhaId: 'arun.kumar@abdm', registrationStatus: 'Registered', createdAt: minutesAgo(400 * 24 * 60) },
    { patientId: 'SHRI-0091133', uhid: 'SHRI-0091133', name: 'R. Lakshmanan', nameNative: 'ஆர். லக்ஷ்மணன்', age: 58, sex: 'Male', mobile: '+91 98432 11987', email: null, address: '44 Gandhi Road, Peelamedu', abhaId: 'lakshmanan.r@abdm', registrationStatus: 'Registered', aliases: ['laxmanan r', 'laxmanan'], createdAt: minutesAgo(300 * 24 * 60) },
    // Deliberate duplicate of the record above — same mobile, transliterated
    // name. getPossibleDuplicates() finds this from the data itself.
    { patientId: 'SHRI-0091987', uhid: 'SHRI-0091987', name: 'Laxmanan R', nameNative: null, age: 58, sex: 'Male', mobile: '+91 98432 11987', email: null, address: '44 Gandhi Road, Peelamedu', abhaId: null, registrationStatus: 'Registered', createdAt: minutesAgo(52) },
    { patientId: 'SHRI-0078812', uhid: 'SHRI-0078812', name: 'Fatima Sheikh', nameNative: 'فاطمہ شیخ', age: 41, sex: 'Female', mobile: '+91 90441 55220', email: 'f.sheikh@example.mock', address: '9 Mill Road, Singanallur', abhaId: '34-1187-0043-9921', registrationStatus: 'Registered', createdAt: minutesAgo(200 * 24 * 60) },
    { patientId: 'SHRI-0102234', uhid: 'SHRI-0102234', name: 'Priya Nair', nameNative: 'പ്രിയ നായർ', age: 29, sex: 'Female', mobile: '+91 99000 44310', email: null, address: '7 Lake View, Race Course', abhaId: null, registrationStatus: 'Registered', createdAt: minutesAgo(90 * 24 * 60) },
    { patientId: 'SHRI-0111045', uhid: 'SHRI-0111045', name: 'Mohammed Irfan', nameNative: null, age: 35, sex: 'Male', mobile: '+91 90031 77812', email: null, address: '21 Cross Cut Road', abhaId: 'm.irfan@abdm', registrationStatus: 'Registered', createdAt: minutesAgo(190) },
    { patientId: 'SHRI-0120338', uhid: 'SHRI-0120338', name: 'Sunita Rao', nameNative: null, age: 47, sex: 'Female', mobile: '+91 98860 20114', email: null, address: '3 Trichy Road', abhaId: null, registrationStatus: 'Registered', createdAt: minutesAgo(140) },
    { patientId: 'SHRI-0125590', uhid: 'SHRI-0125590', name: 'Karthik Subramanian', nameNative: null, age: 52, sex: 'Male', mobile: '+91 94440 66231', email: null, address: '88 Avinashi Road', abhaId: 'karthik.s@abdm', registrationStatus: 'Registered', createdAt: minutesAgo(95) },
  ]

  // ---- derived scheduling helpers used only while building the seed ----
  const slotsOf = (providerId: string): string[] => {
    const provider = providers.find((p) => p.providerId === providerId)!
    const { startTime, endTime, slotMinutes } = provider.schedule
    const out: string[] = []
    for (let ts = slotToTimestamp(today, startTime); ts <= slotToTimestamp(today, endTime); ts += slotMinutes * MINUTE) {
      out.push(slotLabel(ts))
    }
    return out
  }
  const slotAt = (providerId: string, offset: number): string | null => {
    const slots = slotsOf(providerId)
    if (slots.length === 0) return null
    let index = slots.findIndex((slot) => slotToTimestamp(today, slot) >= now)
    if (index === -1) index = slots.length
    return slots[clamp(index + offset, 0, slots.length - 1)]
  }

  const appointments: Appointment[] = []
  const visits: Visit[] = []
  const queueTokens: QueueToken[] = []
  const activityLog: ActivityLogEntry[] = []
  let appointmentSeq = 1
  let visitSeq = 1
  let tokenSeq = 1
  let activitySeq = 1
  const tokenCounters: TokenCounters = { NEU: 0, CAR: 0, MED: 0, ORT: 0 }
  const PREFIX: Record<string, string> = { Neurology: 'NEU', Cardiology: 'CAR', 'General Medicine': 'MED', Orthopedics: 'ORT' }

  const logAt = (time: number, text: string, meta?: string) => activityLog.push({ id: `act-${activitySeq++}`, time, text, meta })

  function addAppointment({ patientId, providerId, offset, status, arrivedMinutesAgo, tokenStatus, slot: fixedSlot }: AddAppointmentInput): Appointment | null {
    const provider = providers.find((p) => p.providerId === providerId)!
    const slot = fixedSlot ?? slotAt(providerId, offset ?? 0)
    if (!slot) return null
    const appointmentId = `apt-${appointmentSeq++}`
    const bookedAt = slotToTimestamp(today, slot) - (90 + appointmentSeq * 7) * MINUTE
    const patientName = patients.find((p) => p.patientId === patientId)?.name ?? patientId
    const appointment: Appointment = {
      appointmentId, patientId, providerId,
      department: provider.department, date: today, slot, status, visitId: null, reason: null, createdAt: bookedAt,
    }
    logAt(bookedAt, 'Appointment booked', `${patientName} → ${provider.name} at ${slot}`)

    if (status === 'Checked-in' || status === 'Completed') {
      const arrival = minutesAgo(arrivedMinutesAgo ?? 20)
      const visitId = `visit-${visitSeq++}`
      appointment.visitId = visitId
      visits.push({
        visitId, patientId, appointmentId, providerId,
        status: status === 'Completed' ? 'Closed' : 'Open',
        arrivalTime: arrival, checkInTime: arrival + MINUTE,
        closedAt: status === 'Completed' ? arrival + 45 * MINUTE : null,
      })
      logAt(arrival + MINUTE, 'Patient checked in', `${patientName} · ${provider.name}`)

      const prefix = PREFIX[provider.department] ?? 'GEN'
      tokenCounters[prefix] = (tokenCounters[prefix] ?? 0) + 1
      const tokenNumber = `${prefix}-${String(tokenCounters[prefix]).padStart(3, '0')}`
      const tokenId = `tok-${tokenSeq++}`
      const resolved: QueueTokenStatus = tokenStatus ?? (status === 'Completed' ? 'Completed' : 'Waiting')
      queueTokens.push({
        tokenId, tokenNumber, patientId, visitId, providerId, status: resolved,
        createdAt: arrival + MINUTE,
        calledAt: resolved === 'Waiting' ? null : arrival + 12 * MINUTE,
        startedAt: (['In consultation', 'Completed'] as QueueTokenStatus[]).includes(resolved) ? arrival + 14 * MINUTE : null,
        completedAt: resolved === 'Completed' ? arrival + 40 * MINUTE : null,
        recalled: false,
      })
      logAt(arrival + 2 * MINUTE, 'Token generated', `${tokenNumber} · ${patientName}`)
    }
    appointments.push(appointment)
    return appointment
  }

  // Dr. Arun Kumar — currently seeing a patient (token Called).
  addAppointment({ patientId: 'SHRI-0125590', providerId: 'dr-arun-kumar', offset: -8, status: 'Completed', arrivedMinutesAgo: 95 })
  addAppointment({ patientId: 'SHRI-0091133', providerId: 'dr-arun-kumar', offset: -2, status: 'Checked-in', arrivedMinutesAgo: 24, tokenStatus: 'Called' })
  addAppointment({ patientId: 'SHRI-0102234', providerId: 'dr-arun-kumar', offset: 2, status: 'Confirmed' })
  // Booked and paid in one step — every booking carries exactly one bill.
  const irfanBooking = addAppointment({ patientId: 'SHRI-0111045', providerId: 'dr-arun-kumar', offset: 5, status: 'Confirmed' })

  // Dr. Rahul Menon — behind schedule: patients checked in for slots already
  // in the past are still waiting, so the delay is derivable.
  addAppointment({ patientId: 'SHRI-0044120', providerId: 'dr-rahul-menon', offset: -3, status: 'Checked-in', arrivedMinutesAgo: 42 })
  addAppointment({ patientId: 'SHRI-0120338', providerId: 'dr-rahul-menon', offset: -1, status: 'Checked-in', arrivedMinutesAgo: 16 })
  const laxmananBooking = addAppointment({ patientId: 'SHRI-0091987', providerId: 'dr-rahul-menon', offset: 3, status: 'Confirmed' })

  // Dr. Priya Nair — open, plus a no-show earlier in the session.
  addAppointment({ patientId: 'SHRI-0078812', providerId: 'dr-priya-nair', offset: -6, status: 'No-show' })
  addAppointment({ patientId: 'SHRI-0125590', providerId: 'dr-priya-nair', offset: 2, status: 'Confirmed' })

  // Dr. Ananya Rao — on a break right now.
  const priyaBooking = addAppointment({ patientId: 'SHRI-0102234', providerId: 'dr-ananya-rao', offset: 3, status: 'Confirmed' })

  // Dr. Vikram Das — every slot consumed -> Fully booked.
  slotsOf('dr-vikram-das').forEach((slot, index) => {
    addAppointment({
      patientId: patients[(index + 3) % patients.length].patientId,
      providerId: 'dr-vikram-das',
      slot,
      status: slotToTimestamp(today, slot) < now ? 'Completed' : 'Confirmed',
      arrivedMinutesAgo: 60,
    })
  })

  const registrationLog: RegistrationLogEntry[] = [
    { patientId: 'SHRI-0111045', registeredAt: minutesAgo(190) },
    { patientId: 'SHRI-0120338', registeredAt: minutesAgo(140) },
    { patientId: 'SHRI-0125590', registeredAt: minutesAgo(95) },
    { patientId: 'SHRI-0091987', registeredAt: minutesAgo(52) },
  ]
  registrationLog.forEach((entry) => {
    const name = patients.find((p) => p.patientId === entry.patientId)?.name ?? entry.patientId
    logAt(entry.registeredAt, 'New patient registered', `${name} · ${entry.patientId}`)
  })

  const guestPasses: GuestPass[] = [
    { passId: 'GP/4B/0198', patientId: 'SHRI-0120338', patientName: 'Sunita Rao', ward: '4B', relationship: 'Daughter', issuedAt: minutesAgo(26 * 60), returnedAt: null, returned: false },
    { passId: 'GP/2A/0231', patientId: 'SHRI-0125590', patientName: 'Karthik Subramanian', ward: '2A', relationship: 'Spouse', issuedAt: minutesAgo(3 * 60), returnedAt: null, returned: false },
  ]

  // Payments — administrative bills only, never a clinical charge. One
  // example of each status so every screen (dashboard, pending, history,
  // refund) has something real to show on first load. Receipt and
  // transaction numbers share one sequence, matching how a front desk
  // actually numbers them (a receipt IS a transaction, numbered once).
  let paymentSeq = 100
  let transactionSeq = 100
  const nextReceiptNo = () => `RCT-${String(++paymentSeq).padStart(6, '0')}`
  const nextTransactionId = () => `TXN-${String(++transactionSeq).padStart(6, '0')}`
  const paymentPatientName = (id: string) => patients.find((p) => p.patientId === id)?.name ?? id

  const payments: Payment[] = []
  let paymentRecordSeq = 1

  // 1 — Paid today, in full, via UPI.
  {
    const patientId = 'SHRI-0091133'
    const total = 800
    const createdAt = minutesAgo(150)
    const collectedAt = minutesAgo(90)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: null,
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items: [{ code: 'CONS-NEU', description: 'Neurology consultation', amount: total }],
      totalAmount: total,
      paidAmount: total,
      balance: 0,
      status: 'Paid',
      transactions: [{ transactionId: nextTransactionId(), amount: total, method: 'UPI', collectedAt }],
      refund: null,
      createdAt,
      updatedAt: collectedAt,
      cancelledAt: null,
      cancelReason: null,
    })
    logAt(collectedAt, 'Payment collected', `${paymentPatientName(patientId)} · ₹${total.toLocaleString('en-IN')}`)
  }

  // 2 — A booking's bill, paid by UPI when booked.
  {
    const patientId = 'SHRI-0111045'
    const items = [
      { code: 'REG-FEE', description: 'Registration Fee', amount: 100 },
      { code: 'CONS-NEU', description: 'Neurology consultation', amount: 800 },
    ]
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    const createdAt = minutesAgo(40)
    const collectedAt = minutesAgo(39)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: irfanBooking?.appointmentId ?? null,
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items,
      totalAmount: total,
      paidAmount: total,
      balance: 0,
      status: 'Paid',
      transactions: [{ transactionId: nextTransactionId(), amount: total, method: 'UPI', collectedAt }],
      refund: null,
      createdAt,
      updatedAt: collectedAt,
      cancelledAt: null,
      cancelReason: null,
    })
    logAt(collectedAt, 'Payment collected', `${paymentPatientName(patientId)} · ₹${total.toLocaleString('en-IN')}`)
  }

  // 3 — Paid today by card.
  {
    const patientId = 'SHRI-0102234'
    const items = [
      { code: 'CONS-NEU', description: 'Neurology consultation', amount: 800 },
      { code: 'SVC-CHG', description: 'Service Charge', amount: 200 },
    ]
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    const paid = total
    const createdAt = minutesAgo(70)
    const collectedAt = minutesAgo(20)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: null,
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items,
      totalAmount: total,
      paidAmount: paid,
      balance: total - paid,
      status: 'Paid',
      transactions: [{ transactionId: nextTransactionId(), amount: paid, method: 'Card', collectedAt }],
      refund: null,
      createdAt,
      updatedAt: collectedAt,
      cancelledAt: null,
      cancelReason: null,
    })
    logAt(collectedAt, 'Payment collected', `${paymentPatientName(patientId)} · ₹${paid.toLocaleString('en-IN')}`)
  }

  // 4 — Cancelled before anything was collected.
  {
    const patientId = 'SHRI-0120338'
    const total = 100
    const createdAt = minutesAgo(80)
    const cancelledAt = minutesAgo(60)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: null,
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items: [{ code: 'REG-FEE', description: 'Registration Fee', amount: total }],
      totalAmount: total,
      paidAmount: 0,
      balance: total,
      status: 'Cancelled',
      transactions: [],
      refund: null,
      createdAt,
      updatedAt: cancelledAt,
      cancelledAt,
      cancelReason: 'Patient left without registering',
    })
  }

  // 5 — Paid in full, then refunded — linked to Karthik's completed visit
  // with Dr. Arun Kumar (apt-1) to show the appointment↔payment connection.
  {
    const patientId = 'SHRI-0125590'
    const total = 800
    const createdAt = minutesAgo(24 * 60)
    const collectedAt = minutesAgo(23 * 60 + 45)
    const refundedAt = minutesAgo(180)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: 'apt-1',
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items: [{ code: 'CONS-NEU', description: 'Neurology consultation', amount: total }],
      totalAmount: total,
      paidAmount: total,
      balance: 0,
      status: 'Refunded',
      transactions: [{ transactionId: nextTransactionId(), amount: total, method: 'Card', collectedAt }],
      refund: {
        refundId: `RFD-${String(paymentSeq).padStart(6, '0')}`,
        amount: total,
        reason: 'Duplicate booking cancelled by patient',
        refundedAt,
      },
      createdAt,
      updatedAt: refundedAt,
      cancelledAt: null,
      cancelReason: null,
    })
    logAt(refundedAt, 'Payment refunded', `${paymentPatientName(patientId)} · ₹${total.toLocaleString('en-IN')}`)
  }

  // 6 — Paid yesterday by UPI — shows collected-TODAY correctly excludes it.
  {
    const patientId = 'SHRI-0078812'
    const total = 100
    const createdAt = minutesAgo(26 * 60)
    const collectedAt = minutesAgo(26 * 60)
    payments.push({
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId: null,
      estimateId: null,
      admissionId: null,
      failedAttempts: [],
      items: [{ code: 'REG-FEE', description: 'Registration Fee', amount: total }],
      totalAmount: total,
      paidAmount: total,
      balance: 0,
      status: 'Paid',
      transactions: [{ transactionId: nextTransactionId(), amount: total, method: 'UPI', collectedAt }],
      refund: null,
      createdAt,
      updatedAt: collectedAt,
      cancelledAt: null,
      cancelReason: null,
    })
  }

  // The rest of the bills, built through one helper so totals, balance and
  // status are always consistent with the collections recorded against them.
  interface SeedBill {
    patientId: string
    items: Payment['items']
    createdAt: number
    appointmentId?: string | null
    admissionId?: string | null
    collections?: { amount: number; method: Payment['transactions'][number]['method']; at: number }[]
    failed?: { amount: number; method: Payment['transactions'][number]['method']; reason: string; at: number }[]
  }
  let attemptSeq = 1
  const pushBill = ({ patientId, items, createdAt, appointmentId = null, admissionId = null, collections = [], failed = [] }: SeedBill): Payment => {
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    const paid = collections.reduce((sum, c) => sum + c.amount, 0)
    const bill: Payment = {
      paymentId: `pay-${paymentRecordSeq++}`,
      receiptNo: nextReceiptNo(),
      patientId,
      patientName: paymentPatientName(patientId),
      appointmentId,
      estimateId: null,
      admissionId,
      items,
      totalAmount: total,
      paidAmount: paid,
      balance: total - paid,
      status: paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending',
      transactions: collections.map((c) => ({ transactionId: nextTransactionId(), amount: c.amount, method: c.method, collectedAt: c.at })),
      failedAttempts: failed.map((f) => ({
        attemptId: `ATT-${String(attemptSeq++).padStart(6, '0')}`,
        amount: f.amount,
        method: f.method,
        reason: f.reason,
        attemptedAt: f.at,
      })),
      refund: null,
      createdAt,
      updatedAt: Math.max(createdAt, ...collections.map((c) => c.at), ...failed.map((f) => f.at)),
      cancelledAt: null,
      cancelReason: null,
    }
    payments.push(bill)
    return bill
  }
  const consultationLine = (providerId: string) => {
    const provider = providers.find((p) => p.providerId === providerId)!
    return { code: 'CONS-FEE', description: `Consultation — ${provider.name}`, amount: provider.consultationFee }
  }
  const registrationLine = { code: 'REG-FEE', description: 'Registration Fee', amount: 100 }

  // Registration fees long-standing patients paid when they first registered,
  // so their next booking is not charged again.
  for (const patientId of ['SHRI-0044120', 'SHRI-0091133', 'SHRI-0102234']) {
    const registeredAt = patients.find((p) => p.patientId === patientId)!.createdAt
    pushBill({ patientId, items: [registrationLine], createdAt: registeredAt, collections: [{ amount: 100, method: 'UPI', at: registeredAt }] })
  }

  // Today's bookings — each paid as it was booked.
  const bookingBill = (booking: Appointment, items: Payment['items'], method: 'UPI' | 'Card') =>
    pushBill({
      patientId: booking.patientId,
      items,
      createdAt: booking.createdAt,
      appointmentId: booking.appointmentId,
      collections: [{ amount: items.reduce((sum, item) => sum + item.amount, 0), method, at: booking.createdAt + MINUTE }],
    })
  if (laxmananBooking) bookingBill(laxmananBooking, [registrationLine, consultationLine(laxmananBooking.providerId)], 'UPI')
  if (priyaBooking) bookingBill(priyaBooking, [consultationLine(priyaBooking.providerId)], 'Card')

  // Inpatients' bills — admission charge + the first day's bed, linked both
  // ways. One part-paid card deposit, one awaiting the insurer, one failed UPI.
  const admissionSeed = createAdmissionSeed(now)
  const billAdmission = (admissionId: string, extra: Pick<SeedBill, 'collections' | 'failed'>) => {
    const admission = admissionSeed.admissions.find((a) => a.admissionId === admissionId)!
    const admittedAt = admission.admittedAt ?? admission.createdAt
    const bill = pushBill({
      patientId: admission.patientId,
      items: admissionBillItems(admission.roomType ?? 'General', 1),
      createdAt: admittedAt,
      admissionId,
      ...extra,
    })
    admission.paymentId = bill.paymentId
  }
  billAdmission('adm-1', { collections: [{ amount: 1000, method: 'Card', at: minutesAgo(590) }] })
  billAdmission('adm-2', {})
  billAdmission('adm-3', { failed: [{ amount: 5000, method: 'UPI', reason: 'Payment not received', at: minutesAgo(45) }] })

  // An open medico-legal case: intimation sent, police acknowledgement awaited.
  const mlcRecords: MlcRecord[] = [
    {
      mlcId: 'MLC/0001',
      patientId: 'SHRI-0120338',
      patientName: 'Sunita Rao',
      category: 'Road traffic accident',
      broughtBy: 'Ambulance',
      policeStation: 'Peelamedu Police Station',
      incidentAt: null,
      registeredAt: minutesAgo(130),
      intimationSent: true,
      acknowledgedAt: null,
    },
  ]
  logAt(minutesAgo(130), 'MLC registered', 'MLC/0001 · Sunita Rao')

  // Profiles the desk opens most often — seeds the search box's "Most opened".
  const patientOpens: AppState['patientOpens'] = {
    'SHRI-0091133': { count: 7, lastOpenedAt: minutesAgo(30) },
    'SHRI-0044120': { count: 5, lastOpenedAt: minutesAgo(120) },
    'SHRI-0078812': { count: 3, lastOpenedAt: minutesAgo(26 * 60) },
  }

  // Rate card for the enquiry/estimate desk. A real deployment reads this
  // from the hospital's tariff master; the rates themselves are never
  // calculated or guessed here.
  const tariffs: Tariff[] = [
    { code: 'CONS-GEN', name: 'General Medicine consultation', department: 'General Medicine', rate: 600 },
    { code: 'CONS-NEU', name: 'Neurology consultation', department: 'Neurology', rate: 800 },
    { code: 'CONS-CAR', name: 'Cardiology consultation', department: 'Cardiology', rate: 900 },
    { code: 'CONS-ORT', name: 'Orthopedics consultation', department: 'Orthopedics', rate: 750 },
    { code: 'INV-ECG', name: 'ECG', department: 'Cardiology', rate: 350 },
    { code: 'INV-ECHO', name: '2D Echocardiogram', department: 'Cardiology', rate: 2400 },
    { code: 'INV-MRI-B', name: 'MRI Brain (plain)', department: 'Neurology', rate: 7500 },
    { code: 'INV-CT-B', name: 'CT Brain (plain)', department: 'Neurology', rate: 3200 },
    { code: 'INV-XR-KNEE', name: 'X-Ray Knee (AP/Lat)', department: 'Orthopedics', rate: 650 },
    { code: 'LAB-CBC', name: 'Complete Blood Count', department: 'General Medicine', rate: 400 },
    { code: 'LAB-HBA1C', name: 'HbA1c', department: 'General Medicine', rate: 550 },
    { code: 'PKG-MASTER-M', name: 'Master Health Checkup (Male)', department: 'General Medicine', rate: 6500 },
  ]

  return {
    today,
    patients,
    providers,
    leaves,
    appointments,
    visits,
    queueTokens,
    guestPasses,
    estimates: [],
    mlcRecords,
    tariffs,
    payments,
    beds: admissionSeed.beds,
    admissions: admissionSeed.admissions,
    registrationLog,
    patientOpens,
    activityLog,
    // Explicitly labelled DEVELOPMENT infrastructure state — there is no real
    // service to connect to, and the UI says so rather than implying one.
    connectivity: { mode: 'development', network: 'online', abha: 'unavailable' },
    tokenCounters,
    nextIds: {
      appointment: appointmentSeq, visit: visitSeq, token: tokenSeq, activity: activitySeq,
      patient: 1, provider: 1, leave: 2, pass: 1, estimate: 1, mlc: mlcRecords.length + 1,
      payment: paymentSeq + 1, transaction: transactionSeq + 1, attempt: attemptSeq,
      ...admissionSeed.nextIds,
    },
  }
}
