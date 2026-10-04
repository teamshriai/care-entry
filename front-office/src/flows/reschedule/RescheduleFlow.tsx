import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Building2, CalendarCheck2, CalendarClock, Video } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { StepSection } from '../../components/flow/StepSection'
import type { StepStatus } from '../../components/flow/StepSection'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { sendToBillingCounter } from '../../domain/billingCounter'
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

type StepKey = 'doctor' | 'time'

/** One line for a booking's place: doctor · day date · time · mode. */
function placeLine(place: BookingPlace, doctorName: string, today: string): string {
  return `${doctorName} · ${dayWithDate(place.date, today)} · ${place.slot}${place.mode === 'Teleconsult' ? ' · Teleconsult' : ''}`
}

/**
 * Reschedule: a confirmed booking moves to another time, or to another
 * doctor in the same department. Doctor → time → who can't make it, then
 * confirm. Moving never refunds; a patient who asks for a dearer doctor
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
  const [editing, setEditing] = useState<StepKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ appointment: Appointment; differenceBill: Payment | null } | null>(null)

  const suggestions = useStoreValue(getDoctorSuggestions, was?.department ?? '', now)
  const provider = useStoreValue(getProviderById, providerId ?? '')
  const dateStrip = useStoreValue(getDoctorDateStrip, providerId ?? '', now)
  const slotEntries = useStoreValue(getSlotBoard, providerId ?? '__none__', now, date ?? today)
  const modes = provider ? modesFor(provider) : (['In person'] as ConsultMode[])

  const subtitle = patient ? `${patient.name} · ${patient.uhid}` : 'Booking'
  const sheet = (body: ReactNode) => (
    <FlowSheet title="Reschedule" subtitle={subtitle} icon={CalendarClock} onClose={onClose}>
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
      <AckCard
        title="Appointment Rescheduled"
        icon={CalendarCheck2}
        onDone={onClose}
        durationMs={done.differenceBill ? 9000 : undefined}
      >
        <p className="text-base font-semibold text-ink">{movedDoctor}</p>
        <p>
          {dayWithDate(moved.date, today)} · {moved.slot}
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
      </AckCard>,
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

  const doctorDone = Boolean(provider) && editing !== 'doctor'
  const timeDone = doctorDone && Boolean(date && slot) && editing !== 'time'
  const statusOf = (finished: boolean, reachable: boolean): StepStatus => (finished ? 'done' : reachable ? 'active' : 'locked')

  const difference = provider ? provider.consultationFee - feePaid : 0
  const charge = difference > 0 && by === 'Patient' ? difference : 0
  const ready = timeDone && by !== null

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
    setEditing(null)
  }

  function move() {
    if (!providerId || !date || !slot || !by) return
    setError(null)
    try {
      const result = rescheduleAppointment({ appointmentId: was!.appointmentId, providerId, date, slot, mode, by, note })
      // A fee difference is paid at the billing counter, not here.
      if (result.differenceBill) sendToBillingCounter(result.differenceBill.paymentId)
      setDone(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      if (/slot/i.test(message)) {
        setSlot(null)
        setEditing('time')
      }
    }
  }

  function moneyLine(): string {
    if (!provider) return ''
    const name = provider.name
    if (difference < 0) return `${name}'s fee is ${formatRupees(-difference)} less than the ${formatRupees(feePaid)} paid — a move is not refunded.`
    if (difference === 0) return 'Same fee — nothing to pay.'
    if (by === 'Doctor') return `${name}'s fee is ${formatRupees(difference)} more — the hospital absorbs it, as the doctor is unavailable.`
    if (by === 'Patient') return `${name}'s fee is ${formatRupees(difference)} more than the ${formatRupees(feePaid)} paid — the difference is billed to the billing counter.`
    return `${name}'s fee is ${formatRupees(difference)} more — it is charged only if the patient asked for the move.`
  }

  return sheet(
    <div className="flex flex-col gap-3">
      {/* Where the booking is now */}
      <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">Was</p>
        <p className="mt-0.5 font-semibold text-ink">{placeLine(wasPlace, wasProvider.name, today)}</p>
        <p className="text-xs text-ink-muted">
          {was.appointmentId.toUpperCase()} · {formatRupees(feePaid)} paid
        </p>
      </div>

      {/* 1 · Doctor */}
      <StepSection
        step={1}
        title="Doctor"
        status={statusOf(doctorDone, true)}
        summary={provider ? `${provider.name} · ${formatRupees(provider.consultationFee)}` : undefined}
        onEdit={() => setEditing('doctor')}
      >
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
              <span className={cn('mt-0.5 block text-xs', diff > 0 ? 'text-warning' : 'text-ink-muted')}>
                {diff > 0 ? `${formatRupees(diff)} more — charged if the patient asks for this doctor` : `${formatRupees(-diff)} less — not refunded`}
              </span>
            )
          }}
        />
      </StepSection>

      {/* 2 · Time */}
      <StepSection
        step={2}
        title="Time"
        status={statusOf(timeDone, doctorDone)}
        summary={date && slot ? `${relativeDayLabel(date, today)} ${slot}${mode === 'Teleconsult' ? ' · Teleconsult' : ''}` : undefined}
        onEdit={() => setEditing('time')}
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
                    aria-pressed={option === mode}
                    onClick={() => setMode(option)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      option === mode ? 'bg-primary-600 text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
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
                  setSlot(next)
                  setEditing(null)
                }}
                emptyMessage="No session on this day."
              />
            </>
          ) : (
            <p className="text-sm text-ink-muted">No open time with this doctor in the next two weeks — choose another doctor.</p>
          )}
        </div>
      </StepSection>

      {/* 3 · Who can't make it, and confirm */}
      <StepSection step={3} title="Confirm" status={timeDone ? 'active' : 'locked'}>
        <div className="flex flex-col gap-4">
          {error ? <Alert tone="critical">{error}</Alert> : null}
          {provider && date && slot ? (
            <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <p className="text-ink-muted line-through decoration-ink-faint">{placeLine(wasPlace, wasProvider.name, today)}</p>
              <p className="flex items-start gap-1.5 font-semibold text-ink">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" strokeWidth={2} aria-hidden="true" />
                {placeLine({ providerId: provider.providerId, date, slot, mode }, provider.name, today)}
              </p>
            </div>
          ) : null}

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-ink-muted">Who can't make the booked time?</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who can't make the booked time">
              {(['Patient', 'Doctor'] as UnavailableParty[]).map((party) => (
                <button
                  key={party}
                  type="button"
                  role="radio"
                  aria-checked={by === party}
                  onClick={() => setBy(party)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    by === party ? 'border-primary-600 bg-primary-50 font-semibold text-ink' : 'border-border text-ink-muted hover:bg-surface-2',
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
            className="h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          />
          {provider ? <p className={cn('text-sm', charge > 0 ? 'font-medium text-warning' : 'text-ink-muted')}>{moneyLine()}</p> : null}

          <Button size="lg" disabled={!ready} onClick={move}>
            {charge > 0 ? `Reschedule & send ${formatRupees(charge)} bill to the billing counter` : 'Reschedule'}
          </Button>
        </div>
      </StepSection>
    </div>,
  )
}
