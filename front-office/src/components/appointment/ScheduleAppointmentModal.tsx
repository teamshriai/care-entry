import { useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Alert } from '../ui/Alert'
import { Avatar } from '../ui/Avatar'
import { Modal } from '../ui/Modal'
import { SlotBoard } from '../clinician/SlotBoard'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { useToast } from '../../hooks/useToast'
import { usePatientContext } from '../../hooks/usePatientContext'
import { getDoctorRows, getSlotBoard, getPatientSearchResults } from '../../domain/selectors'
import { bookAppointment, createPaymentBill } from '../../domain/actions'
import { todayKey } from '../../domain/time'
import { initialsOf } from '../../utils/format'
import { formatDateKey } from '../../utils/dates'
import { cn } from '../../utils/cn'
import { REGISTRATION_FEE } from '../../utils/billing'
import { appointmentStatusLabel, doctorStatusLabel } from '../../utils/appointment'
import type { Appointment } from '../../types/appointment'
import type { DoctorRow } from '../../types/doctor'
import type { Payment, PaymentItem } from '../../types/payment'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

const UNBOOKABLE_STATUSES = ['Inactive', 'Not scheduled']

/** Listed doctors are still shown when they can't take a booking (on leave,
 *  nothing left open) so the reason is visible — this is what decides
 *  whether one can actually be chosen. */
function isBookable(row: DoctorRow): boolean {
  return row.status !== 'On leave' && row.openSlotCount > 0
}

/**
 * The portal's single appointment-booking experience. Date, doctor, time and
 * patient are all chosen and changed inside this one dialog — there is no
 * separate calendar, doctor-availability or slot-picking page behind it.
 *
 * Whatever the entry point already knows is passed in and pre-filled; the
 * rest defaults to the first available doctor/time for the date, so the form
 * is complete on arrival and every field is still changeable:
 *   - doctor-first (Doctor Availability, Doctor Directory/Profile) supplies
 *     providerId (+ usually slot), and keeps that doctor fixed
 *   - patient-first (Find Patient, Patient Profile) supplies only the
 *     patient, via the shared PatientContext
 *
 * Booking raises the linked bill in the same step; payment is collected
 * later at the Billing Counter, never here.
 */
export function ScheduleAppointmentModal({
  open,
  providerId = null,
  slot = null,
  date: initialDate,
  onClose,
  onDone,
}: {
  open: boolean
  /** Pre-selected doctor. When supplied, the doctor stays fixed (the entry
   *  point already chose them); when not, it is pickable in the dialog. */
  providerId?: string | null
  slot?: string | null
  date?: string
  onClose: () => void
  onDone: () => void
}) {
  const { notify } = useToast()
  const { patient, setPatient } = usePatientContext()
  const now = useNow(15000)
  // The dialog owns the date: changing it here must not require a host page
  // to hold scheduling state on its behalf.
  const [date, setDate] = useState(initialDate ?? todayKey())
  const dateLabel = formatDateKey(date)
  const allowDoctorChange = !providerId
  // The doctor the modal opened with is a starting point too — the
  // patient-first entry opens with none and picks one here.
  const doctorRows = useStoreValue(getDoctorRows, now, date)
  const pickableRows = doctorRows.filter((row) => !UNBOOKABLE_STATUSES.includes(row.status))
  const [selectedProviderId, setSelectedProviderId] = useState(
    providerId ?? pickableRows.find(isBookable)?.provider.providerId ?? null,
  )
  const fallbackRow = pickableRows.find(isBookable) ?? null
  const selectedRow = pickableRows.find((row) => row.provider.providerId === selectedProviderId) ?? null
  // A doctor chosen for one date may not work on another, so the choice is
  // re-validated against whatever date is currently selected rather than
  // trusted — falling back to whoever IS available, so the form always
  // holds a bookable doctor rather than going blank.
  const activeRow = selectedRow && isBookable(selectedRow) ? selectedRow : fallbackRow
  const provider = activeRow?.provider ?? null
  const slotEntries = useStoreValue(getSlotBoard, provider?.providerId ?? '__none__', now, date)
  const firstOpenSlot = slotEntries.find((entry) => entry.status === 'available')?.slot ?? null

  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [includeRegistration, setIncludeRegistration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<Appointment | null>(null)
  const [confirmedBill, setConfirmedBill] = useState<Payment | null>(null)
  // Captured at booking time: booking the doctor's last open slot makes the
  // live lookup treat them as no longer bookable, which must not blank out
  // the name on the confirmation.
  const [confirmedDoctor, setConfirmedDoctor] = useState<string | null>(null)
  // The slot the modal opened with is only the starting point — "Change"
  // lets the user pick a different one without leaving this modal, so the
  // in-progress selection has to live here, not just be the immutable prop.
  const [selectedSlot, setSelectedSlot] = useState(slot ?? firstOpenSlot)
  // Both entry points open straight on the booking form. Whatever the entry
  // point didn't supply is defaulted to the first available doctor/time for
  // the date, so the form is complete on arrival — no picker step to get
  // through first — and every field is still changeable from there.
  const [view, setView] = useState<'form' | 'date' | 'doctor' | 'slot'>('form')

  const searchResults = useStoreValue(getPatientSearchResults, query)
  // A slot belongs to one doctor on one date; if the current pick no longer
  // holds (doctor or date changed), fall through to that doctor's next open
  // time rather than leaving the field empty.
  const slotHolds = Boolean(selectedSlot) && slotEntries.some((entry) => entry.slot === selectedSlot && entry.status === 'available')
  const activeSlot = slotHolds ? selectedSlot : firstOpenSlot

  // Booking now always raises the bill in the same step — Registration Fee
  // (optional) plus the selected doctor's own consultation fee, the exact
  // same charge convention Care Entry uses (utils/billing.REGISTRATION_FEE,
  // provider.consultationFee). No new fee values, no second fee model.
  const billItems: PaymentItem[] = []
  if (includeRegistration) billItems.push(REGISTRATION_FEE)
  if (provider) billItems.push({ code: 'CONS-GEN', description: 'Consultation Fee', amount: provider.consultationFee })
  const billTotal = billItems.reduce((sum, item) => sum + item.amount, 0)

  function handleClose() {
    setQuery('')
    setReason('')
    setIncludeRegistration(false)
    setError(null)
    setConfirmed(null)
    setConfirmedBill(null)
    setConfirmedDoctor(null)
    setView('form')
    onClose()
  }

  function handleDone() {
    setQuery('')
    setReason('')
    setIncludeRegistration(false)
    setError(null)
    setConfirmed(null)
    setConfirmedBill(null)
    setConfirmedDoctor(null)
    setView('form')
    onDone()
  }

  // Changing the doctor always drops the previous doctor's slot — it belongs
  // to their schedule, not this one — and goes straight on to picking a time
  // for the new doctor.
  // Returns to the booking form: the slot is dropped because it belonged to
  // the previous doctor, and the derivation above immediately fills in the
  // new doctor's next open time.
  function selectDoctor(nextProviderId: string) {
    setSelectedProviderId(nextProviderId)
    setSelectedSlot(null)
    setError(null)
    setView('form')
  }

  // A slot belongs to a date as much as to a doctor, so moving the date
  // drops it; who is working (and their open times) re-derives from the
  // same selectors for the new date.
  function changeDate(nextDate: string) {
    if (!nextDate) return
    setSelectedSlot(null)
    setError(null)
    setDate(nextDate)
    setView('form')
  }

  async function handleConfirm() {
    if (!provider || !activeSlot || !patient || billItems.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const appointment = await Promise.resolve().then(() =>
        bookAppointment({
          patientId: patient.patientId,
          providerId: provider.providerId,
          department: provider.department,
          slot: activeSlot,
          date,
          reason: reason.trim() || undefined,
        }),
      )
      // Reuses the existing billing source of truth exactly as Care Entry
      // does — a bill linked to this one appointment, nothing new invented.
      const bill = createPaymentBill({
        patientId: patient.patientId,
        items: billItems,
        appointmentId: appointment.appointmentId,
      })
      setConfirmed(appointment)
      setConfirmedBill(bill)
      setConfirmedDoctor(provider.name)
      notify('Appointment booked — payment pending', {
        detail: `${patient.name} · ${provider.name} · ${dateLabel} ${activeSlot} · ${rupees(bill.totalAmount)}`,
      })
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'This slot is no longer available. Please select another time.'
      setError(message)
      notify('Scheduling failed', { tone: 'error', detail: message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  if (confirmed) {
    return (
      <Modal open={open} onClose={handleDone} title="Appointment Created" className="max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stable-bg">
              <CheckCircle2 className="h-5 w-5 text-stable" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Appointment No. {confirmed.appointmentId.toUpperCase()}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {patient?.name} with {confirmedDoctor} on {dateLabel} at {confirmed.slot}.
              </p>
            </div>
          </div>

          {confirmedBill ? (
            <div className="divide-y divide-border-soft rounded-md border border-border">
              {confirmedBill.items.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{rupees(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-ink">Total</span>
                <span className="text-base font-semibold tabular-nums text-ink">{rupees(confirmedBill.totalAmount)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Appointment status</span>
            <Badge status={confirmed.status}>{appointmentStatusLabel(confirmed.status)}</Badge>
          </div>

          <div className="flex justify-end border-t border-border-soft pt-4">
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (view === 'date') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Select a Date"
        description={patient ? `For ${patient.name}` : undefined}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Date
            <input
              type="date"
              value={date}
              min={todayKey()}
              onChange={(event) => changeDate(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            />
          </label>
          <p className="text-xs text-ink-faint">
            Changing the date refreshes which doctors are working and their open times. A doctor who isn&apos;t
            available on the new date has to be picked again.
          </p>
          <div className="flex justify-end border-t border-border-soft pt-4">
            <Button variant="secondary" onClick={() => setView('form')}>
              Back
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (view === 'doctor') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Select a Doctor"
        description={patient ? `For ${patient.name}` : dateLabel}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          {pickableRows.length === 0 ? (
            <p className="text-sm text-ink-muted">No doctors have a session configured on this date.</p>
          ) : (
            <div className="divide-y divide-border-soft overflow-hidden rounded-md border border-border">
              {pickableRows.map((row) => {
                // On leave or nothing left open — shown so the state is
                // visible, never offered as a choice.
                const unavailable = row.status === 'On leave' || row.openSlotCount === 0
                return (
                  <button
                    key={row.provider.providerId}
                    type="button"
                    disabled={unavailable}
                    onClick={() => selectDoctor(row.provider.providerId)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors',
                      unavailable ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface-muted',
                      row.provider.providerId === selectedProviderId && 'bg-brand-50',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar initials={initialsOf(row.provider.name)} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{row.provider.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {row.provider.specialty} · {rupees(row.provider.consultationFee)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {row.status === 'On leave' ? null : (
                        <span className="text-xs tabular-nums text-ink-faint">{row.openSlotCount} open</span>
                      )}
                      <Badge status={row.status}>{doctorStatusLabel(row.status)}</Badge>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex justify-end border-t border-border-soft pt-4">
            <Button variant="secondary" onClick={() => setView('form')}>
              Back
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (view === 'slot') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Select a Time"
        description={`${provider?.name ?? 'Doctor'} · ${dateLabel}`}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <SlotBoard
            entries={slotEntries}
            selectedSlot={activeSlot}
            onSelect={(newSlot) => {
              setSelectedSlot(newSlot)
              setView('form')
            }}
            emptyMessage="No slots configured for this doctor on this date."
          />
          <div className="flex justify-end border-t border-border-soft pt-4">
            <Button variant="secondary" onClick={() => setView('form')}>
              Back
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Schedule Appointment" className="max-w-md">
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="critical">{error}</Alert> : null}
        {!provider ? (
          <Alert tone="warning">No doctors are working on this date. Choose another date.</Alert>
        ) : !activeSlot ? (
          <Alert tone="warning">
            {provider.name} has no open times left on this date. Choose another doctor or date.
          </Alert>
        ) : null}
        <dl className="space-y-2 text-sm">
          <Row
            label="Date"
            value={dateLabel}
            action={
              <Button size="sm" variant="ghost" onClick={() => setView('date')}>
                Change
              </Button>
            }
          />
          <Row
            label="Doctor"
            value={provider?.name ?? 'Not selected'}
            action={
              // Doctor-first bookings keep their doctor fixed — unless a date
              // change moved them off that doctor, which has to be recoverable.
              allowDoctorChange || provider?.providerId !== providerId ? (
                <Button size="sm" variant="ghost" onClick={() => setView('doctor')}>
                  Change
                </Button>
              ) : undefined
            }
          />
          <Row label="Specialty" value={provider?.specialty ?? '—'} />
          <Row
            label="Time"
            value={activeSlot ?? 'Not selected'}
            action={
              <Button size="sm" variant="ghost" disabled={!provider} onClick={() => setView('slot')}>
                Change
              </Button>
            }
          />
        </dl>

        <div className="border-t border-border-soft pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Select Patient</p>
          {patient ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar initials={initialsOf(patient.name)} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-ink">{patient.name}</p>
                  <p className="text-xs text-ink-muted">
                    {patient.uhid} · {patient.age} yrs · {patient.sex}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>
                Change
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, UHID or phone"
                  className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              {query.trim().length >= 2 ? (
                <div className="mt-2 divide-y divide-border-soft overflow-hidden rounded-md border border-border">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-ink-muted">No patient found.</p>
                  ) : (
                    searchResults.slice(0, 4).map(({ patient: result, matchedOn }) => (
                      <button
                        key={result.patientId}
                        type="button"
                        onClick={() => {
                          setPatient(result)
                          setQuery('')
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{result.name}</span>
                          <span className="block truncate text-xs text-ink-muted">
                            {result.uhid} · {result.age} yrs · {result.sex}
                          </span>
                        </span>
                        <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-primary-text">{matchedOn}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {patient ? (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Reason for visit (optional)
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            />
          </label>
        ) : null}

        {patient && provider ? (
          <div className="border-t border-border-soft pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Billing</p>
            <label className="mb-2 flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeRegistration}
                onChange={(event) => setIncludeRegistration(event.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand-600"
              />
              Add Registration Fee ({rupees(REGISTRATION_FEE.amount)})
            </label>
            <div className="divide-y divide-border-soft rounded-md border border-border">
              {billItems.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{rupees(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-ink">Total</span>
                <span className="text-base font-semibold tabular-nums text-ink">{rupees(billTotal)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              The patient pays this at the Billing Counter — no payment is collected here.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!patient || !provider || !activeSlot || billItems.length === 0 || submitting}
          >
            {submitting ? 'Scheduling…' : 'Schedule Appointment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <dd className="min-w-0 truncate text-right text-sm font-medium text-ink" title={value}>
          {value}
        </dd>
        {action}
      </div>
    </div>
  )
}
