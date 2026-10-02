import { useState } from 'react'
import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bone, Brain, CalendarCheck2, CalendarPlus, HeartPulse, Printer, Stethoscope, Ticket } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { StepSection } from '../../components/flow/StepSection'
import type { StepStatus } from '../../components/flow/StepSection'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { SlotBoard } from '../../components/clinician/SlotBoard'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getState } from '../../domain/store'
import {
  getConsultationBillItems,
  getDepartments,
  getDoctorDateStrip,
  getDoctorSuggestions,
  getDoctorsAvailableNow,
  getPatientById,
  getProviderById,
  getProviders,
  getSlotBoard,
  getToday,
} from '../../domain/selectors'
import { bookAndPayAppointment, startPaidWalkIn } from '../../domain/actions'
import { billNumberFor, formatRupees, sumItems } from '../../utils/billing'
import { relativeDayLabel } from '../../utils/dates'
import { doctorStatusLabel } from '../../utils/appointment'
import { initialsOf } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { Payment, PaymentMethod } from '../../types/payment'

type Mode = 'schedule' | 'consult'
type StepKey = 'patient' | 'department' | 'doctor' | 'time'

const DEPARTMENT_ICON: Record<string, ElementType> = {
  Neurology: Brain,
  Cardiology: HeartPulse,
  'General Medicine': Stethoscope,
  Orthopedics: Bone,
}

/** What the acknowledgement shows once the payment has gone through. */
interface Done {
  doctorName: string
  room: string | null
  /** Schedule: the appointment's day and time. */
  date?: string
  slot?: string
  /** Start Consultation: the queue token. */
  token?: string
  waitMinutes?: number
  method: PaymentMethod
  bill: Payment
}

/** Schedule: department → suggested doctor → time → bill → payment, all in
 *  one sheet over the page it was opened from. */
export function ScheduleFlow(props: FlowProps) {
  return <AppointmentFlow {...props} mode="schedule" />
}

/** Start Consultation: a walk-in for today — department → a doctor seeing
 *  patients now → bill → payment → queue token. */
export function ConsultFlow(props: FlowProps) {
  return <AppointmentFlow {...props} mode="consult" />
}

/** The soonest free slot of one doctor, from the suggestions for their department. */
function firstSlotOf(providerId: string, now: number): { date: string; slot: string } | null {
  const state = getState()
  const provider = getProviderById(state, providerId)
  if (!provider) return null
  return getDoctorSuggestions(state, provider.department, now).find((s) => s.provider.providerId === providerId)?.nextSlots[0] ?? null
}

function AppointmentFlow({ params, onClose, mode }: FlowProps & { mode: Mode }) {
  const navigate = useNavigate()
  const now = useNow(15000)
  const today = useStoreValue(getToday)
  const isSchedule = mode === 'schedule'

  const [patientId, setPatientId] = useState(params.uhid ?? '')
  const patient = useStoreValue(getPatientById, patientId)

  // Whatever the entry point already knows is the starting point; the rest
  // is suggested the moment a department is chosen.
  const [providerId, setProviderId] = useState<string | null>(() => {
    const doctor = params.doctor ? getProviderById(getState(), params.doctor) : null
    return doctor && doctor.status === 'Active' ? doctor.providerId : null
  })
  const [department, setDepartment] = useState<string | null>(() => {
    if (params.dept) return params.dept
    return params.doctor ? getProviderById(getState(), params.doctor)?.department ?? null : null
  })
  const [time, setTime] = useState<{ date: string; slot: string } | null>(() => {
    if (!isSchedule || !providerId) return null
    if (params.date && params.slot) return { date: params.date, slot: params.slot }
    return firstSlotOf(providerId, now)
  })
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState<StepKey | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<string | null>(null)

  const departments = useStoreValue(getDepartments)
  const providers = useStoreValue(getProviders)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const suggestions = useStoreValue(getDoctorSuggestions, department ?? '', now)
  const walkInDoctors = useStoreValue(getDoctorsAvailableNow, department ?? '', now)
  const dateStrip = useStoreValue(getDoctorDateStrip, providerId ?? '', now)
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, time?.date ?? today)
  const billItems = useStoreValue(getConsultationBillItems, patientId, providerId ?? '')
  const total = sumItems(billItems)

  // Which steps are finished; a finished step reopens with a tap.
  const patientDone = Boolean(patient) && editing !== 'patient'
  const departmentDone = patientDone && Boolean(department) && editing !== 'department'
  const doctorDone = departmentDone && Boolean(provider) && editing !== 'doctor'
  const timeDone = !isSchedule || (doctorDone && Boolean(time?.slot) && editing !== 'time')
  const ready = patientDone && departmentDone && doctorDone && timeDone && billItems.length > 0
  // The time step shows while it's being changed, or when the chosen doctor
  // still needs a slot; otherwise the doctor card's chips have settled it.
  const timeVisible = isSchedule && (editing === 'time' || (doctorDone && !timeDone))

  function statusOf(finished: boolean, reachable: boolean): StepStatus {
    return finished ? 'done' : reachable ? 'active' : 'locked'
  }

  function edit(step: StepKey) {
    setError(null)
    setEditing(step)
  }

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setEditing(null)
  }

  // Choosing a department suggests the soonest doctor (and, for a booking,
  // their first free slot) straight away — both stay one tap from changing.
  function chooseDepartment(next: string) {
    setError(null)
    setDepartment(next)
    if (isSchedule) {
      const best = getDoctorSuggestions(getState(), next, now).find((s) => s.bookable)
      setProviderId(best?.provider.providerId ?? null)
      setTime(best?.nextSlots[0] ?? null)
    } else {
      setProviderId(getDoctorsAvailableNow(getState(), next, now)[0]?.provider.providerId ?? null)
    }
    setEditing(null)
  }

  function chooseDoctorSlot(nextProvider: string, date: string, slot: string) {
    setError(null)
    setProviderId(nextProvider)
    setTime({ date, slot })
    setEditing(null)
  }

  function chooseDoctorTimes(nextProvider: string) {
    setError(null)
    if (nextProvider !== providerId) {
      setProviderId(nextProvider)
      setTime(firstSlotOf(nextProvider, now))
    }
    setEditing('time')
  }

  function chooseWalkInDoctor(nextProvider: string) {
    setError(null)
    setProviderId(nextProvider)
    setEditing(null)
  }

  // The booking (or token) is saved only once the payment has gone through —
  // there is no pay-later, so a failed or abandoned payment leaves nothing.
  function pay(method: PaymentMethod) {
    if (!patient || !provider) return
    setError(null)
    try {
      if (isSchedule) {
        if (!time?.slot) return
        const result = bookAndPayAppointment({
          patientId: patient.patientId,
          providerId: provider.providerId,
          date: time.date,
          slot: time.slot,
          reason: reason.trim() || undefined,
          method,
        })
        setDone({ doctorName: provider.name, room: provider.room, date: time.date, slot: time.slot, method, bill: result.bill })
      } else {
        const wait = walkInDoctors.find((d) => d.provider.providerId === provider.providerId)?.waitMinutes
        const result = startPaidWalkIn({ patientId: patient.patientId, providerId: provider.providerId, method })
        setDone({ doctorName: provider.name, room: provider.room, token: result.tokenNumber, waitMinutes: wait, method, bill: result.bill })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      // A slot taken a moment ago: reopen the time so another can be picked.
      if (isSchedule && /slot/i.test(message)) setEditing('time')
    }
  }

  const title = isSchedule ? 'Schedule' : 'Start Consultation'
  const icon = isSchedule ? CalendarPlus : Stethoscope
  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  // ------------------------------------------------------------ acknowledgement
  if (done) {
    return (
      <FlowSheet title={title} subtitle={subtitle} icon={icon} onClose={onClose}>
        <AckCard
          title={isSchedule ? 'Appointment Confirmed' : 'Token Issued'}
          icon={isSchedule ? CalendarCheck2 : Ticket}
          onDone={onClose}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/payments/${done.bill.paymentId}/receipt`, { replace: true, state: { autoPrint: true } })}
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              Print receipt
            </Button>
          }
        >
          {done.token ? <p className="text-3xl font-semibold tracking-wide tabular-nums text-primary-text">{done.token}</p> : null}
          <p className="text-base font-semibold text-ink">{done.doctorName}</p>
          <p>
            {done.date && done.slot ? `${relativeDayLabel(done.date, today)} · ${done.slot}` : 'Now'}
            {done.room ? ` · ${done.room}` : ''}
            {done.waitMinutes !== undefined ? ` · ~${done.waitMinutes} min wait` : ''}
          </p>
          <p>
            {formatRupees(done.bill.paidAmount)} paid · {done.method} · {billNumberFor(done.bill)}
          </p>
        </AckCard>
      </FlowSheet>
    )
  }

  // ------------------------------------------------------------------- steps
  const departmentDoctors = (dep: string) => providers.filter((p) => p.department === dep && p.status === 'Active').length

  return (
    <FlowSheet title={title} subtitle={subtitle} icon={icon} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {/* 1 · Patient */}
        <StepSection
          step={1}
          title="Patient"
          status={statusOf(patientDone, true)}
          summary={patient ? `${patient.name} · ${patient.uhid}` : undefined}
          onEdit={() => edit('patient')}
        >
          <PatientSearch mode="pick" onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile or UHID" />
        </StepSection>

        {/* 2 · Department */}
        <StepSection
          step={2}
          title="Department"
          status={statusOf(departmentDone, patientDone)}
          summary={department ?? undefined}
          onEdit={() => edit('department')}
        >
          <div className="grid grid-cols-2 gap-2">
            {departments.map((dep) => {
              const Icon = DEPARTMENT_ICON[dep] ?? Stethoscope
              const count = departmentDoctors(dep)
              return (
                <button
                  key={dep}
                  type="button"
                  aria-pressed={dep === department}
                  onClick={() => chooseDepartment(dep)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    dep === department ? 'border-primary-600 bg-primary-50' : 'border-border bg-surface-1 hover:bg-surface-2',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-text" strokeWidth={1.75} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{dep}</span>
                    <span className="block text-xs text-ink-muted">
                      {count} {count === 1 ? 'doctor' : 'doctors'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </StepSection>

        {/* 3 · Doctor (with their soonest times, for a booking) */}
        <StepSection
          step={3}
          title="Doctor"
          status={statusOf(doctorDone, departmentDone)}
          summary={
            provider
              ? isSchedule && time?.slot && editing !== 'time'
                ? `${provider.name} · ${relativeDayLabel(time.date, today)} ${time.slot}`
                : provider.name
              : undefined
          }
          onEdit={() => edit('doctor')}
        >
          {isSchedule ? (
            suggestions.length === 0 ? (
              <p className="text-sm text-ink-muted">No doctors in this department.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {suggestions.map((s, index) => (
                  <li
                    key={s.provider.providerId}
                    className={cn(
                      'rounded-xl border px-3 py-3',
                      s.provider.providerId === providerId ? 'border-primary-600 bg-primary-50/50' : 'border-border',
                      !s.bookable && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar initials={initialsOf(s.provider.name)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          {s.provider.name}
                          {index === 0 && s.bookable ? <Badge tone="info">Soonest</Badge> : null}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {s.provider.specialty} · {formatRupees(s.provider.consultationFee)}
                        </p>
                      </div>
                      <Badge status={s.status}>{doctorStatusLabel(s.status)} today</Badge>
                    </div>
                    {s.bookable ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-12">
                        {s.nextSlots.map((free) => (
                          <button
                            key={`${free.date}-${free.slot}`}
                            type="button"
                            onClick={() => chooseDoctorSlot(s.provider.providerId, free.date, free.slot)}
                            className={cn(
                              'rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                              s.provider.providerId === providerId && free.date === time?.date && free.slot === time?.slot
                                ? 'border-primary-600 bg-primary-600 text-on-primary'
                                : 'border-stable-border bg-stable-bg text-ink hover:border-primary-600',
                            )}
                          >
                            {relativeDayLabel(free.date, today)} {free.slot}
                          </button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => chooseDoctorTimes(s.provider.providerId)}>
                          All times
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2 pl-12 text-xs text-ink-muted">{s.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : walkInDoctors.length === 0 ? (
            <Alert tone="warning">No doctor in this department is seeing patients right now — schedule instead.</Alert>
          ) : (
            <ul className="flex flex-col gap-2">
              {walkInDoctors.map((d) => (
                <li key={d.provider.providerId}>
                  <button
                    type="button"
                    onClick={() => chooseWalkInDoctor(d.provider.providerId)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      d.provider.providerId === providerId ? 'border-primary-600 bg-primary-50' : 'border-border hover:bg-surface-2',
                    )}
                  >
                    <Avatar initials={initialsOf(d.provider.name)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{d.provider.name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {d.provider.specialty} · {formatRupees(d.provider.consultationFee)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Badge status={d.status}>{doctorStatusLabel(d.status)}</Badge>
                      <span className="mt-1 block text-xs tabular-nums text-ink-muted">
                        {d.waiting} waiting · ~{d.waitMinutes} min
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </StepSection>

        {/* 4 · Time (booking only; the doctor card's chips usually settle it) */}
        {timeVisible ? (
          <StepSection step={4} title="Time" status="active">
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide" role="group" aria-label="Day">
              {dateStrip.map((day) => {
                const selectable = day.state === 'open'
                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={!selectable}
                    aria-pressed={day.date === time?.date}
                    onClick={() => setTime({ date: day.date, slot: '' })}
                    className={cn(
                      'flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 text-xs transition-colors',
                      day.date === time?.date
                        ? 'border-primary-600 bg-primary-600 text-on-primary'
                        : selectable
                          ? 'border-border bg-surface-1 text-ink hover:bg-surface-2'
                          : 'cursor-not-allowed border-border-soft bg-surface-2 text-ink-subtle',
                    )}
                  >
                    <span className="font-semibold">{relativeDayLabel(day.date, today)}</span>
                    <span className={day.date === time?.date ? 'opacity-85' : 'text-ink-muted'}>
                      {day.state === 'open' ? `${day.open} open` : day.state === 'full' ? 'Full' : day.state === 'leave' ? 'Leave' : 'Off'}
                    </span>
                  </button>
                )
              })}
            </div>
            <SlotBoard
              entries={slotEntries}
              selectedSlot={time?.slot || null}
              onSelect={(slot) => {
                setTime({ date: time?.date ?? today, slot })
                setEditing(null)
              }}
              emptyMessage="No session on this day."
            />
          </StepSection>
        ) : null}

        {/* Bill and payment — booking happens when the payment goes through */}
        <StepSection step={timeVisible ? 5 : 4} title="Bill & payment" status={ready && !timeVisible ? 'active' : 'locked'}>
          <div className="flex flex-col gap-4">
            {error ? <Alert tone="critical">{error}</Alert> : null}
            <div className="divide-y divide-border-soft rounded-xl border border-border">
              {billItems.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </div>
              ))}
            </div>
            {isSchedule ? (
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason (optional)"
                aria-label="Reason (optional)"
                className="h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              />
            ) : null}
            <PaymentPanel
              key={`${providerId}|${time?.date}|${time?.slot}|${total}`}
              amount={total}
              status={<Badge tone="warning">Pending</Badge>}
              onPay={pay}
            />
          </div>
        </StepSection>
      </div>
    </FlowSheet>
  )
}
