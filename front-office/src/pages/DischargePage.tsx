import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, Search } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { getPatientById } from '../domain/selectors'
import { getAdmissionBilling, getCurrentAdmissions } from '../domain/admissionSelectors'
import { dischargeAdmission } from '../domain/admissionActions'
import { todayKey } from '../domain/time'
import { initialsOf } from '../utils/format'
import { IP_PAYMENT_METHODS, formatRupees } from '../utils/billing'
import { DISCHARGE_TYPES } from '../types/admission'
import type { Admission, DischargeType } from '../types/admission'
import type { PaymentMethod } from '../types/payment'

/** How long the confirmation shows before the Discharge form is reset for the next patient. */
const SUCCESS_REDIRECT_MS = 2000

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-ink-faint'

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** A date from the date input as a timestamp: today keeps the current time of day,
 *  any other day is taken at midday. */
function dischargeTimestamp(dateKey: string): number {
  if (dateKey === todayKey()) return Date.now()
  return new Date(`${dateKey}T12:00:00`).getTime()
}

// IP Admission → Discharge: its own workflow (it stays on this page after a discharge). Discharging uses the shared admission
// and bed records: the admission becomes Discharged (history kept) and its bed goes
// back to Available, so Ward Status reflects it immediately.
export function DischargePage() {
  const location = useLocation()
  const { notify } = useToast()

  const admitted = useStoreValue(getCurrentAdmissions)
  const [query, setQuery] = useState('')
  // The admission detail page can send the user here with a patient already chosen.
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { admissionId?: string } | null)?.admissionId ?? null,
  )
  const [dischargeDate, setDischargeDate] = useState(todayKey())
  const [dischargeType, setDischargeType] = useState<DischargeType | ''>('')
  const [remarks, setRemarks] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const selected = admitted.find((a) => a.admissionId === selectedId) ?? null
  const patient = useStoreValue(getPatientById, selected?.patientId ?? '')

  // The bill is worked out as of the chosen discharge date (days stayed drive the bed charge).
  const asOf = useMemo(() => dischargeTimestamp(dischargeDate), [dischargeDate])
  const billing = useStoreValue(getAdmissionBilling, selected?.admissionId ?? '', asOf)
  const pending = billing?.pending ?? 0

  const term = query.trim().toLowerCase()
  const matches = admitted.filter(
    (a) =>
      term.length === 0 ||
      a.patientName.toLowerCase().includes(term) ||
      a.patientId.toLowerCase().includes(term) ||
      a.admissionNumber.toLowerCase().includes(term),
  )

  // After the confirmation, stay on this page and reset the form so another admitted
  // patient can be discharged straight away. The cleanup cancels the timer if the user
  // leaves first.
  useEffect(() => {
    if (!done) return undefined
    const timer = window.setTimeout(() => {
      setDone(false)
      setSelectedId(null)
      setQuery('')
      setDischargeDate(todayKey())
      setDischargeType('')
      setRemarks('')
      setPaymentMethod('')
      setError(null)
    }, SUCCESS_REDIRECT_MS)
    return () => window.clearTimeout(timer)
  }, [done])

  function choose(admission: Admission) {
    setSelectedId(admission.admissionId)
    setError(null)
  }

  const needsPayment = pending > 0
  const canSubmit =
    Boolean(selected) && Boolean(dischargeType) && dischargeDate.length > 0 && (!needsPayment || Boolean(paymentMethod))

  function handleDischarge() {
    if (!selected || !dischargeType) return
    setError(null)
    try {
      dischargeAdmission(
        selected.admissionId,
        {
        dischargedAt: dischargeTimestamp(dischargeDate),
        dischargeType,
        remarks,
      },
      needsPayment ? { method: paymentMethod as PaymentMethod, amount: pending } : undefined,
      )
      setDone(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not discharge', { tone: 'error', detail: message })
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md" role="status">
          <CardBody className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stable-bg">
              <CheckCircle2 className="h-6 w-6 text-stable" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="text-xl font-semibold text-ink">Patient Discharged Successfully</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Discharge"
        subtitle="Select an admitted patient, record the discharge, and release their bed."
        illustration={<ClipboardCheck className="h-6 w-6" strokeWidth={1.75} />}
        illustrationTone="purple"
      />

      <div className="grid grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:px-8 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Admitted patient" subtitle={`${admitted.length} currently admitted`} />
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search admitted patients by name or UHID"
                aria-label="Search admitted patients"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            {matches.length === 0 ? (
              <p className="px-1 py-2 text-sm text-ink-muted">
                {admitted.length === 0 ? 'No patients are currently admitted.' : 'No admitted patient matches that search.'}
              </p>
            ) : (
              <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border">
                {matches.map((a) => (
                  <li key={a.admissionId}>
                    <button
                      type="button"
                      onClick={() => choose(a)}
                      aria-pressed={a.admissionId === selectedId}
                      className={
                        a.admissionId === selectedId
                          ? 'flex w-full items-center gap-2.5 bg-primary-50 px-3 py-2.5 text-left'
                          : 'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2'
                      }
                    >
                      <Avatar initials={initialsOf(a.patientName)} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{a.patientName}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {a.patientId} · {a.wardLabel} · {a.bedNumber}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {!selected ? (
            <Card>
              <EmptyState
                icon={ClipboardCheck}
                title="Select an admitted patient"
                description="A discharge always belongs to a patient who is currently admitted."
              />
            </Card>
          ) : (
            <>
              <Card className="min-w-0">
                <CardHeader title="Admission information" />
                <CardBody>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <Info label="Patient Name" value={selected.patientName} />
                    <Info label="UHID" value={selected.patientId} />
                    <Info label="Age / Gender" value={patient ? `${patient.age ?? '—'} · ${patient.sex}` : '—'} />
                    <Info label="Doctor" value={selected.doctorName} />
                    <Info label="Ward" value={selected.wardLabel ?? '—'} />
                    <Info label="Bed" value={selected.bedNumber ?? '—'} />
                    <Info label="Admission Date" value={formatDate(selected.admittedAt ?? selected.createdAt)} />
                    <Info label="Admission Type" value={selected.admissionType} />
                  </dl>
                </CardBody>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Discharge details" />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Discharge Date">
                    <input
                      type="date"
                      value={dischargeDate}
                      max={todayKey()}
                      onChange={(e) => setDischargeDate(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Discharge Type">
                    <select
                      value={dischargeType}
                      onChange={(e) => setDischargeType(e.target.value as DischargeType | '')}
                      className={inputClass}
                    >
                      <option value="">Select discharge type</option>
                      {DISCHARGE_TYPES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Discharge Remarks">
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        className={`${inputClass} h-auto py-2`}
                      />
                    </Field>
                  </div>
                </CardBody>
              </Card>

              {billing ? (
                <Card className="min-w-0">
                  <CardHeader
                    title="Billing summary"
                    subtitle={`Admission charge + bed/room charge for ${billing.days} ${billing.days === 1 ? 'day' : 'days'}`}
                  />
                  <CardBody className="flex flex-col gap-4">
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                      <Info label="Total Bill" value={formatRupees(billing.total)} />
                      <Info label="Amount Paid" value={formatRupees(billing.paid)} />
                      <div className={pending > 0 ? 'rounded-lg border border-warning-border bg-warning-bg px-3 py-2' : 'rounded-lg border border-border-soft bg-surface-2 px-3 py-2'}>
                        <dt className="text-xs text-ink-muted">Pending Amount</dt>
                        <dd className={pending > 0 ? 'mt-0.5 text-xl font-semibold text-warning-fg' : 'mt-0.5 text-xl font-semibold text-ink'}>
                          {formatRupees(pending)}
                        </dd>
                      </div>
                    </dl>
                  </CardBody>
                </Card>
              ) : null}

              {needsPayment ? (
                <Card className="min-w-0">
                  <CardHeader title="Payment" subtitle="The pending amount is collected now, before the patient is discharged" />
                  <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Amount to Pay">
                      <input value={formatRupees(pending)} readOnly className={`${inputClass} font-semibold`} />
                    </Field>
                    <Field label="Payment Method">
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}
                        className={inputClass}
                      >
                        <option value="">Select payment method</option>
                        {IP_PAYMENT_METHODS.map((method) => (
                          <option key={method}>{method}</option>
                        ))}
                      </select>
                    </Field>
                    {!paymentMethod ? (
                      <p className="text-xs font-medium text-critical-fg sm:col-span-2" aria-live="polite">
                        Select a payment method.
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              ) : null}

              {error ? <Alert tone="critical">{error}</Alert> : null}

              <div className="flex justify-end">
                <Button disabled={!canSubmit} onClick={handleDischarge}>
                  {needsPayment ? 'Discharge' : 'Discharge Patient'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
      {label}
      {children}
    </label>
  )
}
