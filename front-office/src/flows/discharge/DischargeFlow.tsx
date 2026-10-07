import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard, LogOut, Pencil, Printer } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { Quadrant, Waiting } from '../../components/flow/Quadrant'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { WardIcon } from '../../components/ui/WardIcon'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getState } from '../../domain/store'
import { getActiveGuestPasses, getPatientById, getPaymentById } from '../../domain/selectors'
import { getAdmissionById, previewDischargeBill } from '../../domain/admissionSelectors'
import { getCurrentAdmissionForPatient } from '../../domain/patientSelectors'
import { dischargeAdmission, repriceAdmissionBill } from '../../domain/admissionActions'
import { sendToBillingCounter } from '../../domain/billingCounter'
import { todayKey } from '../../domain/time'
import { BILL_STATUS_LABEL, BILL_STATUS_TONE, billNumberFor, billServicesSummary, formatRupees } from '../../utils/billing'
import { formatClock } from '../../utils/format'
import { formatDateKey } from '../../utils/dates'
import { cn } from '../../utils/cn'
import { DISCHARGE_TYPES } from '../../types/admission'
import type { Admission, DischargeType } from '../../types/admission'
import type { Payment } from '../../types/payment'
import type { Patient } from '../../types/patient'
import type { FlowProps } from '../registry'
import { inputClass } from '../../utils/formClasses'

const TYPE_LABEL: Record<DischargeType, string> = {
  'Normal Discharge': 'Normal',
  'Discharge Against Medical Advice': 'Against advice',
  Transfer: 'Transfer',
  Death: 'Death',
}


function isCritical(ward: string | null): boolean {
  return ward === 'ICU' || ward === 'Emergency'
}

function payerOf(admission: Admission): string {
  if (admission.paymentType === 'Self Pay') return 'Self pay'
  return [admission.insuranceProvider ?? admission.paymentType, admission.policyNumber].filter(Boolean).join(' · ')
}

interface Discharged {
  admission: Admission
  bill: Payment | null
  days: number
  passIds: string[]
}

/**
 * Discharge, over the page it was opened from, laid out like Schedule
 * Appointment: one full-screen page — the patient (and their stay) top-left,
 * the final bill top-right, how the patient is leaving along the bottom. The
 * bill is re-priced to today and sent to the billing counter until it is paid
 * (an insured stay is settled by the insurer); then "Patient Discharged" and
 * the bed is free.
 */
export function DischargeFlow({ params, onClose }: FlowProps) {
  const navigate = useNavigate()
  const now = useNow(30000)
  const opened = useStoreValue(getAdmissionById, params.admission ?? '')
  const [patientId, setPatientId] = useState(params.uhid ?? opened?.patientId ?? '')
  const [picking, setPicking] = useState(false)
  const patient = useStoreValue(getPatientById, patientId)
  const current = useStoreValue(getCurrentAdmissionForPatient, patientId)
  const admission = current?.status === 'Admitted' ? current : null
  const preview = useStoreValue(previewDischargeBill, admission?.admissionId ?? '', now)
  const passes = useStoreValue(getActiveGuestPasses, patientId)

  const [dischargeType, setDischargeType] = useState<DischargeType>('Normal Discharge')
  const [remarks, setRemarks] = useState('')
  const [done, setDone] = useState<Discharged | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showPatientSearch = !patient || picking
  const selfPay = admission?.paymentType === 'Self Pay'

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setPicking(false)
    setDischargeType('Normal Discharge')
    setRemarks('')
    setError(null)
  }

  // The stay is re-priced to this moment, then the final bill goes to the
  // billing counter (or the insurer) — Care Entry takes no money. Discharge
  // opens once the counter records the payment.
  const [sentBillId, setSentBillId] = useState<string | null>(null)
  function sendFinalBill() {
    if (!admission) return
    const bill = repriceAdmissionBill(admission.admissionId, now)
    sendToBillingCounter(bill.paymentId)
    setSentBillId(bill.paymentId)
  }

  function discharge() {
    if (!admission || !preview) return
    setError(null)
    try {
      const result = dischargeAdmission(admission.admissionId, { dischargeType, remarks })
      const bill = result.paymentId ? getPaymentById(getState(), result.paymentId) : null
      setDone({ admission: result, bill, days: preview.days, passIds: passes.map((pass) => pass.passId) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  if (done) {
    const { admission: left, bill, days, passIds } = done
    return (
      <FlowSheet title="Discharge" subtitle={subtitle} icon={LogOut} iconTone="info" onClose={onClose} size="full">
        {/* Full screen like the discharge page itself, with the confirmation centred. */}
        <div className="flex min-h-full items-center justify-center py-6">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 px-6 shadow-card">
        <AckCard
          title="Patient Discharged"
          icon={LogOut}
          onDone={onClose}
          action={
            bill ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/payments/${bill.paymentId}/receipt`, { replace: true, state: { autoPrint: true } })}
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
                Print final bill
              </Button>
            ) : undefined
          }
        >
          <p className="text-base font-semibold text-ink">
            {left.wardLabel} · {left.bedNumber} is free
          </p>
          <p>
            {left.admissionNumber} · Day {days} · {TYPE_LABEL[left.dischargeType ?? 'Normal Discharge']}
          </p>
          {bill ? <p>Final bill {formatRupees(bill.totalAmount)} · settled</p> : null}
          {passIds.length > 0 ? <p>Guest pass {passIds.join(', ')} returned</p> : null}
        </AckCard>
          </div>
        </div>
      </FlowSheet>
    )
  }

  const canDischarge = Boolean(admission && preview?.canDischarge)

  return (
    <FlowSheet title="Discharge" subtitle={subtitle} icon={LogOut} iconTone="info" onClose={onClose} size="full">
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto]">
        {/* Top-left · Patient, with the stay */}
        <Quadrant step={1} title="Patient" done={Boolean(patient)} summary={patient ? `${patient.name} · ${patient.uhid}` : undefined} allowOverflow>
          <div className="flex flex-col gap-3">
            {showPatientSearch ? (
              <div className="flex flex-col gap-2">
                <PatientSearch
                  mode="pick"
                  scope="inpatients"
                  onPick={choosePatient}
                  autoFocus
                  placeholder="Search an admitted patient by name, mobile or UHID"
                />
                {patient ? (
                  <button type="button" onClick={() => setPicking(false)} className="self-start text-xs font-semibold text-primary-text hover:underline">
                    Keep {patient.name}
                  </button>
                ) : null}
              </div>
            ) : patient ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-primary-200 dark:border-primary-500/35 bg-primary-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{patient.name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {patient.uhid}
                    {patient.age ? ` · ${patient.age} ${patient.sex}` : ''}
                    {patient.mobile ? ` · ${patient.mobile}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Change
                </Button>
              </div>
            ) : null}

            {patient && !showPatientSearch && !admission ? (
              <Alert tone="warning">
                {current
                  ? `${patient.name}’s admission is still waiting for a bed — there is nothing to discharge.`
                  : `${patient.name} is not admitted — there is nothing to discharge.`}
              </Alert>
            ) : null}
            {patient && admission && preview ? <StaySummary admission={admission} days={preview.days} /> : null}
          </div>
        </Quadrant>

        {/* Top-right · Final bill — paid down to nothing before the patient leaves */}
        <Quadrant
          step={2}
          title="Final bill"
          done={Boolean(preview?.canDischarge)}
          summary={preview ? (preview.canDischarge ? `${formatRupees(preview.total)} · payment received` : `${formatRupees(preview.balance)} due`) : undefined}
        >
          {!admission || !preview ? (
            <Waiting>Choose an admitted patient to see the final bill.</Waiting>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="divide-y divide-border-soft rounded-xl border border-border">
                {preview.items.map((item) => (
                  <BillLine key={item.code} label={item.description} value={formatRupees(item.amount)} />
                ))}
                <BillLine label="Total" value={formatRupees(preview.total)} strong />
                {preview.paid > 0 ? <BillLine label="Paid so far" value={`− ${formatRupees(preview.paid)}`} /> : null}
              </div>

              {preview.canDischarge ? (
                <p className="text-sm font-medium text-success-fg">Payment received — nothing is due on this stay.</p>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-warning-fg/25 bg-warning-bg/40 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{formatRupees(preview.balance)} still due</span>
                    <Badge tone={BILL_STATUS_TONE[preview.billStatus]}>{BILL_STATUS_LABEL[preview.billStatus]}</Badge>
                  </div>
                  {sentBillId ? (
                    <p className="text-sm text-ink-muted">
                      Final bill sent to {selfPay ? 'the billing counter' : (admission.insuranceProvider ?? admission.paymentType)} — discharge opens once the
                      payment is received.
                    </p>
                  ) : (
                    <Button onClick={sendFinalBill}>
                      Send final bill to {selfPay ? 'the billing counter' : (admission.insuranceProvider ?? admission.paymentType)}
                    </Button>
                  )}
                </div>
              )}

              {preview.otherDues.length > 0 ? (
                <div className="rounded-xl bg-surface-2 px-4 py-3">
                  <p className="text-xs font-semibold text-ink-muted">Other bills due — not part of this stay</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {preview.otherDues.map((bill) => (
                      <li key={bill.paymentId} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-ink">
                          {billNumberFor(bill)} · {billServicesSummary(bill)}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">{formatRupees(bill.balance)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-ink-subtle">They don’t hold up the discharge — the patient pays them at the billing counter.</p>
                </div>
              ) : null}
            </div>
          )}
        </Quadrant>

        {/* Bottom · Discharge — how the patient is leaving, across the full width */}
        <div className="lg:col-span-2 lg:flex lg:flex-col">
          <Quadrant step={3} title="Discharge" done={false} summary={admission ? TYPE_LABEL[dischargeType] : undefined}>
            {!admission || !preview ? (
              <Waiting>Choose an admitted patient to discharge.</Waiting>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <div role="radiogroup" aria-label="Discharge type" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DISCHARGE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={dischargeType === type}
                        title={type}
                        onClick={() => setDischargeType(type)}
                        className={cn(
                          'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                          dischargeType === type
                            ? 'border-primary-600 bg-primary-50 text-primary-text'
                            : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2',
                        )}
                      >
                        {TYPE_LABEL[type]}
                      </button>
                    ))}
                  </div>
                  <input
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Remarks (optional)"
                    aria-label="Discharge remarks"
                    className={inputClass}
                  />
                  <Button size="lg" disabled={!canDischarge} onClick={discharge}>
                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                    {canDischarge ? 'Discharge' : 'Discharge — once the final bill is paid'}
                  </Button>
                </div>
                {passes.length > 0 ? (
                  <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
                    <IdCard className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    Collect guest pass {passes.map((pass) => pass.passId).join(', ')} — it is returned with the discharge.
                  </p>
                ) : null}
                {error ? <Alert tone="critical">{error}</Alert> : null}
              </div>
            )}
          </Quadrant>
        </div>
      </div>
    </FlowSheet>
  )
}

/** Where the patient is, since when, under whom and who pays. */
function StaySummary({ admission, days }: { admission: Admission; days: number }) {
  const since = admission.admittedAt ?? admission.createdAt
  return (
    <section aria-label="Stay" className="rounded-xl border border-border-soft bg-surface-2 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <WardIcon ward={admission.wardLabel} className={cn('h-4 w-4', isCritical(admission.wardLabel) ? 'text-critical-fg' : 'text-primary-text')} />
        {admission.wardLabel} · {admission.bedNumber}
        <span className="font-normal text-ink-muted">· Day {days}</span>
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <Fact label="IP no." value={admission.admissionNumber} />
        <Fact label="Admitted" value={`${formatDateKey(todayKey(new Date(since)))} · ${formatClock(since)}`} />
        <Fact label="Doctor" value={`${admission.doctorName} · ${admission.department}`} />
        <Fact label="Payer" value={payerOf(admission)} />
      </dl>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-16 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  )
}

function BillLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-2.5 text-sm', strong && 'font-semibold')}>
      <span className="text-ink">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  )
}
