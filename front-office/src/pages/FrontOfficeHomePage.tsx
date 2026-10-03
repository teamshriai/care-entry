import type { ElementType } from 'react'
import {
  AlertTriangle,
  BedDouble,
  CalendarClock,
  CircleAlert,
  CircleDot,
  IndianRupee,
  Info,
  Stethoscope,
  Undo2,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { StatCard } from '../components/frontoffice/StatCard'
import { DoctorAvailabilityTable } from '../components/clinician/DoctorAvailabilityTable'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { useFlow } from '../flows/useFlow'
import { getAppointmentsForDate, getBillingOverview, getDoctorRows, getNeedsAttention, getQueueView } from '../domain/selectors'
import { getOutpatients } from '../domain/outpatientSelectors'
import { getPatientRows } from '../domain/patientSelectors'
import { todayKey } from '../domain/time'
import type { NeedsAttentionItem } from '../domain/selectors'
import { getInpatientRows, getWardSummaries } from '../domain/admissionSelectors'
import { returnGuestPass } from '../domain/actions'
import { CheckInToggle } from '../components/appointment/CheckInToggle'
import { formatRupees } from '../utils/billing'
import { appointmentStatusLabel } from '../utils/appointment'
import { formatHeaderDateTime } from '../utils/format'
import { cn } from '../utils/cn'
import { TONE_STYLES } from '../utils/tone'

const ATTENTION_ICON: Record<NeedsAttentionItem['tone'], ElementType> = {
  critical: CircleAlert,
  warning: AlertTriangle,
  info: Info,
  neutral: CircleDot,
}

const ATTENTION_ROWS = 6

/**
 * The front desk at a glance: five figures that each open the place that
 * holds them, the doctors now (with Schedule beside each), then today's
 * outpatients and what needs attention, with their one action each.
 */
export function FrontOfficeHomePage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { openFlow } = useFlow()
  // 15 s tick: minute-level context. The clock only re-derives; nothing here
  // changes on a timer.
  const now = useNow(15000)

  const appointments = useStoreValue(getAppointmentsForDate)
  const queue = useStoreValue(getQueueView, now)
  const billing = useStoreValue(getBillingOverview)
  const inpatients = useStoreValue(getInpatientRows, now)
  const wards = useStoreValue(getWardSummaries)
  const doctorRows = useStoreValue(getDoctorRows, now)
  const needsAttention = useStoreValue(getNeedsAttention, now)
  const outpatients = useStoreValue(getOutpatients, now, 'today', false, '')
  const patientRows = useStoreValue(getPatientRows)
  const today = todayKey(new Date(now))
  const registeredToday = patientRows.filter((row) => todayKey(new Date(row.patient.createdAt)) === today).length

  const booked = appointments.filter((a) => a.status !== 'Cancelled')
  const toCheckIn = appointments.filter((a) => a.status === 'Confirmed')
  const longestWait = Math.max(0, ...queue.waiting.map((t) => t.waitingMinutes ?? 0))
  const bedsFree = wards.reduce((sum, w) => sum + w.available, 0)
  const critical = inpatients.filter((r) => r.admission.wardLabel === 'ICU' || r.admission.wardLabel === 'Emergency').length
  // Display order only: what is still to happen first (stable sort keeps time order).
  const isClosed = (status: string) => status === 'Completed' || status === 'Cancelled' || status === 'No-show'
  const todaysList = [...appointments].sort((a, b) => Number(isClosed(a.status)) - Number(isClosed(b.status)))

  function act(run: () => void, done: string, detail?: string) {
    try {
      run()
      notify(done, { detail })
    } catch (err) {
      notify('Could not do that', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  function attentionAction(item: NeedsAttentionItem) {
    const action = item.action
    if (!action) return null
    switch (action.kind) {
      case 'collect':
        return (
          <Button size="sm" onClick={() => openFlow('billing', { uhid: action.patientId, bill: action.paymentId })}>
            <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
            Collect
          </Button>
        )
      case 'admit':
        return (
          <Button size="sm" onClick={() => openFlow('admit', { uhid: action.patientId })}>
            <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
            Admit
          </Button>
        )
      case 'return-pass':
        return (
          <Button size="sm" variant="secondary" onClick={() => act(() => returnGuestPass(action.passId), 'Pass returned', action.passId)}>
            <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Return
          </Button>
        )
      case 'open':
        return (
          <Button size="sm" variant="ghost" onClick={() => navigate(action.to)}>
            {action.label}
          </Button>
        )
    }
  }

  return (
    <div>
      <PageHeader title="SHRI Health Care Entry" subtitle={`${formatHeaderDateTime(new Date(now))} · every figure is derived from today's records`} />

      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        {/* Five figures, one purpose each — each card opens the place that holds it. */}
        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard
            hue="blue"
            icon={CalendarClock}
            value={outpatients.counts.today}
            label="Outpatients today"
            hint={`${outpatients.counts['check-in']} to check in`}
            to="/patients/outpatients"
            title="Show everyone booked for today"
          />
          <StatCard
            hue="orange"
            icon={UserCheck}
            value={queue.waiting.length}
            label="Waiting"
            hint={queue.waiting.length ? `Longest ${longestWait} min` : 'Nobody waiting'}
            to="/patients/outpatients?filter=waiting"
            title="Show who is waiting for a doctor"
          />
          <StatCard
            hue="purple"
            icon={BedDouble}
            value={inpatients.length}
            label="Inpatients"
            hint={`${critical} in ICU/ER · ${bedsFree} beds free`}
            to="/patients/inpatients"
            title="Show who is admitted, and the beds"
          />
          <StatCard
            hue="red"
            icon={IndianRupee}
            value={formatRupees(billing.dueAmount)}
            label="Due"
            hint={`${billing.dueCount} bills${billing.failedCount ? ` · ${billing.failedCount} failed` : ''}`}
            to="/billing?filter=due"
            title="Show the bills still to collect"
          />
          <StatCard
            hue="teal"
            icon={UserPlus}
            value={registeredToday}
            label="Registered today"
            hint="New patient records"
            to="/patients?filter=today"
            title="Show the patients registered today"
          />
        </section>

        {/* Doctors now — Book opens Schedule with the doctor chosen */}
        <section className="min-w-0" aria-label="Doctors now">
          <Card accentTone="indigo">
            <CardHeader
              icon={Stethoscope}
              iconTone="indigo"
              title="Doctors now"
              subtitle="From today's schedule, leave and break · Schedule books with that doctor"
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/doctors')}>
                  View all
                </Button>
              }
            />
            <DoctorAvailabilityTable
              rows={doctorRows}
              compact
              onOpenProfile={(provider) => navigate(`/doctors/${provider.providerId}`)}
              onBook={(provider) => openFlow('schedule', { doctor: provider.providerId })}
            />
          </Card>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 min-[1400px]:grid-cols-2">
          {/* Today's outpatients — one action per row */}
          <section className="min-w-0" aria-label="Today's outpatients">
            <Card accentTone="info">
              <CardHeader
                icon={CalendarClock}
                iconTone="info"
                title="Today's outpatients"
                subtitle={`${booked.length} booked · ${toCheckIn.length} to check in`}
                action={
                  <Button size="sm" variant="ghost" onClick={() => navigate('/patients/outpatients')}>
                    View all
                  </Button>
                }
              />
              {/* A booking still to arrive shows its one action where its status would be. */}
              <AppointmentsTable
                appointments={todaysList}
                compact
                maxRows={5}
                // Not here yet → Check in; checked in → Waiting (a second click
                // undoes a mistaken check-in); called or in the room → With
                // doctor; then how the visit ended.
                renderStatus={(appointment) =>
                  appointment.status === 'Confirmed' || (appointment.status === 'Checked-in' && appointment.token?.status === 'Waiting') ? (
                    <CheckInToggle appointment={appointment} patientName={appointment.patient?.name} pressedLabel="Waiting" />
                  ) : appointment.status === 'Checked-in' && (appointment.token?.status === 'Called' || appointment.token?.status === 'In consultation') ? (
                    <Badge tone="teal" className="px-2">
                      With doctor
                    </Badge>
                  ) : (
                    <Badge status={appointment.token?.status === 'No-show' ? 'No-show' : appointment.status} className="px-2">
                      {appointment.token?.status === 'No-show' ? 'No-show' : appointmentStatusLabel(appointment.status)}
                    </Badge>
                  )
                }
              />
            </Card>
          </section>

          {/* Needs attention — most urgent first, one action each */}
          <section className="min-w-0" aria-label="Needs attention">
            <Card accentTone="warning">
              <CardHeader icon={AlertTriangle} iconTone="warning" title="Needs attention" subtitle={`${needsAttention.length} open`} />
              {needsAttention.length === 0 ? (
                <EmptyState title="Nothing needs attention" description="Outstanding front-desk tasks appear here." />
              ) : (
                <div className="divide-y divide-border-soft">
                  {needsAttention.slice(0, ATTENTION_ROWS).map((item) => {
                    const styles = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral
                    const Icon = ATTENTION_ICON[item.tone]
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', styles.bg)}>
                          <Icon className={cn('h-3.5 w-3.5', styles.text)} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">{item.title}</p>
                          <p className="truncate text-xs text-ink-muted" title={item.detail}>
                            {item.detail}
                          </p>
                        </div>
                        <div className="shrink-0">{attentionAction(item)}</div>
                      </div>
                    )
                  })}
                  {needsAttention.length > ATTENTION_ROWS ? (
                    <p className="px-5 py-2.5 text-xs text-ink-subtle">+ {needsAttention.length - ATTENTION_ROWS} more, less urgent</p>
                  ) : null}
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
