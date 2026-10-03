import type { ElementType } from 'react'
import {
  AlertTriangle,
  BedDouble,
  BedSingle,
  CalendarClock,
  CircleAlert,
  CircleDot,
  IndianRupee,
  Info,
  LogIn,
  LogOut,
  Stethoscope,
  Undo2,
  UserCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { QuickActionTile } from '../components/frontoffice/QuickActionTile'
import { DoctorAvailabilityTable } from '../components/clinician/DoctorAvailabilityTable'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { useFlow } from '../flows/useFlow'
import { getAppointmentsForDate, getBillingOverview, getDoctorRows, getNeedsAttention, getQueueView } from '../domain/selectors'
import type { NeedsAttentionItem } from '../domain/selectors'
import { getDischargedOn, getInpatientRows, getWardSummaries } from '../domain/admissionSelectors'
import { checkInAppointment, returnGuestPass } from '../domain/actions'
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
 * The front desk at a glance: each figure opens the place that holds it,
 * today's appointments and what needs attention each carry their one
 * action, and the doctors' status is there to read. Starting things —
 * registering, scheduling, admitting — happens from the search and the
 * patient's profile, not from launch tiles here.
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
  const discharged = useStoreValue(getDischargedOn, now)
  const doctorRows = useStoreValue(getDoctorRows, now)
  const needsAttention = useStoreValue(getNeedsAttention, now)

  const booked = appointments.filter((a) => a.status !== 'Cancelled')
  const toCheckIn = appointments.filter((a) => a.status === 'Confirmed')
  const longestWait = Math.max(0, ...queue.waiting.map((t) => t.waitingMinutes ?? 0))
  const bedsFree = wards.reduce((sum, w) => sum + w.available, 0)
  const bedsTotal = wards.reduce((sum, w) => sum + w.total, 0)
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
        {/* Each figure opens the place that holds it. */}
        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <QuickActionTile icon={CalendarClock} iconTone="info" label="Outpatients today" count={booked.length} hint={`${toCheckIn.length} to check in`} to="/outpatients" />
          <QuickActionTile
            icon={UserCheck}
            iconTone={longestWait >= 15 ? 'warning' : 'info'}
            label="Waiting"
            count={queue.waiting.length}
            hint={queue.waiting.length ? `Longest ${longestWait} min` : 'Nobody waiting'}
            to="/outpatients?filter=waiting"
          />
          <QuickActionTile
            icon={IndianRupee}
            iconTone={billing.failedCount ? 'critical' : 'warning'}
            label="Due"
            count={formatRupees(billing.dueAmount)}
            hint={`${billing.dueCount} bills${billing.failedCount ? ` · ${billing.failedCount} failed` : ''}`}
            to="/billing?filter=due"
          />
          <QuickActionTile icon={BedDouble} iconTone="info" label="Inpatients" count={inpatients.length} hint={`${critical} in ICU / Emergency`} to="/admissions" />
          <QuickActionTile icon={BedSingle} iconTone="stable" label="Beds free" count={bedsFree} hint={`of ${bedsTotal} beds`} to="/admissions?filter=beds" />
          <QuickActionTile icon={LogOut} iconTone="neutral" label="Discharged today" count={discharged.length} hint="Beds released" to="/admissions?filter=discharged" />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 min-[1400px]:grid-cols-2">
          {/* Today's appointments — one action per row */}
          <section className="min-w-0" aria-label="Today's appointments">
            <Card accentTone="info">
              <CardHeader
                icon={CalendarClock}
                iconTone="info"
                title="Today's appointments"
                subtitle={`${booked.length} booked · ${toCheckIn.length} to check in`}
                action={
                  <Button size="sm" variant="ghost" onClick={() => navigate('/outpatients')}>
                    View all
                  </Button>
                }
              />
              {/* A booking still to arrive shows its one action where its status would be. */}
              <AppointmentsTable
                appointments={todaysList}
                compact
                maxRows={5}
                renderStatus={(appointment) =>
                  appointment.status === 'Confirmed' ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        act(() => checkInAppointment(appointment.appointmentId), 'Checked in', appointment.patient?.name ?? undefined)
                      }
                    >
                      <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Check in
                    </Button>
                  ) : (
                    <Badge status={appointment.status} className="px-2">
                      {appointmentStatusLabel(appointment.status)}
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

        {/* Doctors now — to read, not to act on */}
        <section className="min-w-0" aria-label="Doctors now">
          <Card accentTone="indigo">
            <CardHeader
              icon={Stethoscope}
              iconTone="indigo"
              title="Doctors now"
              subtitle="From today's schedule, leave and break"
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/doctors')}>
                  View all
                </Button>
              }
            />
            <DoctorAvailabilityTable rows={doctorRows} compact onOpenProfile={(provider) => navigate(`/doctors/${provider.providerId}`)} />
          </Card>
        </section>
      </div>
    </div>
  )
}
