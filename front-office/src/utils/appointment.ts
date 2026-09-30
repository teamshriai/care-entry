import type { AppointmentStatus } from '../types/appointment'
import type { DoctorStatus } from '../types/doctor'

/**
 * Front Office appointment statuses, spelled out so front-desk staff are
 * never left guessing what a one-word badge refers to — "Completed" alone
 * doesn't say completed *what*, and "No-show" isn't immediately clear to
 * every user. This is kept separate from the shared, generic Badge/tone
 * system (which just reads a status string back verbatim) because these
 * exact words — 'Completed', 'Cancelled', 'No-show' — are also used, with
 * a different meaning, by queue tokens, payments, estimates and
 * admissions. Applying a blanket relabel there would be wrong for all of
 * those; this only ever applies to an Appointment's own status.
 *
 * 'Scheduled' is a pre-existing-record status with no modern equivalent
 * step (booking now always raises a bill in the same action as part of
 * the walk-in workflow), so it reads as 'Payment Pending' — the closest
 * true state. 'Checked-in' reads as 'Appointment Confirmed': the
 * distinction between "confirmed" and "arrived" only matters to the
 * separate OP Queue/token board, which reads the raw status itself.
 */
const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  Scheduled: 'Payment Pending',
  'Payment Pending': 'Payment Pending',
  Confirmed: 'Appointment Confirmed',
  'Checked-in': 'Appointment Confirmed',
  Completed: 'Consultation Completed',
  Cancelled: 'Appointment Cancelled',
  'No-show': 'Patient Did Not Attend',
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABEL[status]
}

/** Front Office wording for a doctor's derived status — display only, the
 *  underlying DoctorStatus (and its logic in domain/selectors.ts) is unchanged. */
export function doctorStatusLabel(status: DoctorStatus): string {
  return status === 'In consultation' ? 'With Patient' : status
}
