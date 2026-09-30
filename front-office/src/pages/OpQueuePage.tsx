import { useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, UserCheck, PhoneCall, Stethoscope, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { getAppointmentsForDate, getQueueView, getOperationalSummary } from '../domain/selectors'
import {
  checkInAppointment,
  recallToken,
  callToken,
  startConsultation,
  completeConsultation,
} from '../domain/actions'
import { formatClock } from '../utils/format'
import type { QueueTokenRow } from '../types/queue'
import type { Tone } from '../utils/tone'
import { cn } from '../utils/cn'
import { appointmentStatusLabel } from '../utils/appointment'

interface OpQueueLocationState {
  justCreatedToken?: string
}

// S-05-03 Consultations board (route kept at /op-queue) as a grouped list rather than a
// drag-and-drop kanban (the source's own actions are all row actions, and
// "drag is never the only path to a state change").
//
// Waiting/called/consulting durations are genuinely `now - timestamp`,
// recomputed on a 5s tick — no stored "18 min" strings anywhere.
export function OpQueuePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const now = useNow(5000)
  const { notify } = useToast()

  const appointments = useStoreValue(getAppointmentsForDate)
  const queue = useStoreValue(getQueueView, now)
  const summary = useStoreValue(getOperationalSummary, now)
  const [error, setError] = useState<string | null>(null)
  const locationState = location.state as OpQueueLocationState | null
  const [justCreatedToken] = useState(locationState?.justCreatedToken ?? null)

  const awaitingCheckIn = appointments.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Payment Pending' || a.status === 'Confirmed',
  )

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

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle={`${summary.waitingPatients} awaiting doctor · updated ${formatClock(now)}`}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/appointments')}>
            Today&apos;s appointments
          </Button>
        }
      />

      <div className="flex flex-col gap-5 px-6 py-6 lg:px-8">
        {justCreatedToken ? (
          <Alert tone="stable">
            Visit <strong>{justCreatedToken}</strong> was opened and is now awaiting the doctor below.
          </Alert>
        ) : null}
        {error ? <Alert tone="warning">{error}</Alert> : null}

        <Card>
          <CardHeader
            icon={Clock}
            iconTone="warning"
            title="Appointments Today"
            subtitle="Booked or confirmed for today, visit not yet started"
          />
          {awaitingCheckIn.length === 0 ? (
            <EmptyState
              title="Every appointment today has a visit started"
              description="Newly booked or confirmed appointments appear here until their visit is started."
            />
          ) : (
            <div className="divide-y divide-border-soft">
              {awaitingCheckIn.map((appointment) => (
                <div
                  key={appointment.appointmentId}
                  className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{appointment.patient?.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {appointment.slot} · {appointment.provider?.name} · {appointment.department}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={appointment.status}>{appointmentStatusLabel(appointment.status)}</Badge>
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          checkInAppointment,
                          appointment.appointmentId,
                          'Visit started',
                          `${appointment.patient?.name} · visit opened`,
                        )
                      }
                    >
                      Start Visit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <QueueSection
          icon={UserCheck}
          iconTone="warning"
          title="Awaiting Doctor"
          subtitle="Visit started, awaiting the doctor"
          tokens={queue.waiting}
          durationLabel={(token) =>
            `awaiting doctor ${token.waitingMinutes} min`
          }
          renderActions={(token) => (
            <Button
              size="sm"
              onClick={() => run(callToken, token.tokenId, 'Patient called in', `${token.tokenNumber} · ${token.patient?.name}`)}
            >
              Call
            </Button>
          )}
        />

        <QueueSection
          icon={PhoneCall}
          iconTone="info"
          title="Called In"
          subtitle="Called in — patient to present at the doctor's room"
          tokens={queue.called}
          durationLabel={(token) => `called ${token.calledMinutes} min ago`}
          renderActions={(token) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  run(
                    recallToken,
                    token.tokenId,
                    token.recalled ? 'Marked as did not attend' : 'Patient called again',
                    token.tokenNumber,
                  )
                }
              >
                {token.recalled ? 'Mark did not attend' : 'Call again'}
              </Button>
              <Button
                size="sm"
                onClick={() => run(startConsultation, token.tokenId, 'Consultation started', token.tokenNumber)}
              >
                Start consultation
              </Button>
            </>
          )}
        />

        <QueueSection
          icon={Stethoscope}
          iconTone="stable"
          title="With Patient"
          subtitle="Consultation in progress"
          tokens={queue.inConsultation}
          durationLabel={(token) => `${token.consultingMinutes} min in room`}
          renderActions={(token) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => run(completeConsultation, token.tokenId, 'Consultation completed', token.tokenNumber)}
            >
              Complete
            </Button>
          )}
        />

        <QueueSection icon={CheckCircle2} iconTone="stable" title="Closed today" subtitle="Consultation completed or patient did not attend" tokens={queue.closed} compact />
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
        action={<span className="text-xs tabular-nums text-ink-faint">{tokens.length}</span>}
      />
      {tokens.length === 0 ? (
        <EmptyState title="Nothing here right now" description="This section updates as consultations progress." />
      ) : (
        <div className="divide-y divide-border-soft">
          {tokens.map((token) => (
            <div
              key={token.tokenId}
              className={cnRow(compact)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-lg bg-surface-muted px-2 py-1 text-xs font-semibold tabular-nums text-ink">
                  {token.tokenNumber}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{token.patient?.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {token.provider?.name ?? '—'}
                    {token.appointment ? ` · booked ${token.appointment.slot}` : ' · walk-in'}
                    {` · visit started ${formatClock(token.createdAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {durationLabel ? (
                  <span className="text-xs tabular-nums text-ink-muted">{durationLabel(token)}</span>
                ) : null}
                <Badge status={token.status}>{tokenStatusLabel(token.status)}</Badge>
                {renderActions?.(token)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function tokenStatusLabel(status: QueueTokenRow['status']): string {
  const labels: Record<QueueTokenRow['status'], string> = {
    Waiting: 'Awaiting Doctor',
    Called: 'Called In',
    'In consultation': 'With Patient',
    Completed: 'Consultation Completed',
    'No-show': 'Patient Did Not Attend',
  }
  return labels[status]
}

function cnRow(compact?: boolean): string {
  return cn(
    'flex flex-col gap-2 px-5 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between',
    compact ? 'py-2.5' : 'py-3',
  )
}
