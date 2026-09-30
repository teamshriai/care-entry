import { useLocation, useNavigate } from 'react-router-dom'
import { ScheduleAppointmentModal } from '../components/appointment/ScheduleAppointmentModal'

interface ScheduleLocationState {
  providerId?: string
  date?: string
  slot?: string
  /** Set by the patient-first entry points (Find Patient, Patient Profile),
   *  where the patient is already chosen. Kept for clarity at the call
   *  sites — the dialog itself infers what to pre-fill from providerId. */
  source?: 'find-patient'
}

/**
 * Route host for the booking dialog. Booking used to happen on a page of its
 * own — a month calendar, a doctor list with View Slots, and a slot grid —
 * with this dialog on top of it. All of that selection now lives inside the
 * dialog, so this route exists only to open it for the many links across the
 * portal that point here; closing returns to wherever the user came from.
 */
export function ScheduleAppointmentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ScheduleLocationState | null

  function leave() {
    // 'default' means this was the first entry in the history stack (a
    // bookmark or a fresh tab), where going back would leave the app.
    if (location.key === 'default') navigate('/front-office')
    else navigate(-1)
  }

  return (
    <ScheduleAppointmentModal
      open
      providerId={state?.providerId ?? null}
      slot={state?.slot ?? null}
      date={state?.date}
      onClose={leave}
      onDone={leave}
    />
  )
}
