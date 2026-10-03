import { useState } from 'react'
import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bone, Brain, Building2, CalendarCheck2, CalendarPlus, HeartPulse, Printer, Stethoscope, Ticket, Video } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { StepSection } from '../../components/flow/StepSection'
import type { StepStatus } from '../../components/flow/StepSection'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { SlotBoard } from '../../components/clinician/SlotBoard'
import { DateStrip } from '../../components/clinician/DateStrip'
import { DoctorChoiceList } from '../../components/clinician/DoctorChoiceList'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getState } from '../../domain/store'
import {
  getAvailableSlots,
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
import { formatDateKey, relativeDayLabel } from '../../utils/dates'
import { doctorStatusLabel, modesFor, takesWalkIns } from '../../utils/appointment'
import { initialsOf } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { ConsultMode } from '../../types/appointment'
import type { AppState } from '../../types/store'
import type { Payment, PaymentMethod } from '../../types/payment'

type Kind = 'schedule' | 'consult'
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
  /** Schedule: the booking, its day, time and mode. */
  appointmentId?: string
  date?: string
  slot?: string
  mode?: ConsultMode
  /** Start Consultation: the queue token. */
  token?: string
  waitMinutes?: number
  method: PaymentMethod
  bill: Payment
}

/** Schedule: department → the department's doctors → that doctor's times →
 *  confirm and pay, one step at a time in a sheet over the page it was
 *  opened from. Nothing is chosen for the desk. */
export function ScheduleFlow(props: FlowProps) {
  return <AppointmentFlow {...props} kind="schedule" />
}

/** Start Consultation: a walk-in for today — department → a doctor seeing
 *  patients now → confirm and pay → queue token. */
export function ConsultFlow(props: FlowProps) {
  return <AppointmentFlow {...props} kind="consult" />
}

/** The doctor's first day with a free slot — where the time step opens. */
function firstOpenDay(state: AppState, providerId: string, now: number): string | null {
  return getDoctorDateStrip(state, providerId, now).find((day) => day.state === 'open')?.date ?? null
}

interface Start {
  department: string | null
  providerId: string | null
  date: string | null
  slot: string | null
  mode: ConsultMode
}

/** What the page that opened the flow already settled. A doctor page names
 *  the doctor, so the flow opens on their times; a slot is kept only when
 *  the page named one and it is still free. */
function startFrom(params: FlowProps['params'], kind: Kind, now: number): Start {
  const state = getState()
  const doctor = params.doctor ? getProviderById(state, params.doctor) : null
  const usable = doctor && doctor.status === 'Active' && (kind === 'schedule' || takesWalkIns(doctor)) ? doctor : null
  const department = usable?.department ?? params.dept ?? null
  if (!usable) return { department, providerId: null, date: null, slot: null, mode: 'In person' }
  const mode = modesFor(usable)[0]
  if (kind === 'consult') return { department, providerId: usable.providerId, date: null, slot: null, mode }
  const named = Boolean(params.date && params.slot && getAvailableSlots(state, usable.providerId, now, params.date).includes(params.slot))
  return {
    department,
    providerId: usable.providerId,
    date: named ? params.date! : firstOpenDay(state, usable.providerId, now),
    slot: named ? params.slot! : null,
    mode,
  }
}

function AppointmentFlow({ params, onClose, kind }: FlowProps & { kind: Kind }) {
  const navigate = useNavigate()
  const now = useNow(15000)
  const today = useStoreValue(getToday)
  const isSchedule = kind === 'schedule'

  const [patientId, setPatientId] = useState(params.uhid ?? '')
  const patient = useStoreValue(getPatientById, patientId)
  const [start] = useState(() => startFrom(params, kind, now))
  const [department, setDepartment] = useState(start.department)
  const [providerId, setProviderId] = useState(start.providerId)
  const [date, setDate] = useState(start.date)
  const [slot, setSlot] = useState(start.slot)
  const [consultMode, setConsultMode] = useState<ConsultMode>(start.mode)
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
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, date ?? today)
  const billItems = useStoreValue(getConsultationBillItems, patientId, providerId ?? '')
  const total = sumItems(billItems)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])
  const walkIn = walkInDoctors.find((d) => d.provider.providerId === providerId)

  // Which steps are finished; a finished step reopens with a tap.
  const patientDone = Boolean(patient) && editing !== 'patient'
  const departmentDone = patientDone && Boolean(department) && editing !== 'department'
  const doctorDone = departmentDone && Boolean(provider) && editing !== 'doctor'
  const timeDone = !isSchedule || (doctorDone && Boolean(date && slot) && editing !== 'time')
  const ready = doctorDone && timeDone && billItems.length > 0

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

  // A department only narrows the doctors — it chooses none of them.
  function chooseDepartment(next: string) {
    setError(null)
    if (next !== department) {
      setDepartment(next)
      setProviderId(null)
      setDate(null)
      setSlot(null)
    }
    setEditing(null)
  }

  // A doctor opens their times on their first open day, with no time chosen.
  function chooseDoctor(next: string) {
    setError(null)
    if (next !== providerId) {
      const chosen = getProviderById(getState(), next)
      setProviderId(next)
      setDate(isSchedule ? firstOpenDay(getState(), next, now) : null)
      setSlot(null)
      setConsultMode(chosen ? modesFor(chosen)[0] : 'In person')
    }
    setEditing(null)
  }

  function chooseDate(next: string) {
    setDate(next)
    setSlot(null)
  }

  function chooseSlot(next: string) {
    setSlot(next)
    setEditing(null)
  }

  // The booking (or token) is saved only once the payment has gone through —
  // there is no pay-later, so a failed or abandoned payment leaves nothing.
  function pay(method: PaymentMethod) {
    if (!patient || !provider) return
    setError(null)
    try {
      if (isSchedule) {
        if (!date || !slot) return
        const result = bookAndPayAppointment({
          patientId: patient.patientId,
          providerId: provider.providerId,
          date,
          slot,
          mode: consultMode,
          reason: reason.trim() || undefined,
          method,
        })
        setDone({
          doctorName: provider.name,
          room: provider.room,
          appointmentId: result.appointment.appointmentId,
          date,
          slot,
          mode: consultMode,
          method,
          bill: result.bill,
        })
      } else {
        const result = startPaidWalkIn({ patientId: patient.patientId, providerId: provider.providerId, method })
        setDone({ doctorName: provider.name, room: provider.room, token: result.tokenNumber, waitMinutes: walkIn?.waitMinutes, method, bill: result.bill })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      // A slot taken a moment ago: reopen the times so another can be picked.
      if (isSchedule && /slot/i.test(message)) {
        setSlot(null)
        setEditing('time')
      }
    }
  }

  const title = isSchedule ? 'Schedule' : 'Start Consultation'
  const icon = isSchedule ? CalendarPlus : Stethoscope
  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  // ------------------------------------------------------------ acknowledgement
  if (done) {
    const teleconsult = done.mode === 'Teleconsult'
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
            {done.date && done.slot ? `${relativeDayLabel(done.date, today)} · ${formatDateKey(done.date)} · ${done.slot}` : 'Now'}
            {done.waitMinutes !== undefined ? ` · ~${done.waitMinutes} min wait` : ''}
          </p>
          {isSchedule ? (
            <p className="inline-flex items-center gap-1.5">
              {teleconsult ? <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
              {teleconsult ? 'Teleconsult — the patient joins by video' : `In person${done.room ? ` · ${done.room}` : ''}`}
            </p>
          ) : done.room ? (
            <p>{done.room}</p>
          ) : null}
          <p>
            {done.appointmentId ? `${done.appointmentId.toUpperCase()} · ` : ''}
            {formatRupees(done.bill.paidAmount)} paid · {done.method} · {billNumberFor(done.bill)}
          </p>
        </AckCard>
      </FlowSheet>
    )
  }

  // ------------------------------------------------------------------- steps
  const departmentDoctors = (dep: string) =>
    providers.filter((p) => p.department === dep && p.status === 'Active' && (isSchedule || takesWalkIns(p))).length
  const when = date && slot ? `${relativeDayLabel(date, today)} ${slot}` : null

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

        {/* 3 · Doctor */}
        <StepSection
          step={3}
          title="Doctor"
          status={statusOf(doctorDone, departmentDone)}
          summary={provider ? `${provider.name} · ${formatRupees(provider.consultationFee)}` : undefined}
          onEdit={() => edit('doctor')}
        >
          {isSchedule ? (
            <DoctorChoiceList suggestions={suggestions} selectedId={providerId} onChoose={chooseDoctor} today={today} />
          ) : walkInDoctors.length === 0 ? (
            <Alert tone="warning">No doctor in this department is seeing patients in person right now — schedule instead.</Alert>
          ) : (
            <ul className="flex flex-col gap-2">
              {walkInDoctors.map((d) => (
                <li key={d.provider.providerId}>
                  <button
                    type="button"
                    aria-pressed={d.provider.providerId === providerId}
                    onClick={() => chooseDoctor(d.provider.providerId)}
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

        {/* 4 · Time — booking only */}
        {isSchedule ? (
          <StepSection
            step={4}
            title="Time"
            status={statusOf(timeDone, doctorDone)}
            summary={when ? `${when}${consultMode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined}
            onEdit={() => edit('time')}
          >
            <div className="flex flex-col gap-3">
              {modes.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-ink-muted">How</span>
                  <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="How the patient is seen">
                    {modes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={option === consultMode}
                        onClick={() => setConsultMode(option)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                          option === consultMode ? 'bg-primary-600 text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                        )}
                      >
                        {option === 'Teleconsult' ? (
                          <Video className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                        )}
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : modes[0] === 'Teleconsult' ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <Video className="h-3.5 w-3.5 text-purple" strokeWidth={1.75} aria-hidden="true" />
                  Teleconsult only — the patient joins by video.
                </p>
              ) : null}
              {date ? (
                <>
                  <DateStrip days={dateStrip} selected={date} onSelect={chooseDate} today={today} />
                  <SlotBoard entries={slotEntries} selectedSlot={slot} onSelect={chooseSlot} emptyMessage="No session on this day." />
                </>
              ) : (
                <p className="text-sm text-ink-muted">No open time with this doctor in the next two weeks — choose another doctor.</p>
              )}
            </div>
          </StepSection>
        ) : null}

        {/* Confirm and pay — the booking is saved when the payment goes through */}
        <StepSection step={isSchedule ? 5 : 4} title="Confirm & pay" status={ready ? 'active' : 'locked'}>
          <div className="flex flex-col gap-4">
            {error ? <Alert tone="critical">{error}</Alert> : null}
            {patient && provider ? (
              <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl bg-surface-2 px-4 py-3 text-sm">
                <dt className="text-ink-muted">Patient</dt>
                <dd className="truncate font-medium text-ink">
                  {patient.name} · {patient.uhid}
                </dd>
                <dt className="text-ink-muted">Doctor</dt>
                <dd className="truncate font-medium text-ink">
                  {provider.name} · {provider.department}
                </dd>
                <dt className="text-ink-muted">When</dt>
                <dd className="font-medium text-ink">
                  {isSchedule
                    ? date && slot
                      ? `${relativeDayLabel(date, today)} · ${formatDateKey(date)} · ${slot}`
                      : '—'
                    : `Now${walkIn ? ` · ~${walkIn.waitMinutes} min wait, ${walkIn.waiting} ahead` : ''}`}
                </dd>
                <dt className="text-ink-muted">Where</dt>
                <dd className="font-medium text-ink">
                  {isSchedule && consultMode === 'Teleconsult' ? 'Teleconsult — by video' : (provider.room ?? 'In person')}
                </dd>
              </dl>
            ) : null}
            {isSchedule ? (
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for the visit (optional)"
                aria-label="Reason for the visit (optional)"
                maxLength={120}
                className="h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              />
            ) : null}
            <div className="divide-y divide-border-soft rounded-xl border border-border">
              {billItems.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </div>
              ))}
            </div>
            <PaymentPanel
              key={`${providerId}|${date}|${slot}|${consultMode}|${total}`}
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
