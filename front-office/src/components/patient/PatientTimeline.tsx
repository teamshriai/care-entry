import type { ElementType } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarClock, FileWarning, IdCard, IndianRupee, LogIn, LogOut, Stethoscope, Ticket, UserPlus, XCircle } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { BILL_STATUS_TONE } from '../../utils/billing'
import { appointmentStatusLabel } from '../../utils/appointment'
import { relativeDayLabel, formatDateKey } from '../../utils/dates'
import { formatClock } from '../../utils/format'
import { todayKey } from '../../domain/time'
import type { PatientTimeline as Timeline, TimelineKind, UpcomingItem } from '../../domain/patientSelectors'
import type { BillDisplayStatus } from '../../types/payment'

const KIND_ICON: Record<TimelineKind, ElementType> = {
  registered: UserPlus,
  encounter: Stethoscope,
  'walk-in': Ticket,
  bill: IndianRupee,
  admitted: BedDouble,
  discharged: LogOut,
  'admission-cancelled': XCircle,
  mlc: FileWarning,
  'guest-pass': IdCard,
}

/**
 * The patient's story on one card: what is coming up today and after (with
 * the one thing to do for each), then everything that has happened —
 * encounters, bills, admissions, medico-legal cases, guest passes.
 */
export function PatientTimeline({
  timeline,
  today,
  onCheckIn,
  onCollect,
}: {
  timeline: Timeline
  today: string
  onCheckIn: (appointmentId: string) => void
  onCollect: (paymentId: string) => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader icon={CalendarClock} iconTone="info" title="Timeline" subtitle="Encounters, bills and admissions — newest first" />

      <section aria-label="Today and upcoming" className="border-t border-border-soft">
        <h3 className="px-5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">Today &amp; upcoming</h3>
        {timeline.upcoming.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-ink-muted">Nothing booked. Schedule or Start Consultation adds an encounter.</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {timeline.upcoming.map((item) => (
              <UpcomingRow key={item.id} item={item} today={today} onCheckIn={onCheckIn} onCollect={onCollect} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="History" className="border-t border-border-soft">
        <h3 className="px-5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">History</h3>
        {timeline.history.length === 0 ? (
          <EmptyState title="Nothing yet" />
        ) : (
          <ol className="divide-y divide-border-soft">
            {timeline.history.map((event) => {
              const Icon = KIND_ICON[event.kind]
              const status = event.status
              const badge =
                status === undefined ? null : event.kind === 'bill' ? (
                  <Badge tone={BILL_STATUS_TONE[status as BillDisplayStatus]}>{status}</Badge>
                ) : (
                  <Badge tone={event.kind === 'mlc' && status === 'Open' ? 'critical' : undefined} status={status}>
                    {status}
                  </Badge>
                )
              return (
                <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                    <Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {event.paymentId ? (
                      <Link to={`/payments/${event.paymentId}`} className="block truncate text-sm font-medium text-ink hover:text-primary-text">
                        {event.title}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">{event.title}</p>
                    )}
                    <p className="truncate text-xs text-ink-muted">{event.detail}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {badge}
                    <time className="text-2xs tabular-nums text-ink-subtle" dateTime={new Date(event.at).toISOString()}>
                      {formatDateKey(todayKey(new Date(event.at)))} · {formatClock(event.at)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </Card>
  )
}

function UpcomingRow({
  item,
  today,
  onCheckIn,
  onCollect,
}: {
  item: UpcomingItem
  today: string
  onCheckIn: (appointmentId: string) => void
  onCollect: (paymentId: string) => void
}) {
  if (item.kind === 'walk-in') {
    return (
      <li className="flex items-center gap-3 px-5 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info-bg">
          <Ticket className="h-4 w-4 text-info" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {item.token.tokenNumber} · {item.provider?.name ?? 'Doctor'}
          </p>
          <p className="truncate text-xs text-ink-muted">Walk-in today · {item.provider?.room ?? item.provider?.department ?? ''}</p>
        </div>
        <Badge status={item.token.status}>{item.token.status === 'In consultation' ? 'In room' : item.token.status}</Badge>
      </li>
    )
  }

  const { appointment, bill } = item
  const isToday = appointment.date === today
  const unpaid = (appointment.status === 'Payment Pending' || appointment.status === 'Scheduled') && bill && bill.balance > 0
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info-bg">
        <Stethoscope className="h-4 w-4 text-info" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {relativeDayLabel(appointment.date, today)} · {appointment.slot} · {appointment.provider?.name ?? 'Doctor'}
        </p>
        <p className="truncate text-xs text-ink-muted">
          Outpatient encounter · {appointment.department}
          {appointment.provider?.room ? ` · ${appointment.provider.room}` : ''}
        </p>
      </div>
      <Badge status={appointment.status}>{appointmentStatusLabel(appointment.status)}</Badge>
      {unpaid && bill ? (
        <Button size="sm" onClick={() => onCollect(bill.paymentId)}>
          <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
          Collect
        </Button>
      ) : isToday && appointment.status === 'Confirmed' ? (
        <Button size="sm" onClick={() => onCheckIn(appointment.appointmentId)}>
          <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
          Check in
        </Button>
      ) : null}
    </li>
  )
}
