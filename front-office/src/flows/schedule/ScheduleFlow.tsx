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
import { dayWithDate, relativeDayLabel } from '../../utils/dates'
import { modesFor } from '../../utils/appointment'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { ConsultMode } from '../../types/appointment'
import type { AppState } from '../../types/store'
import type { Payment, PaymentMethod } from '../../types/payment'

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
  /** A booking: its reference, day, time and mode. */
  appointmentId?: string
  date?: string
  slot?: string
  mode?: ConsultMode
  /** A walk-in: the queue token. */
  token?: string
  waitMinutes?: number
  method: PaymentMethod
  bill: Payment
}

/**
 * Schedule — the one way to put a patient in front of a doctor: department
 * → the department's doctors → when: now, as a walk-in with a queue token,
 * or a time to book (in person or teleconsult) → confirm and pay. One step
 * at a time, in a sheet over the page it was opened from; nothing is chosen
 * for the desk. (`?flow=consult`, the old Start Consultation, opens it too.)
 */
export function ScheduleFlow(props: FlowProps) {
  return <AppointmentFlow {...props} />
}

/** The doctor's first day with a free slot — where the booking times open. */
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
function startFrom(params: FlowProps['params'], now: number): Start {
  const state = getState()
  const doctor = params.doctor ? getProviderById(state, params.doctor) : null
  const usable = doctor && doctor.status === 'Active' ? doctor : null
  const department = usable?.department ?? params.dept ?? null
  if (!usable) return { department, providerId: null, date: null, slot: null, mode: 'In person' }
  const named = Boolean(params.date && params.slot && getAvailableSlots(state, usable.providerId, now, params.date).includes(params.slot))
  return {
    department,
    providerId: usable.providerId,
    date: named ? params.date! : firstOpenDay(state, usable.providerId, now),
    slot: named ? params.slot! : null,
    mode: modesFor(usable)[0],
  }
}

function AppointmentFlow({ params, onClose }: FlowProps) {
  const navigate = useNavigate()
  const now = useNow(15000)
  const today = useStoreValue(getToday)

  const [patientId, setPatientId] = useState(params.uhid ?? '')
  const patient = useStoreValue(getPatientById, patientId)
  const [start] = useState(() => startFrom(params, now))
  const [department, setDepartment] = useState(start.department)
  const [providerId, setProviderId] = useState(start.providerId)
  const [date, setDate] = useState(start.date)
  const [slot, setSlot] = useState(start.slot)
  // Now, as a walk-in, instead of a booked time.
  const [walkIn, setWalkIn] = useState(false)
  const [consultMode, setConsultMode] = useState<ConsultMode>(start.mode)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState<StepKey | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<string | null>(null)

  const departments = useStoreValue(getDepartments)
  const providers = useStoreValue(getProviders)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const suggestions = useStoreValue(getDoctorSuggestions, department ?? '', now)
  const nowDoctors = useStoreValue(getDoctorsAvailableNow, department ?? '', now)
  const dateStrip = useStoreValue(getDoctorDateStrip, providerId ?? '', now)
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, date ?? today)
  const billItems = useStoreValue(getConsultationBillItems, patientId, providerId ?? '')
  const total = sumItems(billItems)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])
  const walkIns = new Map(nowDoctors.map((d) => [d.provider.providerId, { waiting: d.waiting, waitMinutes: d.waitMinutes }]))
  const nowOffer = providerId ? walkIns.get(providerId) : undefined

  // Which steps are finished; a finished step reopens with a tap.
  const patientDone = Boolean(patient) && editing !== 'patient'
  const departmentDone = patientDone && Boolean(department) && editing !== 'department'
  const doctorDone = departmentDone && Boolean(provider) && editing !== 'doctor'
  const timeDone = doctorDone && (walkIn ? Boolean(nowOffer) : Boolean(date && slot)) && editing !== 'time'
  const ready = timeDone && billItems.length > 0

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
      setWalkIn(false)
    }
    setEditing(null)
  }

  // A doctor opens their times on their first open day, with nothing chosen.
  function chooseDoctor(next: string) {
    setError(null)
    if (next !== providerId) {
      const chosen = getProviderById(getState(), next)
      setProviderId(next)
      setDate(firstOpenDay(getState(), next, now))
      setSlot(null)
      setWalkIn(false)
      setConsultMode(chosen ? modesFor(chosen)[0] : 'In person')
    }
    setEditing(null)
  }

  function chooseNow() {
    setError(null)
    setWalkIn(true)
    setSlot(null)
    setEditing(null)
  }

  function chooseDate(next: string) {
    setWalkIn(false)
    setDate(next)
    setSlot(null)
  }

  function chooseSlot(next: string) {
    setWalkIn(false)
    setSlot(next)
    setEditing(null)
  }

  // The booking (or token) is saved only once the payment has gone through —
  // there is no pay-later, so a failed or abandoned payment leaves nothing.
  function pay(method: PaymentMethod) {
    if (!patient || !provider) return
    setError(null)
    try {
      if (walkIn) {
        const result = startPaidWalkIn({ patientId: patient.patientId, providerId: provider.providerId, method })
        setDone({ doctorName: provider.name, room: provider.room, token: result.tokenNumber, waitMinutes: nowOffer?.waitMinutes, method, bill: result.bill })
        return
      }
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      // A slot taken a moment ago, or a doctor no longer seeing patients:
      // reopen the times so another can be picked.
      if (/slot|not seeing patients/i.test(message)) {
        setSlot(null)
        setWalkIn(false)
        setEditing('time')
      }
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  // ------------------------------------------------------------ acknowledgement
  if (done) {
    const teleconsult = done.mode === 'Teleconsult'
    return (
      <FlowSheet title="Schedule" subtitle={subtitle} icon={CalendarPlus} onClose={onClose}>
        <AckCard
          title={done.token ? 'Token Issued' : 'Appointment Confirmed'}
          icon={done.token ? Ticket : CalendarCheck2}
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
            {done.date && done.slot ? `${dayWithDate(done.date, today)} · ${done.slot}` : 'Now'}
            {done.waitMinutes !== undefined ? ` · ~${done.waitMinutes} min wait` : ''}
          </p>
          {done.token ? (
            done.room ? <p>{done.room}</p> : null
          ) : (
            <p className="inline-flex items-center gap-1.5">
              {teleconsult ? <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
              {teleconsult ? 'Teleconsult — the patient joins by video' : `In person${done.room ? ` · ${done.room}` : ''}`}
            </p>
          )}
          <p>
            {done.appointmentId ? `${done.appointmentId.toUpperCase()} · ` : ''}
            {formatRupees(done.bill.paidAmount)} paid · {done.method} · {billNumberFor(done.bill)}
          </p>
        </AckCard>
      </FlowSheet>
    )
  }

  // ------------------------------------------------------------------- steps
  const departmentDoctors = (dep: string) => providers.filter((p) => p.department === dep && p.status === 'Active').length
  const timeSummary = walkIn
    ? `Now — walk-in${nowOffer ? ` · ~${nowOffer.waitMinutes} min` : ''}`
    : date && slot
      ? `${relativeDayLabel(date, today)} ${slot}${consultMode === 'Teleconsult' ? ' · Teleconsult' : ''}`
      : undefined

  return (
    <FlowSheet title="Schedule" subtitle={subtitle} icon={CalendarPlus} onClose={onClose}>
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
          <DoctorChoiceList suggestions={suggestions} selectedId={providerId} onChoose={chooseDoctor} today={today} walkIns={walkIns} />
        </StepSection>

        {/* 4 · When — now as a walk-in, or a time to book */}
        <StepSection step={4} title="When" status={statusOf(timeDone, doctorDone)} summary={timeSummary} onEdit={() => edit('time')}>
          <div className="flex flex-col gap-3">
            {nowOffer ? (
              <button
                type="button"
                aria-pressed={walkIn}
                onClick={chooseNow}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-colors',
                  walkIn ? 'border-primary-600 bg-primary-50' : 'border-teal-border bg-teal-bg hover:border-primary-600',
                )}
              >
                <Ticket className="h-5 w-5 shrink-0 text-teal" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">Now — walk-in token</span>
                  <span className="block text-xs text-ink-muted">
                    {provider?.name} is seeing patients · {nowOffer.waiting} waiting · ~{nowOffer.waitMinutes} min
                  </span>
                </span>
              </button>
            ) : null}

            {nowOffer ? <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">Or book a time</p> : null}
            {modes.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">How</span>
                <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="How the patient is seen">
                  {modes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={!walkIn && option === consultMode}
                      onClick={() => setConsultMode(option)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                        !walkIn && option === consultMode ? 'bg-primary-600 text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
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
                <DateStrip days={dateStrip} selected={walkIn ? null : date} onSelect={chooseDate} today={today} />
                <SlotBoard entries={slotEntries} selectedSlot={walkIn ? null : slot} onSelect={chooseSlot} emptyMessage="No session on this day." />
              </>
            ) : (
              <p className="text-sm text-ink-muted">No open time to book with this doctor in the next two weeks.</p>
            )}
          </div>
        </StepSection>

        {/* 5 · Confirm and pay — saved when the payment goes through */}
        <StepSection step={5} title="Confirm & pay" status={ready ? 'active' : 'locked'}>
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
                  {walkIn
                    ? `Now — walk-in${nowOffer ? ` · ~${nowOffer.waitMinutes} min wait, ${nowOffer.waiting} ahead` : ''}`
                    : date && slot
                      ? `${dayWithDate(date, today)} · ${slot}`
                      : '—'}
                </dd>
                <dt className="text-ink-muted">Where</dt>
                <dd className="font-medium text-ink">
                  {!walkIn && consultMode === 'Teleconsult' ? 'Teleconsult — by video' : (provider.room ?? 'In person')}
                </dd>
              </dl>
            ) : null}
            {!walkIn ? (
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
              key={`${providerId}|${walkIn ? 'now' : `${date}|${slot}|${consultMode}`}|${total}`}
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
