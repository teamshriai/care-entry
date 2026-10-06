import { useState } from 'react'
import type { ElementType } from 'react'
import { Bone, Brain, Building2, CalendarCheck2, CalendarPlus, HeartPulse, Pencil, Siren, Stethoscope, Video } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { SlotBoard } from '../../components/clinician/SlotBoard'
import { DateStrip } from '../../components/clinician/DateStrip'
import { DoctorChoiceList } from '../../components/clinician/DoctorChoiceList'
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
  getPatientById,
  getProviderById,
  getProviders,
  getSlotBoard,
  getToday,
} from '../../domain/selectors'
import { bookAppointment } from '../../domain/actions'
import { sendToBillingCounter } from '../../domain/billingCounter'
import { formatRupees, sumItems } from '../../utils/billing'
import { dayWithDate, relativeDayLabel } from '../../utils/dates'
import { modesFor } from '../../utils/appointment'
import { cn } from '../../utils/cn'
import { Quadrant, SummaryItem, Waiting } from '../../components/flow/Quadrant'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { ConsultMode } from '../../types/appointment'
import type { AppState } from '../../types/store'
import type { Payment } from '../../types/payment'

const DEPARTMENT_ICON: Record<string, ElementType> = {
  Neurology: Brain,
  Cardiology: HeartPulse,
  'General Medicine': Stethoscope,
  Orthopedics: Bone,
  Neurosurgery: Brain,
  'Emergency Medicine': Siren,
}

/** What the acknowledgement shows once the payment has gone through. */
interface Done {
  doctorName: string
  room: string | null
  appointmentId: string
  date: string
  slot: string
  mode: ConsultMode
  bill: Payment
}

/**
 * Schedule — booking an appointment: department → the department's doctors
 * → a time to book (in person or teleconsult) → confirm and send the bill. All
 * four choices sit on one full-screen page — patient top-left, department
 * top-right, doctor bottom-left, time bottom-right — each editable at any time,
 * with the confirmation along the bottom. Nothing is chosen for the desk.
 * (`?flow=consult`, the old Start Consultation, opens it too.)
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
  const now = useNow(15000)
  const today = useStoreValue(getToday)

  const [patientId, setPatientId] = useState(params.uhid ?? '')
  const patient = useStoreValue(getPatientById, patientId)
  const [start] = useState(() => startFrom(params, now))
  const [department, setDepartment] = useState(start.department)
  const [providerId, setProviderId] = useState(start.providerId)
  const [date, setDate] = useState(start.date)
  const [slot, setSlot] = useState(start.slot)
  const [consultMode, setConsultMode] = useState<ConsultMode>(start.mode)
  const [reason, setReason] = useState('')
  const [changingPatient, setChangingPatient] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<string | null>(null)

  const departments = useStoreValue(getDepartments)
  const providers = useStoreValue(getProviders)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const suggestions = useStoreValue(getDoctorSuggestions, department ?? '', now)
  const dateStrip = useStoreValue(getDoctorDateStrip, providerId ?? '', now)
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, date ?? today)
  const billItems = useStoreValue(getConsultationBillItems, patientId, providerId ?? '')
  const total = sumItems(billItems)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])

  const ready = Boolean(patient && department && provider && date && slot) && billItems.length > 0

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setChangingPatient(false)
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
  }

  // A doctor opens their times on their first open day, with nothing chosen.
  function chooseDoctor(next: string) {
    setError(null)
    if (next !== providerId) {
      const chosen = getProviderById(getState(), next)
      setProviderId(next)
      setDate(firstOpenDay(getState(), next, now))
      setSlot(null)
      setConsultMode(chosen ? modesFor(chosen)[0] : 'In person')
    }
  }

  function chooseDate(next: string) {
    setDate(next)
    setSlot(null)
  }

  function chooseSlot(next: string) {
    setError(null)
    setSlot(next)
  }

  // Booking raises the bill and sends it to the billing counter — Care Entry
  // takes no money. The booking is confirmed once the counter records it.
  function book() {
    if (!patient || !provider) return
    setError(null)
    try {
      if (!date || !slot) return
      const result = bookAppointment({
        patientId: patient.patientId,
        providerId: provider.providerId,
        date,
        slot,
        mode: consultMode,
        reason: reason.trim() || undefined,
      })
      sendToBillingCounter(result.bill.paymentId)
      setDone({
        doctorName: provider.name,
        room: provider.room,
        appointmentId: result.appointment.appointmentId,
        date,
        slot,
        mode: consultMode,
        bill: result.bill,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      // A slot taken a moment ago: reopen the times so another can be picked.
      if (/slot/i.test(message)) setSlot(null)
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  // ------------------------------------------------------------ acknowledgement
  if (done) {
    const teleconsult = done.mode === 'Teleconsult'
    return (
      <FlowSheet title="Schedule Appointment" subtitle={subtitle} icon={CalendarPlus} onClose={onClose} size="full">
        {/* Full screen like the booking page itself, with the confirmation centred. */}
        <div className="flex min-h-full items-center justify-center py-6">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 px-6 shadow-card">
            <AckCard title="Appointment Booked" icon={CalendarCheck2} onDone={onClose} durationMs={9000}>
              <p className="text-base font-semibold text-ink">{done.doctorName}</p>
              <p>
                {dayWithDate(done.date, today)} · {done.slot}
              </p>
              <p className="inline-flex items-center gap-1.5">
                {teleconsult ? <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
                {teleconsult ? 'Teleconsult — the patient joins by video' : `In person${done.room ? ` · ${done.room}` : ''}`}
              </p>
              <p>{done.appointmentId.toUpperCase()} · confirmed once the payment is received</p>
              <BillAtCounter paymentId={done.bill.paymentId} className="mt-1 w-full" />
            </AckCard>
          </div>
        </div>
      </FlowSheet>
    )
  }

  // ---------------------------------------------------------------- one page
  const departmentDoctors = (dep: string) => providers.filter((p) => p.department === dep && p.status === 'Active').length
  const timeSummary = date && slot ? `${relativeDayLabel(date, today)} ${slot}${consultMode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined
  const showPatientSearch = !patient || changingPatient

  const confirmBar = (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_16rem_auto]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <SummaryItem label="Patient" value={patient ? `${patient.name} · ${patient.uhid}` : null} />
          <SummaryItem label="Department" value={department} />
          <SummaryItem label="Doctor" value={provider ? provider.name : null} />
          <SummaryItem
            label="Time"
            value={
              date && slot
                ? `${dayWithDate(date, today)} · ${slot}${consultMode === 'Teleconsult' ? ' · Teleconsult' : provider?.room ? ` · ${provider.room}` : ''}`
                : null
            }
          />
        </dl>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for the visit (optional)"
          aria-label="Reason for the visit (optional)"
          maxLength={120}
          className="h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
          <div className="text-right">
            <p className="text-xs text-ink-muted" title={billItems.map((i) => `${i.description} ${formatRupees(i.amount)}`).join(' + ')}>
              {billItems.length ? billItems.map((i) => i.description).join(' + ') : 'Bill total'}
            </p>
            <p className="text-lg font-semibold tabular-nums text-ink">{formatRupees(total)}</p>
          </div>
          <Button size="lg" onClick={book} disabled={!ready}>
            <CalendarCheck2 className="h-4 w-4" strokeWidth={1.75} />
            Confirm &amp; send bill
          </Button>
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        {ready
          ? 'The bill goes to the billing counter; the booking is confirmed once the payment is received.'
          : 'Choose the patient, department, doctor and time to confirm.'}
      </p>
    </div>
  )

  return (
    <FlowSheet title="Schedule Appointment" subtitle={subtitle} icon={CalendarPlus} onClose={onClose} size="full" footer={confirmBar}>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
        {/* Top-left · Patient */}
        <Quadrant step={1} title="Patient" done={Boolean(patient)} summary={patient ? `${patient.name} · ${patient.uhid}` : undefined} allowOverflow>
          {showPatientSearch ? (
            <div className="flex flex-col gap-2">
              <PatientSearch mode="pick" onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile or UHID" />
              {patient ? (
                <button type="button" onClick={() => setChangingPatient(false)} className="self-start text-xs font-semibold text-primary-text hover:underline">
                  Keep {patient.name}
                </button>
              ) : null}
            </div>
          ) : patient ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{patient.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {patient.uhid}
                  {patient.age ? ` · ${patient.age} ${patient.sex}` : ''}
                  {patient.mobile ? ` · ${patient.mobile}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setChangingPatient(true)}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Change
              </Button>
            </div>
          ) : null}
        </Quadrant>

        {/* Top-right · Department */}
        <Quadrant step={2} title="Department" done={Boolean(department)} summary={department ?? undefined}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        </Quadrant>

        {/* Bottom-left · Doctor */}
        <Quadrant
          step={3}
          title="Doctor"
          done={Boolean(provider)}
          summary={provider ? `${provider.name} · ${formatRupees(provider.consultationFee)}` : undefined}
        >
          {department ? (
            <DoctorChoiceList suggestions={suggestions} selectedId={providerId} onChoose={chooseDoctor} today={today} />
          ) : (
            <Waiting>Choose a department to see its doctors.</Waiting>
          )}
        </Quadrant>

        {/* Bottom-right · Time */}
        <Quadrant step={4} title="Time" done={Boolean(date && slot)} summary={timeSummary}>
          {!provider ? (
            <Waiting>Choose a doctor to see their open times.</Waiting>
          ) : (
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
          )}
        </Quadrant>
      </div>
    </FlowSheet>
  )
}
