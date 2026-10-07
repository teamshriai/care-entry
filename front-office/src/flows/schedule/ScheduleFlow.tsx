import { useState } from 'react'
import type { ElementType } from 'react'
import { ArrowRight, Bone, Brain, Building2, CalendarCheck2, CalendarClock, CalendarPlus, Check, HeartPulse, Pencil, Siren, Stethoscope, Video, XCircle } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { SlotBoard } from '../../components/clinician/SlotBoard'
import { DateStrip } from '../../components/clinician/DateStrip'
import { DoctorChoiceList } from '../../components/clinician/DoctorChoiceList'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../hooks/useToast'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getState } from '../../domain/store'
import {
  getAvailableSlots,
  getConsultationBillItems,
  getDepartmentSummaries,
  getDoctorDateStrip,
  getDoctorSuggestions,
  getPaymentById,
  getPatientById,
  getProviderById,
  getSlotBoard,
  getToday,
} from '../../domain/selectors'
import { bookAppointment, cancelAppointment } from '../../domain/actions'
import { sendToBillingCounter } from '../../domain/billingCounter'
import { billNumberFor, formatRupees, isBillDue, sumItems } from '../../utils/billing'
import { dayWithDate, relativeDayLabel } from '../../utils/dates'
import { modesFor } from '../../utils/appointment'
import { cn } from '../../utils/cn'
import { Quadrant, StepRail, Waiting } from '../../components/flow/Quadrant'
import { SoftIconTile } from '../../components/ui/IconTile'
import type { IconTone } from '../../utils/toneHex'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { ConsultMode } from '../../types/appointment'
import type { AppState } from '../../types/store'
import type { Payment } from '../../types/payment'
import { inputClass } from '../../utils/formClasses'
import { formatTime } from '../../domain/time'

const DEPARTMENT_ICON: Record<string, ElementType> = {
  Neurology: Brain,
  Cardiology: HeartPulse,
  'General Medicine': Stethoscope,
  Orthopedics: Bone,
  Neurosurgery: Brain,
  'Emergency Medicine': Siren,
}

/** Each department's own hue — its tile, the same everywhere it appears. */
const DEPARTMENT_TONE: Record<string, IconTone> = {
  Neurology: 'violet',
  Cardiology: 'pink',
  'General Medicine': 'teal',
  Orthopedics: 'amber',
  Neurosurgery: 'indigo',
  'Emergency Medicine': 'red',
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
  const [showReason, setShowReason] = useState(false)
  const [changingPatient, setChangingPatient] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Booking is two-step: Book Appointment opens a review of every detail,
  // and only its own Book Appointment books. After booking, Cancel asks once.
  const [reviewing, setReviewing] = useState(false)
  const [askCancel, setAskCancel] = useState(false)
  const { notify } = useToast()
  const doneBill = useStoreValue(getPaymentById, done?.bill.paymentId ?? '')

  const departments = useStoreValue(getDepartmentSummaries, now)
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
    if (!department) reveal('book-department')
  }

  /** On a stacked layout (below 1024px), bring the next step into view once a
   *  choice is made, so nobody has to hunt for it. Wide layouts show every
   *  step side by side already. */
  function reveal(id: string) {
    if (window.matchMedia('(min-width: 64rem)').matches) return
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
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
    reveal('book-doctor')
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
    reveal('book-time')
  }

  function chooseDate(next: string) {
    setDate(next)
    setSlot(null)
  }

  // Only a time that is still free can be chosen — the board disables the
  // rest, and this guards against a time taken since the board was drawn.
  function chooseSlot(next: string) {
    if (!providerId || !date) return
    if (!getAvailableSlots(getState(), providerId, Date.now(), date).includes(next)) {
      setError(`${formatTime(next)} has just been taken or has passed — choose another time.`)
      setSlot(null)
      return
    }
    setError(null)
    setSlot(next)
  }

  // Booking raises the bill and sends it to the billing counter — Care Entry
  // takes no money. The booking is confirmed once the counter records it.
  function book() {
    setReviewing(false)
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

  // Cancelling straight after booking: the booking is withdrawn and, while
  // still unpaid, so is its bill. A fee already paid at the counter is kept
  // (a consultation fee is refunded only when the doctor is unavailable).
  function cancelBooking() {
    if (!done) return
    try {
      cancelAppointment({ appointmentId: done.appointmentId, by: 'Patient', note: 'Cancelled at the desk after booking' })
      notify('Appointment cancelled', { detail: `${done.doctorName} · ${dayWithDate(done.date, today)}, ${formatTime(done.slot)}` })
      onClose()
    } catch (err) {
      setAskCancel(false)
      notify(err instanceof Error ? err.message : String(err), { tone: 'error' })
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
            <AckCard
              title="Appointment Booked"
              icon={CalendarCheck2}
              onDone={onClose}
              footer={
                <>
                  <Button variant="danger" onClick={() => setAskCancel(true)} className="sm:min-w-36">
                    <XCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    Cancel
                  </Button>
                  <Button onClick={onClose} className="sm:min-w-36">
                    <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    Done
                  </Button>
                </>
              }
            >
              <p className="text-base font-semibold text-ink">{done.doctorName}</p>
              <p>
                {dayWithDate(done.date, today)} · <span className="whitespace-nowrap font-semibold text-ink">{formatTime(done.slot)}</span>
              </p>
              <p className="inline-flex items-center gap-1.5">
                {teleconsult ? <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
                {teleconsult ? 'Teleconsult — the patient joins by video' : `In person${done.room ? ` · ${done.room}` : ''}`}
              </p>
              <p>
                {done.appointmentId.toUpperCase()} · <span className="font-medium text-ink">confirmed once the bill is paid at the billing counter</span>
              </p>
              <BillAtCounter paymentId={done.bill.paymentId} className="mt-1 w-full" />
            </AckCard>
          </div>
        </div>
        <Modal
          open={askCancel}
          onClose={() => setAskCancel(false)}
          title="Cancel this appointment?"
          description={
            <>
              {done.doctorName} · <span className="whitespace-nowrap">{dayWithDate(done.date, today)}</span>,{' '}
              <span className="whitespace-nowrap">{formatTime(done.slot)}</span>
            </>
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setAskCancel(false)} className="max-sm:w-full">
                Keep appointment
              </Button>
              <Button variant="danger" onClick={cancelBooking} className="max-sm:w-full">
                Cancel appointment
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            {doneBill && doneBill.paidAmount > 0 ? (
              <>
                {formatRupees(doneBill.paidAmount)} was already paid at the billing counter for{' '}
                <span className="whitespace-nowrap">{billNumberFor(doneBill)}</span>. A cancellation by the patient keeps the consultation fee.
              </>
            ) : doneBill && isBillDue(doneBill) ? (
              <>
                The time is freed for other patients, and{' '}
                <span className="whitespace-nowrap">
                  {billNumberFor(doneBill)} ({formatRupees(doneBill.balance)})
                </span>{' '}
                is withdrawn from the billing counter.
              </>
            ) : (
              'The time is freed for other patients.'
            )}
          </p>
        </Modal>
      </FlowSheet>
    )
  }

  // ---------------------------------------------------------------- one page
  const timeSummary = date && slot ? `${relativeDayLabel(date, today)} ${formatTime(slot)}${consultMode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined
  const showPatientSearch = !patient || changingPatient

  // The first thing still to do — highlighted, and named in the review bar.
  const steps = [
    { label: 'Patient', done: Boolean(patient), target: 'book-patient', next: 'choose the patient' },
    { label: 'Department', done: Boolean(department), target: 'book-department', next: 'choose a department' },
    { label: 'Doctor', done: Boolean(provider), target: 'book-doctor', next: 'choose a doctor' },
    { label: 'Time', done: Boolean(date && slot), target: 'book-time', next: 'choose a time' },
  ]
  const currentIndex = steps.findIndex((step) => !step.done)
  const rail = steps.map((step, index) => ({ ...step, current: index === currentIndex }))

  const confirmBar = (
    <div className="flex flex-col gap-2.5">
      {error ? <Alert tone="critical" live>{error}</Alert> : null}
      <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_15rem_auto]">
        {/* Review — the booking as one sentence, or the next thing to do. */}
        <div className="min-w-0" aria-live="polite">
          {ready && patient && provider && date && slot ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">{patient.name}</span> with <span className="font-semibold text-ink">{provider.name}</span>{' '}
              <span className="whitespace-nowrap">({department})</span> ·{' '}
              <span className="whitespace-nowrap font-semibold text-ink">
                {dayWithDate(date, today)}, {formatTime(slot)}
              </span>{' '}
              · {consultMode === 'Teleconsult' ? 'Teleconsult' : provider.room ?? 'In person'}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-text">
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <span>
                <span className="font-semibold text-ink">Next: {steps[currentIndex]?.next ?? 'confirm'}</span>
                <span className="hidden sm:inline"> — {steps.filter((step) => step.done).length} of 4 chosen</span>
              </span>
            </p>
          )}
        </div>
        {/* The optional reason — a link until it is wanted, so it never
            crowds the bar. */}
        {showReason || reason ? (
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for the visit (optional)"
            aria-label="Reason for the visit (optional)"
            maxLength={120}
            autoFocus={showReason && !reason}
            className={inputClass}
          />
        ) : ready ? (
          <button
            type="button"
            onClick={() => setShowReason(true)}
            className="focus-ring inline-flex min-h-9 items-center gap-1 self-start justify-self-start rounded-lg px-1 text-sm font-semibold text-primary-text hover:underline xl:justify-self-end"
          >
            + Add a reason <span className="font-normal text-ink-subtle">(optional)</span>
          </button>
        ) : (
          <span className="hidden xl:block" aria-hidden="true" />
        )}
        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <div className="min-w-0 flex-1 text-left xl:flex-none xl:text-right">
            <p className="max-w-[16rem] truncate text-xs text-ink-muted" title={billItems.map((i) => `${i.description} ${formatRupees(i.amount)}`).join(' + ')}>
              {billItems.length ? billItems.map((i) => i.description).join(' + ') : 'Bill total'}
            </p>
            <p className="text-lg font-bold tabular-nums tracking-tight text-ink">{formatRupees(total)}</p>
          </div>
          <Button size="lg" onClick={() => setReviewing(true)} disabled={!ready} className="shrink-0">
            <CalendarCheck2 className="h-4 w-4" strokeWidth={1.75} />
            Book Appointment
          </Button>
        </div>
      </div>
      <p className="hidden text-xs text-ink-subtle sm:block">
        {ready
          ? 'The bill goes to the billing counter; the booking is confirmed once the payment is received.'
          : 'Every choice stays editable — tap any section to change it.'}
      </p>
    </div>
  )

  return (
    <FlowSheet title="Schedule Appointment" subtitle={subtitle} icon={CalendarPlus} onClose={onClose} size="full" footer={confirmBar}>
      {/* One left-to-right progression — who, then which doctor, then when.
          From 1024px the date & time take the right half of the screen and the
          choices that lead to it share the left half (≥1280px: patient and
          department, then the doctors, as two columns that each scroll on their
          own — the sheet itself never does). Narrower: one column, same order. */}
      <div className="flex flex-col xl:h-full">
      <StepRail steps={rail} />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2.2fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
        {/* Top-left · Patient */}
        <Quadrant id="book-patient" step={1} title="Patient" done={Boolean(patient)} current={currentIndex === 0} scrollFrom="xl" className="lg:col-start-1 xl:row-start-1">
          {showPatientSearch ? (
            <div className="flex flex-col gap-2">
              <PatientSearch mode="pick" inline onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile or UHID" />
              {patient ? (
                <button type="button" onClick={() => setChangingPatient(false)} className="self-start text-xs font-semibold text-primary-text hover:underline">
                  Keep {patient.name}
                </button>
              ) : null}
            </div>
          ) : patient ? (
            <div className="rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-3 dark:border-primary-500/35">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-base font-semibold text-ink" title={patient.name}>
                  {patient.name}
                </p>
                <button
                  type="button"
                  onClick={() => setChangingPatient(true)}
                  className="focus-ring -my-1 -mr-1.5 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-primary-text hover:bg-primary-100"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Change
                </button>
              </div>
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-ink-subtle">UHID</dt>
                <dd className="truncate font-medium tabular-nums text-ink">{patient.uhid}</dd>
                <dt className="text-ink-subtle">Age · sex</dt>
                <dd className="truncate text-ink">{patient.age ? `${patient.age} · ${patient.sex}` : patient.sex}</dd>
                {patient.mobile ? (
                  <>
                    <dt className="text-ink-subtle">Mobile</dt>
                    <dd className="truncate tabular-nums text-ink">{patient.mobile}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}
        </Quadrant>

        {/* Top-right · Department */}
        <Quadrant id="book-department" step={2} title="Department" done={Boolean(department)} current={currentIndex === 1} scrollFrom="xl" className="lg:col-start-1 xl:row-start-2">
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-1" role="group" aria-label="Departments">
            {departments.map(({ department: dep, doctors, bookable, next }) => {
              const selected = dep === department
              return (
                <button
                  key={dep}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseDepartment(dep)}
                  className={cn(
                    'focus-ring relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                    selected
                      ? 'border-primary-600 bg-primary-50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary-500)_16%,transparent)]'
                      : 'border-border-soft bg-surface-1 shadow-card-sm hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-md',
                  )}
                >
                  <SoftIconTile icon={DEPARTMENT_ICON[dep] ?? Stethoscope} tone={DEPARTMENT_TONE[dep] ?? 'blue'} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{dep}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {doctors} {doctors === 1 ? 'doctor' : 'doctors'}
                      {next ? ` · next ${relativeDayLabel(next.date, today) === 'Today' ? formatTime(next.slot) : `${relativeDayLabel(next.date, today)} ${formatTime(next.slot)}`}` : bookable === 0 ? ' · no free time' : ''}
                    </span>
                  </span>
                  {selected ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-on-primary" aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </Quadrant>

        {/* Bottom-left · Doctor */}
        <Quadrant
          id="book-doctor"
          step={3}
          title="Doctor"
          done={Boolean(provider)}
          current={currentIndex === 2}
          scrollFrom="xl"
          className="lg:col-start-1 xl:col-start-2 xl:row-span-2 xl:row-start-1"
          summary={provider ? `${provider.name} · ${formatRupees(provider.consultationFee)}` : undefined}
        >
          {department ? (
            <DoctorChoiceList suggestions={suggestions} selectedId={providerId} onChoose={chooseDoctor} today={today} />
          ) : (
            <Waiting>Choose a department to see its doctors.</Waiting>
          )}
        </Quadrant>

        {/* Bottom-right · Time */}
        <Quadrant
          id="book-time"
          step={4}
          title="Date & time"
          done={Boolean(date && slot)}
          current={currentIndex === 3}
          summary={timeSummary}
          scrollFrom="xl"
          className="lg:sticky lg:top-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start xl:static xl:col-start-3 xl:row-span-2 xl:self-stretch"
        >
          {!provider ? (
            <Waiting>Choose a doctor to see their open times.</Waiting>
          ) : (
            <div className="flex flex-col gap-3">
              {modes.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-ink-muted">How</span>
                  <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border-soft bg-surface-2 p-1" role="group" aria-label="How the patient is seen">
                    {modes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={option === consultMode}
                        onClick={() => setConsultMode(option)}
                        className={cn(
                          'focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors',
                          option === consultMode ? 'bg-surface-1 text-ink shadow-card' : 'text-ink-muted hover:text-ink',
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
                  <Video className="h-3.5 w-3.5 text-therapy-fg" strokeWidth={1.75} aria-hidden="true" />
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
      </div>
      {patient && provider && date && slot ? (
        <Modal
          open={reviewing}
          onClose={() => setReviewing(false)}
          title="Review the appointment"
          description="Check every detail with the patient before booking."
          className="sm:max-w-lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setReviewing(false)}>
                Go back
              </Button>
              <Button onClick={book} disabled={!ready}>
                <CalendarCheck2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Book Appointment
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {/* When — the detail most worth reading back, set apart. */}
            <div className="flex items-center gap-3 rounded-xl border border-primary-200/70 bg-primary-50/70 px-4 py-3 dark:border-primary-500/25 dark:bg-primary-500/10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-on-primary shadow-card-sm">
                <CalendarClock className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight text-ink">
                  {dayWithDate(date, today)}, <span className="whitespace-nowrap">{formatTime(slot)}</span>
                </p>
                <p className="text-xs text-ink-muted">
                  {consultMode === 'Teleconsult' ? 'Teleconsult — the patient joins by video' : `In person${provider.room ? ` · ${provider.room}` : ''}`}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-ink-muted">Patient</dt>
              <dd className="min-w-0 text-ink">
                <span className="font-semibold">{patient.name}</span>
                <span className="flex flex-wrap gap-x-1.5 text-xs text-ink-muted">
                  {[patient.uhid, patient.age ? `${patient.age} ${patient.sex.charAt(0)}` : null, patient.mobile].filter(Boolean).map((part, index) => (
                    <span key={index} className="whitespace-nowrap">
                      {index ? '· ' : ''}
                      {part}
                    </span>
                  ))}
                </span>
              </dd>
              <dt className="text-ink-muted">Doctor</dt>
              <dd className="min-w-0 text-ink">
                <span className="font-semibold">{provider.name}</span>
                <span className="block text-xs text-ink-muted">{provider.specialty}</span>
              </dd>
              <dt className="text-ink-muted">Department</dt>
              <dd className="text-ink">{department}</dd>
              {reason.trim() ? (
                <>
                  <dt className="text-ink-muted">Reason</dt>
                  <dd className="break-words text-ink">{reason.trim()}</dd>
                </>
              ) : null}
            </dl>
            <div className="rounded-xl border border-border-soft bg-surface-2/60 px-4 py-3">
              <ul className="flex flex-col gap-1 text-sm">
                {billItems.map((item, index) => (
                  <li key={`${item.description}-${index}`} className="flex justify-between gap-3 text-ink-muted">
                    <span className="min-w-0">{item.description}</span>
                    <span className="tabular-nums">{formatRupees(item.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between gap-3 border-t border-border-soft pt-2 font-semibold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatRupees(total)}</span>
              </p>
            </div>
            <p className="text-xs text-ink-subtle">The bill goes to the billing counter; the appointment is confirmed once it is paid.</p>
          </div>
        </Modal>
      ) : null}
    </FlowSheet>
  )
}
