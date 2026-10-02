import type { Patient } from './patient'
import type { Provider } from './doctor'
import type { Visit } from './visit'
import type { QueueToken } from './queue'

// 'Payment Pending' is what a fresh booking gets now that appointment
// booking always creates a bill in the same step (see
// actions.bookAppointment) — the slot is reserved immediately, but the
// appointment only becomes 'Confirmed' once its linked bill is fully paid
// (actions.collectPayment). 'Scheduled' is kept for pre-existing records
// created before this integration.
export type AppointmentStatus =
  | 'Scheduled'
  | 'Payment Pending'
  | 'Confirmed'
  | 'Checked-in'
  | 'Completed'
  | 'Cancelled'
  | 'No-show'

export interface Appointment {
  appointmentId: string
  patientId: string
  providerId: string
  department: string
  date: string
  slot: string
  status: AppointmentStatus
  visitId: string | null
  /** Optional free-text note from the front desk — never a clinical field. */
  reason: string | null
  createdAt: number
}

export interface AppointmentWithSlot extends Appointment {
  slotTimestamp: number
}

/** domain/selectors.getAppointmentsForDate's enriched row. */
export interface AppointmentRow extends AppointmentWithSlot {
  patient: Patient | null
  provider: Provider | null
  visit: Visit | null
  token: QueueToken | null
}

/** domain/selectors.getAppointmentsForPatient's enriched row. */
export interface PatientAppointmentRow extends AppointmentWithSlot {
  provider: Provider | null
}

/** actions.bookAppointment's input shape. */
export interface BookAppointmentInput {
  patientId: string
  providerId: string
  department: string
  slot: string
  date?: string
  reason?: string
}

export type SlotStatus = 'available' | 'booked' | 'past' | 'break'

/** domain/selectors.getSlotBoard's per-slot entry — every slot is shown,
 *  never hidden, so a booked slot is information, not something to filter out. */
export interface SlotBoardEntry {
  slot: string
  timestamp: number
  status: SlotStatus
  appointment: Appointment | null
}
