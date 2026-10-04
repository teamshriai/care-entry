import type { ReactNode } from 'react'
import { Video } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { AppointmentIllustration } from '../ui/illustrations/AppointmentIllustration'
import { PatientStatusIcons } from '../patient/PatientStatusIcons'
import { usePatientCareStatus } from '../../hooks/useCareStatus'
import { appointmentStatusLabel } from '../../utils/appointment'
import { relativeDayLabel } from '../../utils/dates'
import type { OutpatientRow } from '../../domain/outpatientSelectors'
import type { Tone } from '../../utils/tone'

/** What the row's status reads as, and the time beside it. */
function statusOf(row: OutpatientRow): { label: string; tone: Tone; note: string | null } {
  const tele = row.mode === 'Teleconsult'
  const token = row.token
  switch (row.stage) {
    case 'upcoming':
      return { label: appointmentStatusLabel(row.appointment!.status), tone: 'info', note: null }
    case 'to-check-in':
      if (row.appointment && row.appointment.status !== 'Confirmed') return { label: 'Payment pending', tone: 'warning', note: null }
      return {
        label: tele ? 'To join' : 'To check in',
        tone: row.lateMinutes ? 'warning' : 'neutral',
        note: row.lateMinutes ? `${row.lateMinutes} min late` : null,
      }
    case 'waiting':
      return {
        label: 'Waiting for consultation',
        tone: 'info',
        note: token?.waitingMinutes != null ? `${token.waitingMinutes} min${token.position ? ` · ${ordinal(token.position)} in line` : ''}` : null,
      }
    case 'called':
      return { label: 'Called', tone: 'info', note: token?.calledMinutes != null ? `${token.calledMinutes} min ago` : null }
    case 'in-room':
      return { label: tele ? 'On call' : 'In room', tone: 'stable', note: token?.consultingMinutes != null ? `${token.consultingMinutes} min` : null }
    case 'done': {
      const word = token?.status === 'No-show' ? 'No-show' : token ? 'Completed' : row.appointment ? appointmentStatusLabel(row.appointment.status) : 'Completed'
      return { label: word, tone: word === 'Completed' ? 'stable' : word === 'Cancelled' || word === 'No-show' ? 'neutral' : 'info', note: null }
    }
  }
}

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'
  return `${n}${suffix}`
}

/**
 * Outpatients, one row each — booked time or walk-in token, the patient,
 * the doctor and where (room, or video for a teleconsult), the stage, and
 * that stage's actions. Rows wrap on a phone rather than scroll sideways.
 */
export function OutpatientList({
  rows,
  today,
  onOpenPatient,
  renderActions,
  emptyTitle,
  emptyDescription,
}: {
  rows: OutpatientRow[]
  today: string
  onOpenPatient: (patientId: string) => void
  renderActions: (row: OutpatientRow) => ReactNode
  emptyTitle: string
  emptyDescription: string
}) {
  const care = usePatientCareStatus()
  if (rows.length === 0) {
    return <EmptyState illustration={<AppointmentIllustration className="h-11 w-11" />} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <ul className="divide-y divide-border-soft">
      {rows.map((row) => {
        const status = statusOf(row)
        const tele = row.mode === 'Teleconsult'
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5">
            <div className="w-24 shrink-0">
              <p className="text-sm font-semibold tabular-nums text-ink">{row.time}</p>
              <p className="truncate text-2xs tabular-nums text-ink-subtle">
                {row.stage === 'upcoming'
                  ? relativeDayLabel(row.date, today)
                  : row.kind === 'walk-in'
                    ? `Walk-in · ${row.token?.tokenNumber ?? ''}`
                    : (row.token?.tokenNumber ?? 'Booked')}
              </p>
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <p className="flex min-w-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => row.patient && onOpenPatient(row.patient.patientId)}
                  className="truncate rounded-sm text-left text-sm font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  {row.patient?.name ?? '—'}
                </button>
                <PatientStatusIcons status={row.patient ? care[row.patient.patientId] : undefined} />
              </p>
              <p className="truncate text-xs text-ink-muted">
                {row.provider?.name ?? '—'} ·{' '}
                {tele ? (
                  <span className="font-medium text-purple">
                    <Video className="-mt-0.5 inline h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" /> Teleconsult
                  </span>
                ) : (
                  (row.provider?.room ?? 'In person')
                )}{' '}
                · {row.patient?.uhid}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-0.5">
              <Badge tone={status.tone}>{status.label}</Badge>
              {status.note ? (
                <span className={row.lateMinutes ? 'text-2xs font-medium text-warning' : 'text-2xs tabular-nums text-ink-muted'}>{status.note}</span>
              ) : null}
            </div>
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{renderActions(row)}</div>
          </li>
        )
      })}
    </ul>
  )
}
