import { useState } from 'react'
import { ArrowRight, Building2, CalendarPlus, Check, ClipboardCheck, Pencil, Sparkles, Video, XCircle } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { DoctorSlotCard } from '../../components/clinician/DoctorSlotCard'
import { AppointmentPeople, AppointmentWhen } from '../../components/appointment/AppointmentSummary'
import { BillStatusBadge } from '../../components/payment/BillStatusBadge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../hooks/useToast'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getState } from '../../domain/store'
import {
  getAvailableSlots,
  getConsultationBillItems,
  getDepartmentSummaries,
  getDoctorSuggestions,
  getPaymentById,
  getPatientById,
  getProviderById,
  getToday,
} from '../../domain/selectors'
import { bookAppointment, cancelAppointment } from '../../domain/actions'
import { formatRupees, sumItems } from '../../utils/billing'
import { dayWithDate, relativeDayLabel } from '../../utils/dates'
import { modesFor } from '../../utils/appointment'
import { cn } from '../../utils/cn'
import { Quadrant, StepRail, Waiting } from '../../components/flow/Quadrant'
import { SoftIconTile } from '../../components/ui/IconTile'
import { departmentIcon, departmentTone } from '../../utils/departments'
import type { FlowProps } from '../registry'
import type { Patient } from '../../types/patient'
import type { ConsultMode } from '../../types/appointment'
import type { AppState } from '../../types/store'
import type { Payment } from '../../types/payment'
import type { Provider } from '../../types/doctor'
import { inputClass } from '../../utils/formClasses'
import { formatTime } from '../../domain/time'

/** The booking as it was made — what the confirmation reads back. */
interface Done {
  patient: Patient
  provider: Provider
  appointmentId: string
  date: string
  slot: string
  mode: ConsultMode
  bill: Payment
}

/** A doctor and a time, chosen together. */
interface Pick {
  providerId: string
  date: string
  slot: string
}

/**
 * Schedule — booking an appointment: patient → department → Doctor
 * Availability (each of the department's doctors with their own times, in
 * one list) → book; the patient pays at the billing counter.
 * Once the patient and department are known, the soonest doctor's earliest
 * time is chosen as a smart choice, said so, and changeable with one tap.
 * Every step stays editable. (`?flow=consult`, the old Start Consultation,
 * opens it too.)
 */
export function ScheduleFlow(props: FlowProps) {
  return <AppointmentFlow {...props} />
}

/** The smart choice: the department's soonest doctor at their earliest free
 *  time — or, with `providerId`, that doctor's earliest free time. */
function soonestPick(state: AppState, department: string, now: number, providerId?: string): Pick | null {
  const doctor = getDoctorSuggestions(state, department, now).find((s) => s.bookable && (!providerId || s.provider.providerId === providerId))
  const next = doctor?.nextSlots[0]
  return doctor && next ? { providerId: doctor.provider.providerId, date: next.date, slot: next.slot } : null
}

interface Start {
  department: string | null
  providerId: string | null
  date: string | null
  slot: string | null
  mode: ConsultMode
  /** The start was a smart choice, not the opening page's. */
  smart: boolean
}

/** What the page that opened the flow already settled. A doctor page names
 *  the doctor, and a slot is kept only when the page named one and it is
 *  still free. With the patient known, whatever is still open is filled in
 *  as a smart choice. */
function startFrom(params: FlowProps['params'], now: number): Start {
  const state = getState()
  const doctor = params.doctor ? getProviderById(state, params.doctor) : null
  const usable = doctor && doctor.status === 'Active' ? doctor : null
  const department = usable?.department ?? params.dept ?? null
  const named = Boolean(usable && params.date && params.slot && getAvailableSlots(state, usable.providerId, now, params.date).includes(params.slot))
  if (usable && named) {
    return { department, providerId: usable.providerId, date: params.date!, slot: params.slot!, mode: modesFor(usable)[0], smart: false }
  }
  const pick = params.uhid && department ? soonestPick(state, department, now, usable?.providerId) : null
  const chosen = pick ? getProviderById(state, pick.providerId) : usable
  return {
    department,
    providerId: pick?.providerId ?? usable?.providerId ?? null,
    date: pick?.date ?? null,
    slot: pick?.slot ?? null,
    mode: chosen ? modesFor(chosen)[0] : 'In person',
    smart: Boolean(pick),
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
  // Tapping a free time books it at once and shows the appointment; Cancel
  // there cancels it straight away, and Confirm closes the flow.
  // The smart choice on show — cleared the moment the desk picks another.
  const [smart, setSmart] = useState<Pick | null>(() => (start.smart && start.providerId && start.date && start.slot ? { providerId: start.providerId, date: start.date, slot: start.slot } : null))
  const { notify } = useToast()
  const doneBill = useStoreValue(getPaymentById, done?.bill.paymentId ?? '')

  const departments = useStoreValue(getDepartmentSummaries, now)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const suggestions = useStoreValue(getDoctorSuggestions, department ?? '', now)
  const billItems = useStoreValue(getConsultationBillItems, patientId, providerId ?? '')
  const total = sumItems(billItems)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])

  const ready = Boolean(patient && department && provider && date && slot) && billItems.length > 0

  /** Choose a doctor and a time together. `viaSmart` marks the smart choice,
   *  so its note shows; any pick by hand clears it. */
  function applyPick(pick: Pick, viaSmart: boolean) {
    setError(null)
    if (pick.providerId !== providerId) {
      const chosen = getProviderById(getState(), pick.providerId)
      setProviderId(pick.providerId)
      setConsultMode(chosen ? modesFor(chosen)[0] : 'In person')
    }
    setDate(pick.date)
    setSlot(pick.slot)
    setSmart(viaSmart ? pick : null)
  }

  /** With the patient and the department known and no time chosen yet, take
   *  the soonest doctor's earliest free time — or, when a doctor is already
   *  named (opened from their page), that doctor's. */
  function pickSoonest(dep: string, doctorId?: string) {
    const pick = soonestPick(getState(), dep, now, doctorId)
    if (pick) applyPick(pick, true)
  }

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setChangingPatient(false)
    // A time the desk already chose on the doctor's page is booked for this patient.
    if (providerId && date && slot && !smart) {
      bookPick(next, { providerId, date, slot })
      return
    }
    if (!department) reveal('book-department')
    else if (!slot) {
      pickSoonest(department, providerId ?? undefined)
      reveal('book-availability')
    }
  }

  /** On a stacked layout (below 1024px), bring the next step into view once a
   *  choice is made, so nobody has to hunt for it. Wide layouts show every
   *  step side by side already. */
  function reveal(id: string) {
    if (window.matchMedia('(min-width: 64rem)').matches) return
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  // A department shows its doctors; with the patient known, the soonest of
  // them is chosen at their earliest time.
  function chooseDepartment(next: string) {
    setError(null)
    if (next !== department) {
      setDepartment(next)
      setProviderId(null)
      setDate(null)
      setSlot(null)
      setSmart(null)
      if (patient) pickSoonest(next)
    }
    reveal('book-availability')
  }

  // Only a time that is still free can be chosen — the cards disable the
  // rest, and this guards against a time taken since they were drawn.
  function pickTime(nextProvider: string, nextDate: string, nextSlot: string) {
    if (!getAvailableSlots(getState(), nextProvider, now, nextDate).includes(nextSlot)) {
      setError(`${formatTime(nextSlot)} has just been taken or has passed — choose another time.`)
      if (nextProvider === providerId && nextDate === date && nextSlot === slot) setSlot(null)
      return
    }
    // Tapping a free time books it for the patient straight away.
    if (patient) bookPick(patient, { providerId: nextProvider, date: nextDate, slot: nextSlot })
    else applyPick({ providerId: nextProvider, date: nextDate, slot: nextSlot }, false)
  }

  // Booking holds the time and raises the bill. The bill is printed from the
  // patient's Payment History and paid at the billing counter — Care Entry takes
  // no money — and the booking is only confirmed once that payment is recorded.
  // Unpaid after five minutes, the time is released (see PaymentHoldSweeper).
  function bookPick(who: Patient, pick: Pick) {
    const doctor = getProviderById(getState(), pick.providerId)
    if (!doctor) return
    setError(null)
    try {
      const mode = pick.providerId === providerId ? consultMode : (modesFor(doctor)[0] ?? 'In person')
      const result = bookAppointment({
        patientId: who.patientId,
        providerId: doctor.providerId,
        date: pick.date,
        slot: pick.slot,
        mode,
        reason: reason.trim() || undefined,
      })
      setDone({
        patient: who,
        provider: doctor,
        appointmentId: result.appointment.appointmentId,
        date: pick.date,
        slot: pick.slot,
        mode,
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
      notify('Appointment cancelled', { detail: `${done.provider.name} · ${dayWithDate(done.date, today)}, ${formatTime(done.slot)}` })
      onClose()
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: 'error' })
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  // ------------------------------------------------------------ acknowledgement
  // A short, calm confirmation for the patient: who, with whom, when. It
  // closes by itself after ten seconds (a bar shows the time running out —
  // no countdown), or at once with Done; Cancel undoes the booking. The
  // timer waits while the cancel question is open.
  if (done) {
    const fee = doneBill ?? done.bill
    return (
      <FlowSheet title="Schedule Appointment" subtitle={subtitle} icon={CalendarPlus} onClose={onClose} size="full">
        <div className="flex min-h-full items-center justify-center py-4 sm:py-8">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-soft bg-surface-1 shadow-modal">
            {/* The details to confirm with the patient before the booking goes ahead. */}
            <div
              className="px-5 pb-3 pt-5 text-center sm:px-6 sm:pb-4 sm:pt-6"
              style={{ backgroundImage: 'radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--color-primary-500) 12%, transparent) 0%, transparent 70%)' }}
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-text ring-[6px] ring-primary-50/60" aria-hidden="true">
                <ClipboardCheck className="h-6 w-6" strokeWidth={2} />
              </span>
              <h3 className="mt-3.5 text-lg font-bold tracking-tight text-ink">Confirm appointment details</h3>
              <p className="mt-0.5 text-sm text-ink-muted">
                Please check these details with <span className="font-semibold text-ink">{done.patient.name}</span> before confirming.
              </p>
            </div>

            {/* When, who, and the fee — the essentials, read back. */}
            <div className="flex flex-col gap-2.5 px-4 pb-4 sm:px-6 sm:pb-5">
              <AppointmentWhen provider={done.provider} date={done.date} slot={done.slot} mode={done.mode} today={today} />
              <AppointmentPeople patient={done.patient} provider={done.provider} />
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">Consultation fee</p>
                  <p className="text-xs text-ink-muted">Paid at the billing counter — the time is held for 5 minutes</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-base font-bold tabular-nums text-ink">{formatRupees(fee.totalAmount)}</span>
                  <BillStatusBadge payment={fee} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-border-soft bg-surface-2/40 px-5 py-3.5 sm:flex sm:px-6">
              <Button variant="danger" onClick={cancelBooking} className="sm:flex-none">
                <XCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Cancel
              </Button>
              <Button onClick={onClose} className="order-first col-span-2 sm:order-none sm:ml-auto sm:min-w-28 sm:flex-none">
                <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </FlowSheet>
    )
  }

  // ---------------------------------------------------------------- one page
  const timeSummary =
    provider && date && slot ? `${provider.name} · ${relativeDayLabel(date, today)} ${formatTime(slot)}${consultMode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined
  const smartShown = Boolean(smart && smart.providerId === providerId && smart.date === date && smart.slot === slot)
  const soonestId = suggestions.find((s) => s.bookable)?.provider.providerId ?? null
  const showPatientSearch = !patient || changingPatient

  // The first thing still to do — highlighted, and named in the review bar.
  const steps = [
    { label: 'Patient', done: Boolean(patient), target: 'book-patient', next: 'choose the patient' },
    { label: 'Department', done: Boolean(department), target: 'book-department', next: 'choose a department' },
    { label: 'Doctor & time', done: Boolean(provider && date && slot), target: 'book-availability', next: 'choose a doctor and a time' },
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
            <p className="text-sm leading-relaxed text-ink-muted max-sm:line-clamp-2 max-sm:text-xs">
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
                <span className="hidden sm:inline"> — {steps.filter((step) => step.done).length} of 3 chosen</span>
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
            <p className="hidden max-w-[16rem] truncate text-xs text-ink-muted sm:block" title={billItems.map((i) => `${i.description} ${formatRupees(i.amount)}`).join(' + ')}>
              {billItems.length ? billItems.map((i) => i.description).join(' + ') : 'Bill total'}
            </p>
            <p className="text-lg font-bold tabular-nums tracking-tight text-ink">{formatRupees(total)}</p>
          </div>
        </div>
      </div>
      <p className="hidden text-xs text-ink-subtle sm:block">
        {ready
          ? `${patient?.name ?? 'The patient'} pays at the billing counter within 5 minutes — print the bill from Payment History. The appointment is confirmed once it is paid.`
          : 'Tap a free time to book it for the patient. Every choice stays editable — tap any section to change it.'}
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
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)] lg:grid-rows-[auto_minmax(0,1fr)] xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
        {/* Top-left · Patient */}
        <Quadrant id="book-patient" step={1} title="Patient" done={Boolean(patient)} current={currentIndex === 0} scrollFrom="xl" className="lg:col-start-1 lg:row-start-1">
          {showPatientSearch ? (
            <div className="flex flex-col gap-2">
              <PatientSearch mode="pick" inline onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile, UHID or ABHA" />
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
        <Quadrant id="book-department" step={2} title="Department" done={Boolean(department)} current={currentIndex === 1} scrollFrom="xl" className="lg:col-start-1 lg:row-start-2 lg:self-start xl:self-stretch">
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-1" role="group" aria-label="Departments">
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
                  <SoftIconTile icon={departmentIcon(dep)} tone={departmentTone(dep)} size="md" />
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

        {/* Right · Doctor Availability — each doctor with their own times. */}
        <Quadrant
          id="book-availability"
          step={3}
          title="Doctor Availability"
          done={Boolean(provider && date && slot)}
          current={currentIndex === 2}
          summary={timeSummary}
          scrollFrom="xl"
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          {!department ? (
            <Waiting>Choose a department to see its doctors and their open times.</Waiting>
          ) : (
            <div className="flex flex-col gap-3">
              {smartShown && provider && date && slot ? (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-xl border border-success-fg/25 bg-success-bg px-3 py-2.5 text-sm"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" strokeWidth={2} aria-hidden="true" />
                  <p className="min-w-0 text-ink">
                    <span className="font-semibold text-success-fg">Smart choice</span> · {provider.name},{' '}
                    <span className="whitespace-nowrap font-semibold">
                      {relativeDayLabel(date, today)} {formatTime(slot)}
                    </span>{' '}
                    <span className="text-ink-muted">— the soonest open time in {department}. Tap any other time to change it.</span>
                  </p>
                </div>
              ) : null}
              {suggestions.length === 0 ? (
                <p className="text-sm text-ink-muted">No doctors in this department.</p>
              ) : (
                <ul className="flex flex-col gap-3" aria-label="Doctors">
                  {suggestions.map((suggestion) => {
                    const chosen = suggestion.provider.providerId === providerId && Boolean(slot)
                    return (
                      <li key={suggestion.provider.providerId}>
                        <DoctorSlotCard
                          suggestion={suggestion}
                          today={today}
                          now={now}
                          soonest={suggestion.provider.providerId === soonestId}
                          selectedDate={chosen ? date : null}
                          selectedSlot={chosen ? slot : null}
                          onPick={pickTime}
                        >
                          {chosen && modes.length > 1 ? (
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
                                      'focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
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
                          ) : null}
                        </DoctorSlotCard>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </Quadrant>
      </div>
      </div>
    </FlowSheet>
  )
}
