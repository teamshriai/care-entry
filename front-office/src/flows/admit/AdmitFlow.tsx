import { useState } from 'react'
import { BedDouble, Pencil, ShieldCheck } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { Quadrant, SummaryItem, Waiting } from '../../components/flow/Quadrant'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { sendToBillingCounter } from '../../domain/billingCounter'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { MobileInput } from '../../components/ui/MobileInput'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { WardIcon } from '../../components/ui/WardIcon'
import { useStoreValue } from '../../hooks/useStore'
import { getState } from '../../domain/store'
import { getPatientById, getProviders } from '../../domain/selectors'
import { getBedsForWard, getFirstFreeBed, getWardSummaries } from '../../domain/admissionSelectors'
import { getCurrentAdmissionForPatient, getTodaysEncounterDoctor } from '../../domain/patientSelectors'
import { admitPatient } from '../../domain/admissionActions'
import { DAILY_BED_CHARGE, admissionBillItems, formatRupees } from '../../utils/billing'
import { isValidMobile } from '../../utils/phone'
import { cn } from '../../utils/cn'
import { ADMISSION_TYPES, ATTENDANT_RELATIONSHIPS, PAYMENT_TYPES, REFERRAL_SOURCES } from '../../types/admission'
import type { Admission, AdmissionType, AttendantRelationship, PaymentType, ReferralSource, Ward } from '../../types/admission'
import type { Payment } from '../../types/payment'
import type { Patient } from '../../types/patient'
import type { FlowProps } from '../registry'
import { inputClass } from '../../utils/formClasses'


interface Details {
  doctorId: string
  admissionType: AdmissionType
  reason: string
  referralSource: ReferralSource
  attendantName: string
  attendantRelationship: AttendantRelationship
  attendantPhone: string
  paymentType: PaymentType
  insuranceProvider: string
  policyNumber: string
}

/** Details start from what the desk already knows: a request waiting for a
 *  bed, or the doctor the patient saw today. */
function startingDetails(patientId: string): Details {
  const state = getState()
  const waiting = getCurrentAdmissionForPatient(state, patientId)
  const todaysDoctor = getTodaysEncounterDoctor(state, patientId)
  return {
    doctorId: waiting?.doctorId ?? todaysDoctor ?? '',
    admissionType: waiting?.admissionType ?? 'Elective',
    reason: waiting?.reason ?? '',
    referralSource: waiting?.referralSource ?? (todaysDoctor ? 'Outpatient' : 'Walk-in'),
    attendantName: waiting?.attendant.name ?? '',
    attendantRelationship: waiting?.attendant.relationship ?? 'Spouse',
    attendantPhone: waiting?.attendant.phone.replace(/[^0-9]/g, '').slice(-10) ?? '',
    paymentType: waiting?.paymentType ?? 'Self Pay',
    insuranceProvider: waiting?.insuranceProvider ?? '',
    policyNumber: waiting?.policyNumber ?? '',
  }
}

function detailsComplete(d: Details): boolean {
  return (
    Boolean(d.doctorId) &&
    d.reason.trim().length > 0 &&
    d.attendantName.trim().length > 0 &&
    isValidMobile(d.attendantPhone) &&
    (d.paymentType === 'Self Pay' || d.paymentType === 'Corporate' || d.insuranceProvider.trim().length > 0)
  )
}

/**
 * Admit, over the page it was opened from, laid out like Schedule Appointment:
 * one full-screen page — patient top-left, ward & bed top-right, the admission
 * details bottom-left, the first-day bill bottom-right — each editable at any
 * time, with the confirmation along the bottom. A self-pay patient's bill
 * goes to the billing counter; then "Patient Admitted". The profile shows the
 * inpatient tag the moment it closes.
 */
export function AdmitFlow({ params, onClose }: FlowProps) {
  const [patientId, setPatientId] = useState(params.uhid ?? '')
  const patient = useStoreValue(getPatientById, patientId)
  const current = useStoreValue(getCurrentAdmissionForPatient, patientId)
  const alreadyAdmitted = current?.status === 'Admitted' ? current : null

  const wards = useStoreValue(getWardSummaries)
  const providers = useStoreValue(getProviders)
  const [ward, setWard] = useState<Ward | null>((params.ward as Ward | undefined) ?? null)
  const [bedId, setBedId] = useState<string | null>(params.bed ?? null)
  const beds = useStoreValue(getBedsForWard, ward ?? 'General Ward')
  const bed = beds.find((b) => b.bedId === bedId) ?? null

  const [details, setDetails] = useState<Details>(() => startingDetails(params.uhid ?? ''))
  const [changingPatient, setChangingPatient] = useState(false)
  const [done, setDone] = useState<{ admission: Admission; bill: Payment } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doctor = providers.find((p) => p.providerId === details.doctorId) ?? null
  const selfPay = details.paymentType === 'Self Pay'
  const billItems = bed ? admissionBillItems(bed.roomType, 1) : []

  const wardDone = !alreadyAdmitted && Boolean(bed && bed.status === 'Available')
  const ready = Boolean(patient) && wardDone && detailsComplete(details)

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setDetails(startingDetails(next.patientId))
    setChangingPatient(false)
  }

  function chooseWard(next: Ward) {
    setWard(next)
    setBedId(getFirstFreeBed(getState(), next)?.bedId ?? null)
    // ICU and Emergency admissions are emergencies unless the desk says otherwise.
    if ((next === 'ICU' || next === 'Emergency') && details.admissionType === 'Elective') {
      setDetails((d) => ({ ...d, admissionType: 'Emergency' }))
    }
  }

  function update(patch: Partial<Details>) {
    setDetails((d) => ({ ...d, ...patch }))
  }

  function admit() {
    if (!patient || !bed || !ready) return
    setError(null)
    try {
      const result = admitPatient({
        patientId: patient.patientId,
        doctorId: details.doctorId,
        admissionType: details.admissionType,
        reason: details.reason,
        referralSource: details.referralSource,
        bedId: bed.bedId,
        attendant: {
          name: details.attendantName.trim(),
          relationship: details.attendantRelationship,
          phone: details.attendantPhone,
          address: null,
        },
        paymentType: details.paymentType,
        insuranceProvider: details.insuranceProvider,
        policyNumber: details.policyNumber,
      })
      // A self-pay patient pays the first day at the billing counter; an
      // insured stay's bill goes to its payer at discharge.
      if (result.admission.paymentType === 'Self Pay') sendToBillingCounter(result.bill.paymentId)
      setDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  if (done) {
    const { admission, bill } = done
    return (
      <FlowSheet title="Admit" subtitle={subtitle} icon={BedDouble} iconTone="info" onClose={onClose} size="full">
        {/* Full screen like the admit page itself, with the confirmation centred. */}
        <div className="flex min-h-full items-center justify-center py-6">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-1 px-6 shadow-card">
            <AckCard title="Patient Admitted" icon={BedDouble} onDone={onClose} durationMs={9000}>
              <p className="text-base font-semibold text-ink">
                {admission.wardLabel} · {admission.bedNumber}
              </p>
              <p>
                {admission.admissionNumber} · {admission.doctorName} · Day 1
              </p>
              {admission.paymentType === 'Self Pay' ? (
                <BillAtCounter paymentId={bill.paymentId} className="mt-1 w-full" />
              ) : (
                <p>Billed to {admission.insuranceProvider ?? admission.paymentType} — settled at discharge</p>
              )}
            </AckCard>
          </div>
        </div>
      </FlowSheet>
    )
  }

  const showPatientSearch = !patient || changingPatient
  const billTotal = billItems.reduce((sum, item) => sum + item.amount, 0)
  const bedSummary = bed ? `${bed.ward} · ${bed.bedNumber} · ${formatRupees(DAILY_BED_CHARGE[bed.roomType])}/day` : undefined

  const confirmBar = (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <SummaryItem label="Patient" value={patient ? `${patient.name} · ${patient.uhid}` : null} />
          <SummaryItem label="Ward & bed" value={bed && wardDone ? `${bed.ward} · ${bed.bedNumber}` : null} />
          <SummaryItem label="Doctor" value={doctor ? doctor.name : null} />
          <SummaryItem label="Payer" value={selfPay ? 'Self pay' : details.insuranceProvider || details.paymentType} />
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
          <div className="text-right">
            <p className="text-xs text-ink-muted">First-day bill</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{formatRupees(billTotal)}</p>
          </div>
          <Button size="lg" onClick={admit} disabled={!ready}>
            {selfPay ? <BedDouble className="h-4 w-4" strokeWidth={1.75} /> : <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
            {selfPay ? 'Admit & send bill' : `Admit — bill ${details.insuranceProvider || details.paymentType}`}
          </Button>
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        {ready
          ? selfPay
            ? 'The first-day bill goes to the billing counter. The bed charge accrues daily; the final bill is settled at discharge.'
            : 'The bill goes to the payer and is settled at discharge.'
          : 'Choose the patient, a free bed and complete the details to admit.'}
      </p>
    </div>
  )

  return (
    <FlowSheet title="Admit" subtitle={subtitle} icon={BedDouble} iconTone="info" onClose={onClose} size="full" footer={confirmBar}>
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
        {/* Top-left · Patient */}
        <Quadrant step={1} title="Patient" done={Boolean(patient)} summary={patient ? `${patient.name} · ${patient.uhid}` : undefined} allowOverflow>
          <div className="flex flex-col gap-3">
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
              <div className="flex items-start justify-between gap-3 rounded-xl border border-primary-200 dark:border-primary-500/35 bg-primary-50 px-4 py-3">
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
            {alreadyAdmitted ? (
              <Alert tone="warning">
                <strong>{patient?.name} is already admitted</strong> — {alreadyAdmitted.wardLabel} · {alreadyAdmitted.bedNumber} (
                {alreadyAdmitted.admissionNumber}).
              </Alert>
            ) : current ? (
              <Alert tone="info">Admitting the request already waiting for a bed ({current.admissionNumber}).</Alert>
            ) : null}
          </div>
        </Quadrant>

        {/* Top-right · Ward & bed */}
        <Quadrant step={2} title="Ward & bed" done={wardDone} summary={bedSummary}>
          {!patient ? (
            <Waiting>Choose the patient to pick a ward and bed.</Waiting>
          ) : alreadyAdmitted ? (
            <Waiting>This patient is already admitted.</Waiting>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {wards.map((w) => {
                  const roomType = w.beds[0]?.roomType ?? 'General'
                  const full = w.available === 0
                  return (
                    <button
                      key={w.ward}
                      type="button"
                      disabled={full}
                      aria-pressed={w.ward === ward}
                      onClick={() => chooseWard(w.ward)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors',
                        w.ward === ward ? 'border-primary-600 bg-primary-50' : 'border-border bg-surface-1 hover:bg-surface-2',
                        full && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <WardIcon
                          ward={w.ward}
                          className={cn('h-4.5 w-4.5', w.ward === 'ICU' || w.ward === 'Emergency' ? 'text-critical-fg' : 'text-primary-text')}
                        />
                        {w.ward}
                      </span>
                      <span className={cn('text-xs font-medium', full ? 'text-critical-fg' : 'text-success-fg')}>
                        {full ? 'Full' : `${w.available} free`} of {w.total}
                      </span>
                      <span className="text-xs text-ink-muted">{formatRupees(DAILY_BED_CHARGE[roomType])}/day</span>
                    </button>
                  )
                })}
              </div>
              {ward ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-ink-muted">Bed — the first free one is chosen; tap another to change</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bed">
                    {beds.map((b) => {
                      const free = b.status === 'Available'
                      return (
                        <button
                          key={b.bedId}
                          type="button"
                          disabled={!free}
                          aria-pressed={b.bedId === bedId}
                          onClick={() => setBedId(b.bedId)}
                          title={`${b.bedNumber} · ${b.status}`}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                            b.bedId === bedId
                              ? 'border-primary-600 bg-primary-600 text-on-primary'
                              : free
                                ? 'border-success-fg/25 bg-success-bg text-ink hover:border-primary-600'
                                : 'cursor-not-allowed border-border-soft bg-surface-2 text-ink-subtle line-through',
                          )}
                        >
                          {b.bedNumber}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Quadrant>

        {/* Bottom-left · Details */}
        <Quadrant
          step={3}
          title="Details"
          done={detailsComplete(details)}
          summary={
            doctor ? `${doctor.name} · ${details.admissionType} · ${selfPay ? 'Self pay' : details.insuranceProvider || details.paymentType}` : undefined
          }
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                Admitting doctor
                <select value={details.doctorId} onChange={(e) => update({ doctorId: e.target.value })} className={inputClass}>
                  <option value="">Choose…</option>
                  {providers
                    .filter((p) => p.status === 'Active')
                    .map((p) => (
                      <option key={p.providerId} value={p.providerId}>
                        {p.name} · {p.department}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                Referred from
                <select value={details.referralSource} onChange={(e) => update({ referralSource: e.target.value as ReferralSource })} className={inputClass}>
                  {REFERRAL_SOURCES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div role="radiogroup" aria-label="Admission type" className="grid grid-cols-3 gap-2">
              {ADMISSION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={details.admissionType === type}
                  onClick={() => update({ admissionType: type })}
                  className={cn(
                    'focus-ring min-h-11 min-w-0 rounded-lg border px-1 py-2 text-sm font-medium break-words transition-colors',
                    details.admissionType === type
                      ? type === 'Emergency'
                        ? 'border-critical-fg bg-critical-bg text-critical-fg'
                        : 'border-primary-600 bg-primary-50 text-primary-text'
                      : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <input value={details.reason} onChange={(e) => update({ reason: e.target.value })} placeholder="Reason for admission" aria-label="Reason for admission" className={inputClass} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
              <input value={details.attendantName} onChange={(e) => update({ attendantName: e.target.value })} placeholder="Attendant name" aria-label="Attendant name" className={inputClass} />
              <select
                value={details.attendantRelationship}
                onChange={(e) => update({ attendantRelationship: e.target.value as AttendantRelationship })}
                aria-label="Attendant relationship"
                className={inputClass}
              >
                {ATTENDANT_RELATIONSHIPS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <MobileInput value={details.attendantPhone} onValueChange={(value) => update({ attendantPhone: value })} placeholder="Attendant mobile (10 digits)" className={inputClass} />
            <div role="radiogroup" aria-label="Payer" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={details.paymentType === type}
                  onClick={() => update({ paymentType: type })}
                  className={cn(
                    'focus-ring min-h-11 min-w-0 rounded-lg border px-1 py-2 text-sm font-medium break-words transition-colors',
                    details.paymentType === type ? 'border-primary-600 bg-primary-50 text-primary-text' : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            {!selfPay ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={details.insuranceProvider}
                  onChange={(e) => update({ insuranceProvider: e.target.value })}
                  placeholder={details.paymentType === 'Corporate' ? 'Company (optional)' : 'Insurer / TPA'}
                  aria-label="Insurer or TPA"
                  className={inputClass}
                />
                <input value={details.policyNumber} onChange={(e) => update({ policyNumber: e.target.value })} placeholder="Policy / member ID" aria-label="Policy or member ID" className={inputClass} />
              </div>
            ) : null}
          </div>
        </Quadrant>

        {/* Bottom-right · Bill — paid now by a self-pay patient, billed to the payer otherwise */}
        <Quadrant step={4} title="Bill" done={billItems.length > 0 && ready} summary={billItems.length ? formatRupees(billTotal) : undefined}>
          {billItems.length === 0 ? (
            <Waiting>Choose a bed to see the first-day bill.</Waiting>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="divide-y divide-border-soft rounded-xl border border-border">
                {billItems.map((item) => (
                  <div key={item.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink">{item.description}</span>
                    <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink">
                  <span>Total</span>
                  <span className="tabular-nums">{formatRupees(billTotal)}</span>
                </div>
              </div>
              <p className="text-xs text-ink-muted">
                {selfPay
                  ? 'Paid at the billing counter. The bed charge accrues daily; the final bill is settled at discharge.'
                  : `Billed to ${details.insuranceProvider || details.paymentType} — settled at discharge.`}
              </p>
            </div>
          )}
        </Quadrant>
      </div>
    </FlowSheet>
  )
}
