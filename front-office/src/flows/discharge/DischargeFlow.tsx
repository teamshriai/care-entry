import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard, LogOut, Printer } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { StepSection } from '../../components/flow/StepSection'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
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
import { collectPayment, recordFailedPayment } from '../../domain/actions'
import { todayKey } from '../../domain/time'
import { BILL_STATUS_TONE, billNumberFor, billServicesSummary, formatRupees } from '../../utils/billing'
import { formatClock } from '../../utils/format'
import { formatDateKey } from '../../utils/dates'
import { cn } from '../../utils/cn'
import { DISCHARGE_TYPES } from '../../types/admission'
import type { Admission, DischargeType } from '../../types/admission'
import type { Payment, PaymentMethod } from '../../types/payment'
import type { Patient } from '../../types/patient'
import type { FlowProps } from '../registry'

const TYPE_LABEL: Record<DischargeType, string> = {
  'Normal Discharge': 'Normal',
  'Discharge Against Medical Advice': 'Against advice',
  Transfer: 'Transfer',
  Death: 'Death',
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600 placeholder:text-ink-subtle'

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
 * Discharge, over the page it was opened from: the stay, its final bill
 * re-priced to today, the payment until nothing is left (an insured stay is
 * settled by the insurer), how the patient is leaving — then "Patient
 * Discharged" and the bed is free.
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
  const [reviewingBill, setReviewingBill] = useState(false)
  const [done, setDone] = useState<Discharged | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patientDone = Boolean(patient) && !picking
  const selfPay = admission?.paymentType === 'Self Pay'

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setPicking(false)
    setReviewingBill(false)
    setDischargeType('Normal Discharge')
    setRemarks('')
    setError(null)
  }

  // The stay is re-priced to this moment before money is taken, so what is
  // paid is the bill the patient leaves with.
  function pay(method: PaymentMethod, amount: number) {
    if (!admission) return
    const bill = repriceAdmissionBill(admission.admissionId, now)
    collectPayment({ paymentId: bill.paymentId, amount, method })
  }

  function fail(method: PaymentMethod, amount: number, reason: string) {
    if (!admission) return
    const bill = repriceAdmissionBill(admission.admissionId, now)
    recordFailedPayment({ paymentId: bill.paymentId, amount, method, reason })
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
      <FlowSheet title="Discharge" subtitle={subtitle} icon={LogOut} iconTone="info" onClose={onClose}>
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
      </FlowSheet>
    )
  }

  return (
    <FlowSheet title="Discharge" subtitle={subtitle} icon={LogOut} iconTone="info" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {/* 1 · Patient */}
        <StepSection
          step={1}
          title="Patient"
          status={patientDone ? 'done' : 'active'}
          summary={patient ? `${patient.name} · ${patient.uhid}` : undefined}
          onEdit={() => setPicking(true)}
        >
          <PatientSearch
            mode="pick"
            scope="inpatients"
            onPick={choosePatient}
            autoFocus
            placeholder="Search an admitted patient by name, mobile or UHID"
          />
        </StepSection>

        {patientDone && !admission ? (
          <Alert tone="warning">
            {current
              ? `${patient?.name}’s admission is still waiting for a bed — there is nothing to discharge.`
              : `${patient?.name} is not admitted — there is nothing to discharge.`}
          </Alert>
        ) : null}

        {patientDone && admission && preview ? (
          <>
            <StaySummary admission={admission} days={preview.days} />

            {/* 2 · Final bill — paid down to nothing before the patient leaves */}
            <StepSection
              step={2}
              title="Final bill"
              status={preview.canDischarge && !reviewingBill ? 'done' : 'active'}
              summary={`${formatRupees(preview.total)} · paid in full`}
              onEdit={() => setReviewingBill(true)}
            >
              <div className="flex flex-col gap-4">
                <div className="divide-y divide-border-soft rounded-xl border border-border">
                  {preview.items.map((item) => (
                    <BillLine key={item.code} label={item.description} value={formatRupees(item.amount)} />
                  ))}
                  <BillLine label="Total" value={formatRupees(preview.total)} strong />
                  {preview.paid > 0 ? <BillLine label="Paid so far" value={`− ${formatRupees(preview.paid)}`} /> : null}
                </div>

                {preview.canDischarge ? (
                  <p className="text-sm font-medium text-stable">Paid in full — nothing is due on this stay.</p>
                ) : (
                  <PaymentPanel
                    key={preview.balance}
                    amount={preview.balance}
                    status={<Badge tone={BILL_STATUS_TONE[preview.billStatus]}>{preview.billStatus}</Badge>}
                    allowPartial
                    methods={selfPay ? ['UPI', 'Card'] : ['Insurance/TPA', 'UPI', 'Card']}
                    payer={selfPay ? undefined : (admission.insuranceProvider ?? admission.paymentType)}
                    onPay={pay}
                    onFail={fail}
                  />
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
                    <p className="mt-1.5 text-xs text-ink-subtle">They don’t hold up the discharge — collect them from Billing.</p>
                  </div>
                ) : null}
              </div>
            </StepSection>

            {/* 3 · How the patient is leaving */}
            <StepSection step={3} title="Discharge" status="active">
              <div className="flex flex-col gap-3">
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
                        'rounded-lg border py-2 text-sm font-medium transition-colors',
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
                {passes.length > 0 ? (
                  <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
                    <IdCard className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    Collect guest pass {passes.map((pass) => pass.passId).join(', ')} — it is returned with the discharge.
                  </p>
                ) : null}
                {error ? <Alert tone="critical">{error}</Alert> : null}
                <Button size="lg" disabled={!preview.canDischarge} onClick={discharge}>
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  {preview.canDischarge ? 'Discharge' : `Collect ${formatRupees(preview.balance)} to discharge`}
                </Button>
              </div>
            </StepSection>
          </>
        ) : (
          <>
            <StepSection step={2} title="Final bill" status="locked" />
            <StepSection step={3} title="Discharge" status="locked" />
          </>
        )}
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
        <WardIcon ward={admission.wardLabel} className={cn('h-4 w-4', isCritical(admission.wardLabel) ? 'text-critical' : 'text-primary-text')} />
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
