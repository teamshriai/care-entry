import type { AppointmentStatus } from '../types/appointment'
import type { DoctorStatus } from '../types/doctor'

/**
 * What an appointment's status reads as on screen. Kept separate from the
 * generic Badge/tone mapping because the same words ('Completed',
 * 'Cancelled', 'No-show') also belong to queue tokens, payments and
 * admissions.
 *
 * 'Scheduled' is a pre-existing-record status: booking now always raises a
 * bill in the same step, so it reads the same as 'Payment Pending'.
 */
const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  Scheduled: 'Pending payment',
  'Payment Pending': 'Pending payment',
  Confirmed: 'Confirmed',
  'Checked-in': 'Checked in',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  'No-show': 'No-show',
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABEL[status]
}

/** Front Office wording for a doctor's derived status — display only, the
 *  underlying DoctorStatus (and its logic in domain/selectors.ts) is unchanged. */
export function doctorStatusLabel(status: DoctorStatus): string {
  return status === 'In consultation' ? 'With patient' : status
}
