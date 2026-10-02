import { CalendarPlus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { AppointmentIllustration } from '../components/ui/illustrations/AppointmentIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useFlow } from '../flows/useFlow'
import { getAppointmentsForDate } from '../domain/selectors'
import { formatClock } from '../utils/format'

/** Every appointment booked for today. */
export function TodaysAppointmentsPage() {
  const { openFlow } = useFlow()
  const now = useNow(30000)

  const todays = useStoreValue(getAppointmentsForDate)

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle={`Updated ${formatClock(now)} · every appointment booked for today`}
        illustration={<AppointmentIllustration className="h-8 w-8" />}
        illustrationTone="info"
        actions={
          <Button size="sm" onClick={() => openFlow('schedule')}>
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Schedule
          </Button>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          <AppointmentsTable appointments={todays} compact />
        </Card>
      </div>
    </div>
  )
}
