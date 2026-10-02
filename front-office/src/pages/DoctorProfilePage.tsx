import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarCheck, CalendarX2, Stethoscope, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { doctorStatusLabel } from '../utils/appointment'
import { Avatar } from '../components/ui/Avatar'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { SlotBoard } from '../components/clinician/SlotBoard'
import { AppointmentsTable } from '../components/appointment/AppointmentsTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import {
  getDoctorRow,
  getSlotBoard,
  getAppointmentsForProvider,
  getDoctorLeaves,
  getToday,
} from '../domain/selectors'
import { setDoctorStatus, addDoctorLeave, removeDoctorLeave } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { useFlow } from '../flows/useFlow'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DoctorProfilePage() {
  const { providerId } = useParams<{ providerId: string }>()
  const navigate = useNavigate()
  const now = useNow(30000)
  const { notify } = useToast()
  const { openFlow } = useFlow()
  const id = providerId ?? ''
  const today = useStoreValue(getToday)

  const row = useStoreValue(getDoctorRow, id, now)
  const slotEntries = useStoreValue(getSlotBoard, id, now)
  const appointments = useStoreValue(getAppointmentsForProvider, id)
  const leaves = useStoreValue(getDoctorLeaves, id)

  const [leaveDate, setLeaveDate] = useState('')
  const [leaveReason, setLeaveReason] = useState('Leave')
  const [error, setError] = useState<string | null>(null)

  if (!row) {
    return (
      <div>
        <PageHeader title="Doctor not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-xl">
            <CardBody>
              <EmptyState
                icon={Stethoscope}
                title="No such doctor"
                description="This doctor may have been removed. Every doctor is listed in the directory."
                action={<Button size="sm" onClick={() => navigate('/doctors')}>Doctors</Button>}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  const { provider, status, schedule } = row

  function run(fn: () => void, successMessage: string): boolean {
    setError(null)
    try {
      fn()
      notify(successMessage)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Action failed', { tone: 'error', detail: message })
      return false
    }
  }

  function handleAddLeave(event: React.FormEvent) {
    event.preventDefault()
    if (run(() => addDoctorLeave(id, leaveDate, leaveReason), 'Leave recorded')) {
      setLeaveDate('')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Doctor profile"
        title={provider.name}
        subtitle={`${provider.department} · ${provider.specialty} · ${provider.employeeId}`}
        actions={
          <>
            <Button size="sm" onClick={() => openFlow('schedule', { doctor: id })}>
              <CalendarCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              Schedule
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* Profile */}
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={initialsOf(provider.name)} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{provider.name}</p>
                    <p className="truncate text-xs text-ink-muted">{provider.qualification ?? '—'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge status={status}>{doctorStatusLabel(status)}</Badge>
                      <Badge status={provider.status} className="text-2xs" />
                    </div>
                  </div>
                </div>

                <dl className="space-y-2 border-t border-border-soft pt-3 text-sm">
                  <Row label="Department" value={provider.department} />
                  <Row label="Specialty" value={provider.specialty} />
                  <Row label="Registration no." value={provider.registrationNumber} />
                  <Row label="Experience" value={`${provider.experienceYears} yrs`} />
                  <Row label="Consultation" value={provider.consultationType} />
                  <Row label="Fee" value={provider.consultationFee ? `₹${provider.consultationFee}` : '—'} />
                  <Row label="Room" value={provider.room ?? '—'} />
                  <Row label="Mobile" value={provider.mobile} />
                  <Row label="Email" value={provider.email ?? '—'} />
                  <Row label="Role" value={provider.role} />
                </dl>

                <div className="border-t border-border-soft pt-3">
                  {provider.status === 'Active' ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => run(() => setDoctorStatus(id, 'Inactive'), 'Doctor deactivated')}
                    >
                      Deactivate account
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => run(() => setDoctorStatus(id, 'Active'), 'Doctor activated')}
                    >
                      Activate account
                    </Button>
                  )}
                  <p className="mt-2 text-xs text-ink-faint">
                    An inactive doctor stays in the directory for reference but cannot be booked.
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={CalendarX2} iconTone="warning" title="Leave & unavailability" />
              <CardBody className="flex flex-col gap-3">
                <form onSubmit={handleAddLeave} className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={leaveDate}
                    onChange={(event) => setLeaveDate(event.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
                  />
                  <input
                    value={leaveReason}
                    onChange={(event) => setLeaveReason(event.target.value)}
                    placeholder="Reason"
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!leaveDate}>
                    Record leave
                  </Button>
                </form>
                {leaves.length === 0 ? (
                  <p className="text-xs text-ink-faint">No leave recorded.</p>
                ) : (
                  <div className="divide-y divide-border-soft border-t border-border-soft">
                    {leaves.map((leave) => (
                      <div key={leave.leaveId} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-ink">{leave.date}</p>
                          <p className="truncate text-xs text-ink-muted">{leave.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => run(() => removeDoctorLeave(leave.leaveId), 'Leave removed')}
                          className="rounded p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-critical"
                          aria-label={`Remove leave on ${leave.date}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Schedule + appointments */}
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader
                icon={CalendarCheck}
                iconTone="info"
                title="Today's schedule"
                subtitle={
                  schedule
                    ? `${schedule.sessionStart}–${schedule.sessionEnd} · ${schedule.slotMinutes}-minute slots · ${provider.schedule.workingDays.map((d) => DAY_LABELS[d]).join(', ')}`
                    : 'No session configured for today'
                }
                action={<span className="text-xs tabular-nums text-ink-faint">{row.openSlotCount} open</span>}
              />
              <CardBody>
                {slotEntries.length === 0 ? (
                  <EmptyState
                    title={status === 'On leave' ? 'On leave today' : 'No session today'}
                    description={
                      status === 'On leave'
                        ? 'Slots are not offered on a leave day. Remove the leave record to restore them.'
                        : "This doctor's working days do not include today."
                    }
                  />
                ) : (
                  <SlotBoard
                    entries={slotEntries}
                    onSelect={(slot) => openFlow('schedule', { doctor: id, date: today, slot })}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={Stethoscope}
                iconTone="info"
                title="Today's appointments"
                subtitle="Operational schedule only — no clinical record is shown here"
                action={<span className="text-xs tabular-nums text-ink-faint">{appointments.length}</span>}
              />
              <AppointmentsTable
                appointments={appointments}
                renderActions={() => (
                  <Button size="sm" variant="ghost" onClick={() => navigate('/appointments')}>
                    View
                  </Button>
                )}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink" title={String(value)}>
        {value}
      </dd>
    </div>
  )
}
