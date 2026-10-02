import { useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { BedDouble, CheckCircle2, Clock, DoorOpen, LogIn, PhoneCall, UserCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { useFlow } from '../flows/useFlow'
import { getAppointmentsForDate, getQueueView } from '../domain/selectors'
import { checkInAppointment, recallToken, callToken, startConsultation, completeConsultation } from '../domain/actions'
import { formatClock } from '../utils/format'
import type { QueueTokenRow } from '../types/queue'
import type { Tone } from '../utils/tone'
import { cn } from '../utils/cn'

// The outpatient queue, grouped by where each patient is: to check in,
// waiting, called, in the doctor's room, done. Durations are genuinely
// `now - timestamp`, recomputed on a 5 s tick.
//
// Call / In room / Complete are the doctor's room's steps — they live here
// because the board has to show them; the desk's own step is Check in.
export function OpQueuePage() {
  const now = useNow(5000)
  const { notify } = useToast()
  const { openFlow } = useFlow()

  const appointments = useStoreValue(getAppointmentsForDate)
  const queue = useStoreValue(getQueueView, now)
  const [error, setError] = useState<string | null>(null)

  // Only paid bookings join the queue — there is no pay-later.
  const toCheckIn = appointments.filter((a) => a.status === 'Confirmed')

  function run<T>(fn: (arg: T) => void, arg: T, message: string, detail?: string) {
    setError(null)
    try {
      fn(arg)
      notify(message, { detail })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(errMessage)
      notify('Action failed', { tone: 'error', detail: errMessage })
    }
  }

  // Admission is usually advised in the doctor's room — admit straight from the row.
  const admitAction = (token: QueueTokenRow) => (
    <Button size="sm" variant="secondary" onClick={() => openFlow('admit', { uhid: token.patientId })}>
      <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
      Admit
    </Button>
  )

  return (
    <div>
      <PageHeader title="Queue" subtitle={`${queue.waiting.length} waiting · updated ${formatClock(now)}`} />

      <div className="flex flex-col gap-5 px-6 py-6 lg:px-8">
        {error ? <Alert tone="warning">{error}</Alert> : null}

        <Card>
          <CardHeader icon={Clock} iconTone="warning" title="To check in" subtitle="Paid bookings for today, not yet arrived" />
          {toCheckIn.length === 0 ? (
            <EmptyState title="Everyone booked for today has checked in" description="Today’s paid bookings appear here until the patient arrives." />
          ) : (
            <div className="divide-y divide-border-soft">
              {toCheckIn.map((appointment) => (
                <div
                  key={appointment.appointmentId}
                  className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{appointment.patient?.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {appointment.slot} · {appointment.provider?.name} · {appointment.department}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => run(checkInAppointment, appointment.appointmentId, 'Checked in', appointment.patient?.name)}
                  >
                    <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Check in
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <QueueSection
          icon={UserCheck}
          iconTone="info"
          title="Waiting"
          subtitle="Checked in, waiting for the doctor"
          tokens={queue.waiting}
          durationLabel={(token) => `waiting ${token.waitingMinutes} min`}
          renderActions={(token) => (
            <Button size="sm" onClick={() => run(callToken, token.tokenId, 'Patient called', `${token.tokenNumber} · ${token.patient?.name}`)}>
              <PhoneCall className="h-3.5 w-3.5" strokeWidth={1.75} />
              Call
            </Button>
          )}
        />

        <QueueSection
          icon={PhoneCall}
          iconTone="info"
          title="Called"
          subtitle="Called — on the way to the doctor's room"
          tokens={queue.called}
          durationLabel={(token) => `called ${token.calledMinutes} min ago`}
          renderActions={(token) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => run(recallToken, token.tokenId, token.recalled ? 'Marked as no-show' : 'Called again', token.tokenNumber)}
              >
                {token.recalled ? 'Mark no-show' : 'Call again'}
              </Button>
              <Button size="sm" onClick={() => run(startConsultation, token.tokenId, 'In room', token.tokenNumber)}>
                <DoorOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                In room
              </Button>
            </>
          )}
        />

        <QueueSection
          icon={DoorOpen}
          iconTone="info"
          title="In room"
          subtitle="With the doctor now"
          tokens={queue.inConsultation}
          durationLabel={(token) => `${token.consultingMinutes} min in room`}
          renderActions={(token) => (
            <>
              {admitAction(token)}
              <Button size="sm" onClick={() => run(completeConsultation, token.tokenId, 'Encounter completed', token.tokenNumber)}>
                Complete
              </Button>
            </>
          )}
        />

        <QueueSection
          icon={CheckCircle2}
          iconTone="neutral"
          title="Done today"
          subtitle="Encounter completed, or the patient did not attend"
          tokens={queue.closed}
          compact
          renderActions={(token) => (token.status === 'Completed' ? admitAction(token) : null)}
        />
      </div>
    </div>
  )
}

function QueueSection({
  icon,
  iconTone,
  title,
  subtitle,
  tokens,
  renderActions,
  durationLabel,
  compact,
}: {
  icon: ElementType
  iconTone?: Tone
  title: string
  subtitle: string
  tokens: QueueTokenRow[]
  renderActions?: (token: QueueTokenRow) => ReactNode
  durationLabel?: (token: QueueTokenRow) => string
  compact?: boolean
}) {
  return (
    <Card>
      <CardHeader
        icon={icon}
        iconTone={iconTone}
        title={title}
        subtitle={subtitle}
        action={<span className="text-xs tabular-nums text-ink-subtle">{tokens.length}</span>}
      />
      {tokens.length === 0 ? (
        <EmptyState title="Nobody here right now" description="This updates as patients move through the queue." />
      ) : (
        <div className="divide-y divide-border-soft">
          {tokens.map((token) => (
            <div
              key={token.tokenId}
              className={cn(
                'flex flex-col gap-2 px-5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between',
                compact ? 'py-2.5' : 'py-3',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold tabular-nums text-ink">{token.tokenNumber}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{token.patient?.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {token.provider?.name ?? '—'}
                    {token.appointment ? ` · booked ${token.appointment.slot}` : ' · walk-in'}
                    {` · checked in ${formatClock(token.createdAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {durationLabel ? <span className="text-xs tabular-nums text-ink-muted">{durationLabel(token)}</span> : null}
                <Badge status={token.status}>{TOKEN_LABEL[token.status]}</Badge>
                {renderActions?.(token)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

const TOKEN_LABEL: Record<QueueTokenRow['status'], string> = {
  Waiting: 'Waiting',
  Called: 'Called',
  'In consultation': 'In room',
  Completed: 'Completed',
  'No-show': 'No-show',
}
