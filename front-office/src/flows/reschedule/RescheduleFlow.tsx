import { useState } from 'react'
import type { ReactNode } from 'react'
import { Building2, CalendarCheck2, CalendarClock, Stethoscope, Video } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { Quadrant, SummaryItem, Waiting } from '../../components/flow/Quadrant'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { printBill } from '../../utils/printBill'
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
  consultationFeePaid,
  getAppointmentById,
  getDoctorDateStrip,
  getDoctorSuggestions,
  getPatientById,
  getProviderById,
  getSlotBoard,
  getToday,
} from '../../domain/selectors'
import { rescheduleAppointment } from '../../domain/actions'
import { formatRupees } from '../../utils/billing'
import { dayWithDate, relativeDayLabel } from '../../utils/dates'
import { appointmentStatusLabel, modesFor } from '../../utils/appointment'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Appointment, BookingPlace, ConsultMode, UnavailableParty } from '../../types/appointment'
import type { Payment } from '../../types/payment'
import { inputClass } from '../../utils/formClasses'
import { formatTime } from '../../domain/time'

/** One line for a booking's place: doctor · day date · time · mode. */
function placeLine(place: BookingPlace, doctorName: string, today: string): string {
  return `${doctorName} · ${dayWithDate(place.date, today)} · ${formatTime(place.slot)}${place.mode === 'Teleconsult' ? ' · Teleconsult' : ''}`
}

/**
 * Reschedule: a confirmed booking moves to another time, or to another
 * doctor in the same department. It is the Schedule Appointment page again —
 * patient top-left, department top-right, doctor bottom-left, time
 * bottom-right, the confirmation along the bottom — with the patient and
 * department fixed by the booking, and "who can't make it" added to the
 * confirmation. Moving never refunds; a patient who asks for a dearer doctor
 * pays the difference, and when the doctor is the reason the hospital
 * absorbs it.
 */
export function RescheduleFlow({ params, onClose }: FlowProps) {
  const now = useNow(15000)
  const today = useStoreValue(getToday)
  const live = useStoreValue(getAppointmentById, params.appointment ?? '')
  // The booking as it was when the flow opened — the "Was" card stays put.
  const [was] = useState<Appointment | null>(live)
  const patient = useStoreValue(getPatientById, was?.patientId ?? '')
  const wasProvider = useStoreValue(getProviderById, was?.providerId ?? '')
  const feePaid = useStoreValue(consultationFeePaid, was?.appointmentId ?? '')

  const [providerId, setProviderId] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [mode, setMode] = useState<ConsultMode>(was?.mode ?? 'In person')
  const [by, setBy] = useState<UnavailableParty | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ appointment: Appointment; differenceBill: Payment | null } | null>(null)

  const suggestions = useStoreValue(getDoctorSuggestions, was?.department ?? '', now)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const dateStrip = useStoreValue(getDoctorDateStrip, providerId ?? '', now)
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, date ?? today)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])

  const subtitle = patient ? `${patient.name} · ${patient.uhid}` : 'Booking'
  const sheet = (body: ReactNode, footer?: ReactNode) => (
    <FlowSheet title="Reschedule" subtitle={subtitle} icon={CalendarClock} onClose={onClose} size="full" footer={footer}>
      {body}
    </FlowSheet>
  )

  if (!was || !wasProvider) return sheet(<Alert tone="warning">That booking no longer exists.</Alert>)

  const wasPlace: BookingPlace = { providerId: was.providerId, date: was.date, slot: was.slot, mode: was.mode }

  // ------------------------------------------------------------ acknowledgement
  if (done) {
    const moved = done.appointment
    const movedDoctor = getProviderById(getState(), moved.providerId)?.name ?? 'Doctor'
    return sheet(
      <div className="flex min-h-full items-center justify-center py-6">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 px-6 shadow-card">
      <AckCard
        title="Appointment Rescheduled"
        icon={CalendarCheck2}
        onDone={onClose}
        durationMs={done.differenceBill ? 9000 : undefined}
      >
        <p className="text-base font-semibold text-ink">{movedDoctor}</p>
        <p>
          {dayWithDate(moved.date, today)} · {formatTime(moved.slot)}
        </p>
        <p className="inline-flex items-center gap-1.5">
          {moved.mode === 'Teleconsult' ? <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
          {moved.mode === 'Teleconsult' ? 'Teleconsult — the patient joins by video' : 'In person'}
        </p>
        <p className="text-xs">Was {placeLine(wasPlace, wasProvider.name, today)}</p>
        <p>
          {moved.appointmentId.toUpperCase()}
          {done.differenceBill ? ' · confirmed once the fee difference is received' : ' · nothing to pay'}
        </p>
        {done.differenceBill ? <BillAtCounter paymentId={done.differenceBill.paymentId} className="mt-1 w-full" /> : null}
      </AckCard>
        </div>
      </div>,
    )
  }

  // A booking that has moved on (checked in, cancelled …) can't be moved.
  if (!live || live.status !== 'Confirmed') {
    return sheet(
      <Alert tone="warning">
        This booking is {live ? appointmentStatusLabel(live.status).toLowerCase() : 'gone'} — only a confirmed booking can be rescheduled.
      </Alert>,
    )
  }

  const timeDone = Boolean(provider && date && slot)

  const difference = provider ? provider.consultationFee - feePaid : 0
  const charge = difference > 0 && by === 'Patient' ? difference : 0
  const ready = timeDone && by !== null
  const nowPlace = provider && date && slot ? placeLine({ providerId: provider.providerId, date, slot, mode }, provider.name, today) : null

  function chooseDoctor(next: string) {
    setError(null)
    if (next !== providerId) {
      const chosen = getProviderById(getState(), next)
      const strip = getDoctorDateStrip(getState(), next, now)
      setProviderId(next)
      setDate(strip.find((day) => day.state === 'open')?.date ?? null)
      setSlot(null)
      const offered = chosen ? modesFor(chosen) : (['In person'] as ConsultMode[])
      setMode(offered.includes(was!.mode) ? was!.mode : offered[0])
    }
  }

  function move() {
    if (!providerId || !date || !slot || !by) return
    setError(null)
    try {
      const result = rescheduleAppointment({ appointmentId: was!.appointmentId, providerId, date, slot, mode, by, note })
      // A fee difference is paid at the billing counter, not here: its bill is
      // printed for the patient to take there.
      if (result.differenceBill) printBill(result.differenceBill.paymentId)
      setDone(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      if (/slot/i.test(message)) {
        setSlot(null)
      }
    }
  }

  function moneyLine(): string {
    if (!provider) return ''
    const name = provider.name
    if (difference < 0) return `${name}'s fee is ${formatRupees(-difference)} less than the ${formatRupees(feePaid)} paid — a move is not refunded.`
    if (difference === 0) return 'Same fee — nothing to pay.'
    if (by === 'Doctor') return `${name}'s fee is ${formatRupees(difference)} more — the hospital absorbs it, as the doctor is unavailable.`
    if (by === 'Patient') return `${name}'s fee is ${formatRupees(difference)} more than the ${formatRupees(feePaid)} paid — the patient pays the difference at the billing counter.`
    return `${name}'s fee is ${formatRupees(difference)} more — it is charged only if the patient asked for the move.`
  }

  const confirmBar = (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <SummaryItem label="Patient" value={patient ? `${patient.name} · ${patient.uhid}` : null} />
        <SummaryItem label="Was" value={placeLine(wasPlace, wasProvider.name, today)} />
        <SummaryItem label="Now" value={nowPlace} />
      </dl>
      <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Who can't make the booked time?</legend>
          <span className="text-xs font-medium text-ink-muted" aria-hidden="true">
            Who can't make the booked time?
          </span>
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border-soft bg-surface-2 p-1" role="radiogroup" aria-label="Who can't make the booked time">
            {(['Patient', 'Doctor'] as UnavailableParty[]).map((party) => (
              <button
                key={party}
                type="button"
                role="radio"
                aria-checked={by === party}
                onClick={() => setBy(party)}
                className={cn(
                  'focus-ring min-h-11 rounded-lg px-3.5 text-sm font-medium transition-colors',
                  by === party ? 'bg-surface-1 text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                {party === 'Patient' ? 'The patient' : 'The doctor'}
              </button>
            ))}
          </div>
        </fieldset>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional) — e.g. patient travelling, doctor in surgery"
          aria-label="Note (optional)"
          maxLength={120}
          className={inputClass}
        />
        <Button size="lg" disabled={!ready} onClick={move}>
          <CalendarCheck2 className="h-4 w-4" strokeWidth={1.75} />
          {charge > 0 ? `Reschedule & print ${formatRupees(charge)} bill` : 'Reschedule'}
        </Button>
      </div>
      <p className={cn('text-xs', charge > 0 ? 'font-medium text-warning-fg' : 'text-ink-muted')}>
        {provider ? moneyLine() : 'Choose the doctor and time, and who can\'t make the booked time, to confirm.'}
      </p>
    </div>
  )

  return sheet(
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:h-full lg:grid-cols-2 lg:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Top-left · Patient — fixed by the booking */}
      <Quadrant step={1} title="Patient" done summary={patient ? `${patient.name} · ${patient.uhid}` : undefined}>
        <div className="flex flex-col gap-3">
          {patient ? (
            <div className="rounded-xl border border-primary-200 dark:border-primary-500/35 bg-primary-50 px-4 py-3">
              <p className="truncate text-base font-semibold text-ink">{patient.name}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {patient.uhid}
                {patient.age ? ` · ${patient.age} ${patient.sex}` : ''}
                {patient.mobile ? ` · ${patient.mobile}` : ''}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">Was</p>
            <p className="mt-0.5 font-semibold text-ink">{placeLine(wasPlace, wasProvider.name, today)}</p>
            <p className="text-xs text-ink-muted">
              {was.appointmentId.toUpperCase()} · {formatRupees(feePaid)} paid
            </p>
          </div>
        </div>
      </Quadrant>

      {/* Top-right · Department — a move stays in the booking's department */}
      <Quadrant step={2} title="Department" done summary={was.department}>
        <div className="flex items-center gap-3 rounded-xl border border-primary-600 bg-primary-50 px-3 py-3">
          <Stethoscope className="h-5 w-5 shrink-0 text-primary-text" strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{was.department}</span>
            <span className="block text-xs text-ink-muted">A booking moves within its department.</span>
          </span>
        </div>
      </Quadrant>

      {/* Bottom-left · Doctor */}
      <Quadrant step={3} title="Doctor" done={Boolean(provider)} summary={provider ? `${provider.name} · ${formatRupees(provider.consultationFee)}` : undefined}>
        <DoctorChoiceList
          suggestions={suggestions}
          selectedId={providerId}
          onChoose={chooseDoctor}
          today={today}
          marker={(s) => (s.provider.providerId === was.providerId ? <Badge tone="info">Current</Badge> : null)}
          note={(s) => {
            const diff = s.provider.consultationFee - feePaid
            if (diff === 0) return null
            return (
              <span className={cn('mt-0.5 block text-xs', diff > 0 ? 'text-warning-fg' : 'text-ink-muted')}>
                {diff > 0 ? `${formatRupees(diff)} more — charged if the patient asks for this doctor` : `${formatRupees(-diff)} less — not refunded`}
              </span>
            )
          }}
        />
      </Quadrant>

      {/* Bottom-right · Time */}
      <Quadrant
        step={4}
        title="Time"
        done={timeDone}
        summary={date && slot ? `${relativeDayLabel(date, today)} ${formatTime(slot)}${mode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined}
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
                      aria-pressed={option === mode}
                      onClick={() => setMode(option)}
                      className={cn(
                        'focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors',
                        option === mode ? 'bg-surface-1 text-ink shadow-card' : 'text-ink-muted hover:text-ink',
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
                <DateStrip
                  days={dateStrip}
                  selected={date}
                  onSelect={(next) => {
                    setDate(next)
                    setSlot(null)
                  }}
                  today={today}
                />
                <SlotBoard
                  entries={slotEntries}
                  selectedSlot={slot}
                  currentAppointmentId={was.appointmentId}
                  onSelect={(next) => {
                    setError(null)
                    setSlot(next)
                  }}
                  emptyMessage="No session on this day."
                />
              </>
            ) : (
              <p className="text-sm text-ink-muted">No open time with this doctor in the next two weeks — choose another doctor.</p>
            )}
          </div>
        )}
      </Quadrant>
    </div>,
    confirmBar,
  )
}
