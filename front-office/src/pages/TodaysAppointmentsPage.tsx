import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { AppointmentIllustration } from '../components/ui/illustrations/AppointmentIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { getAppointmentsForDate } from '../domain/selectors'
import { formatClock } from '../utils/format'

// This view has exactly one job: show today's appointments and their
// status. There is no queue/check-in step and no per-row action here —
// the walk-in workflow is Schedule Appointment → Generate Bill → paid at
// the Billing Counter → Confirmed → Completed, and the status badge (see
// utils/tone.labelFor) already communicates where each appointment is in
// that lifecycle.
export function TodaysAppointmentsPage() {
  const navigate = useNavigate()
  const now = useNow(30000)

  const todays = useStoreValue(getAppointmentsForDate)

  return (
    <div>
      <PageHeader
        title="Today's Appointments"
        subtitle={`Updated ${formatClock(now)} · every appointment booked for today`}
        illustration={<AppointmentIllustration className="h-8 w-8" />}
        illustrationTone="info"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/appointments/new')}>
            Schedule appointment
          </Button>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          <AppointmentsTable
            appointments={todays}
            compact
            emptyAction={
              <Button size="sm" onClick={() => navigate('/appointments/new')}>
                Schedule an appointment
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  )
}
