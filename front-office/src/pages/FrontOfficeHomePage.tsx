import type { ElementType } from 'react'
import {
  UserPlus,
  CalendarPlus,
  Stethoscope,
  IdCard,
  BedDouble,
  ClipboardPlus,
  LogOut,
  Receipt,
  FileWarning,
  CalendarClock,
  AlertTriangle,
  Info,
  CircleAlert,
  CircleDot,
  IndianRupee,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { DashboardPatientSearch } from '../components/frontoffice/DashboardPatientSearch'
import { QuickActionTile } from '../components/frontoffice/QuickActionTile'
import { OperationalSummaryChart } from '../components/frontoffice/OperationalSummaryChart'
import { DoctorAvailabilityTable } from '../components/clinician/DoctorAvailabilityTable'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import {
  getOperationalSummary,
  getDoctorRows,
  getAppointmentsForDate,
  getNeedsAttention,
} from '../domain/selectors'
import { getDischargesToday } from '../domain/admissionSelectors'
import { formatHeaderDateTime } from '../utils/format'
import { cn } from '../utils/cn'
import { TONE_STYLES } from '../utils/tone'
import type { Tone } from '../utils/tone'

interface PrimaryAction {
  key: string
  label: string
  icon: ElementType
  to?: string
  color: 'blue' | 'emerald' | 'coral' | 'amber' | 'purple' | 'turquoise' | 'magenta'
}

const PRIMARY_ACTIONS: PrimaryAction[] = [
  { key: 'register', label: 'Register Patient', icon: UserPlus, to: '/register/new', color: 'blue' },
  { key: 'book-appointment', label: 'Schedule Appointment', icon: CalendarPlus, to: '/appointments/new', color: 'emerald' },
  { key: 'find-doctor', label: 'Find Doctor', icon: Stethoscope, to: '/doctors', color: 'coral' },
  { key: 'payment', label: 'Payment Status', icon: IndianRupee, to: '/billing', color: 'amber' },
  { key: 'ward-status', label: 'Ward Status', icon: BedDouble, to: '/admissions', color: 'purple' },
  { key: 'admit-patient', label: 'Admit Patient', icon: ClipboardPlus, to: '/admissions/new', color: 'turquoise' },
  { key: 'discharge', label: 'Discharge', icon: LogOut, to: '/admissions/discharge', color: 'magenta' },
]

const ATTENTION_ICON: Record<Tone, ElementType> = {
  critical: CircleAlert,
  warning: AlertTriangle,
  info: Info,
  neutral: CircleDot,
  stable: CircleDot,
  brand: CircleDot,
  teal: CircleDot,
  indigo: CircleDot,
  purple: CircleDot,
  cyan: CircleDot,
  rose: CircleAlert,
}

export function FrontOfficeHomePage() {
  const navigate = useNavigate()
  // 15s tick: enough for minute-level context on this page. Nothing here mutates data — the clock only re-derives.
  const now = useNow(15000)

  const summary = useStoreValue(getOperationalSummary, now)
  const dischargesToday = useStoreValue(getDischargesToday)
  const doctorRows = useStoreValue(getDoctorRows, now)
  const allAppointments = useStoreValue(getAppointmentsForDate)
  // Display order only: open appointments first so finished consultations
  // don't crowd the short dashboard list (stable sort keeps time order).
  const isClosed = (status: string) => status === 'Completed' || status === 'Cancelled' || status === 'No-show'
  const appointments = [...allAppointments].sort((a, b) => Number(isClosed(a.status)) - Number(isClosed(b.status)))
  const needsAttention = useStoreValue(getNeedsAttention, now)

  return (
    <div>
      <PageHeader
        title="SHRI Health Care Entry"
        subtitle={`${formatHeaderDateTime(new Date(now))} · every figure below is derived from today's records`}
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {/* Quick actions */}
        <section aria-label="Quick actions">
          <div className="mb-4">
            <DashboardPatientSearch />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            {PRIMARY_ACTIONS.map((action) => (
              <QuickActionTile key={action.key} icon={action.icon} label={action.label} to={action.to} variant="primary" primaryColor={action.color}
                count={action.key === 'discharge' && dischargesToday > 0 ? dischargesToday : undefined}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <QuickActionTile icon={IdCard} iconTone="brand" label="Attendant Pass" to="/services/attendant-pass" dense />
            <QuickActionTile icon={Receipt} iconTone="stable" label="Enquiry & Estimate" to="/services/enquiry" dense />
            <QuickActionTile icon={FileWarning} iconTone="warning" label="MLC" to="/services/mlc" dense />
          </div>
        </section>

        {/* Doctor availability — "who can I book with right now?" */}
        <div className="grid grid-cols-1 items-stretch gap-6 min-[1400px]:grid-cols-2">
        {/* Doctor availability — "who can I book with right now?" */}
        <section className="h-full min-w-0" aria-label="Doctor availability">
          <Card className="h-full" accentTone="indigo">
            <CardHeader
              icon={Stethoscope}
              iconTone="indigo"
              title="Doctor Schedule"
              subtitle="Based on today's schedule, leave and break status"
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/doctors')}>
                  View all
                </Button>
              }
            />
            <DoctorAvailabilityTable
              rows={doctorRows}
              compact
              onBook={(provider, nextSlot) =>
                navigate('/appointments/new', { state: { providerId: provider.providerId, slot: nextSlot } })
              }
            />
          </Card>
        </section>

        {/* Today's appointments — "what appointments are happening?" */}
        <section className="h-full min-w-0" aria-label="Today's appointments">
          <Card className="h-full" accentTone="info">
            <CardHeader
              icon={CalendarClock}
              iconTone="info"
              title="Today's appointments"
              subtitle={`${summary.todaysAppointments} booked today`}
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/appointments')}>
                  View all
                </Button>
              }
            />
            <AppointmentsTable
              appointments={appointments}
              compact
              maxRows={5}
              emptyAction={
                <Button size="sm" onClick={() => navigate('/appointments/new')}>
                  Schedule an appointment
                </Button>
              }
            />
          </Card>
        </section>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 min-[1400px]:grid-cols-2">
        {/* Operational summary — every figure computed in selectors.ts */}
        <section className="h-full min-w-0" aria-label="Operational summary">
          <OperationalSummaryChart
            data={[
              {
                label: "Today's registrations",
                value: summary.todaysRegistrations,
                context: 'Patients registered today',
                icon: UserPlus,
                tone: 'info',
                onClick: () => navigate('/patients/search'),
              },
              {
                label: "Today's appointments",
                value: summary.todaysAppointments,
                context: summary.cancelledAppointments > 0 ? `${summary.cancelledAppointments} cancelled` : 'None cancelled',
                icon: CalendarClock,
                tone: 'indigo',
                onClick: () => navigate('/appointments'),
              },
              {
                label: 'Doctors available',
                value: summary.doctorsAvailable,
                context: `of ${summary.doctorsTotal} doctors · ${summary.doctorsOnDuty} on duty today`,
                icon: Stethoscope,
                tone: 'stable',
                onClick: () => navigate('/doctors'),
              },
              {
                label: 'Pending payments',
                value: summary.pendingPayments,
                context: 'Due at billing counter',
                icon: IndianRupee,
                tone: 'warning',
              },
              {
                label: 'Pending actions',
                value: summary.pendingActions,
                context: summary.pendingActions > 0 ? 'Needs attention below' : 'Nothing outstanding',
                icon: AlertTriangle,
                tone: 'rose',
              },
            ]}
          />
        </section>

        {/* Needs attention — informational only, no per-item navigation.
            LAST major section, per the mandated Dashboard order. */}
        <section className="h-full min-w-0" aria-label="Needs attention">
          <Card className="h-full" accentTone="warning">
            <CardHeader
              icon={AlertTriangle}
              iconTone="warning"
              title="Needs attention"
              subtitle={`${needsAttention.length} open`}
              className="rounded-t-lg"
            />
            {needsAttention.length === 0 ? (
              <EmptyState title="Nothing needs attention" description="Outstanding front-desk tasks appear here." />
            ) : (
              <div className="divide-y divide-border-soft">
                {needsAttention.slice(0, 5).map((item) => {
                  const styles = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral
                  const Icon = ATTENTION_ICON[item.tone] ?? CircleDot
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', styles.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', styles.text)} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{item.title}</p>
                        <p className="truncate text-xs text-ink-muted" title={item.detail}>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </section>
        </div>
      </div>
    </div>
  )
}
