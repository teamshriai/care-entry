import { useState } from 'react'
import { BedDouble, ShieldCheck } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { StepSection } from '../../components/flow/StepSection'
import type { StepStatus } from '../../components/flow/StepSection'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { MobileInput } from '../../components/ui/MobileInput'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { WardIcon } from '../../components/ui/WardIcon'
import { useStoreValue } from '../../hooks/useStore'
import { getState } from '../../domain/store'
import { getPatientById, getProviders } from '../../domain/selectors'
import { getBedsForWard, getFirstFreeBed, getWardSummaries } from '../../domain/admissionSelectors'
import { getCurrentAdmissionForPatient, getTodaysEncounterDoctor } from '../../domain/patientSelectors'
import { admitPatient } from '../../domain/admissionActions'
import { DAILY_BED_CHARGE, admissionBillItems, formatRupees, sumItems } from '../../utils/billing'
import { isValidMobile } from '../../utils/phone'
import { cn } from '../../utils/cn'
import { ADMISSION_TYPES, ATTENDANT_RELATIONSHIPS, PAYMENT_TYPES, REFERRAL_SOURCES } from '../../types/admission'
import type { Admission, AdmissionType, AttendantRelationship, PaymentType, ReferralSource, Ward } from '../../types/admission'
import type { Payment, PaymentMethod } from '../../types/payment'
import type { Patient } from '../../types/patient'
import type { FlowProps } from '../registry'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600 placeholder:text-ink-subtle'

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
 * Admit, over the page it was opened from: where (ward → the first free bed,
 * changeable), the admission details, the first-day bill and — for a
 * self-pay patient — its payment, then "Patient Admitted". The profile
 * shows the inpatient tag the moment it closes.
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
  const [detailsDone, setDetailsDone] = useState(false)
  const [editing, setEditing] = useState<'patient' | 'ward' | 'details' | null>(null)
  const [done, setDone] = useState<{ admission: Admission; bill: Payment; method: PaymentMethod | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doctor = providers.find((p) => p.providerId === details.doctorId) ?? null
  const selfPay = details.paymentType === 'Self Pay'
  const billItems = bed ? admissionBillItems(bed.roomType, 1) : []

  const patientDone = Boolean(patient) && editing !== 'patient'
  const wardDone = patientDone && !alreadyAdmitted && Boolean(bed && bed.status === 'Available') && editing !== 'ward'
  const detailsStepDone = wardDone && detailsDone && detailsComplete(details) && editing !== 'details'

  function statusOf(finished: boolean, reachable: boolean): StepStatus {
    return finished ? 'done' : reachable ? 'active' : 'locked'
  }

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    setDetails(startingDetails(next.patientId))
    setDetailsDone(false)
    setEditing(null)
  }

  function chooseWard(next: Ward) {
    setWard(next)
    setBedId(getFirstFreeBed(getState(), next)?.bedId ?? null)
    // ICU and Emergency admissions are emergencies unless the desk says otherwise.
    if ((next === 'ICU' || next === 'Emergency') && details.admissionType === 'Elective') {
      setDetails((d) => ({ ...d, admissionType: 'Emergency' }))
    }
    setEditing(null)
  }

  function update(patch: Partial<Details>) {
    setDetails((d) => ({ ...d, ...patch }))
  }

  function admit(method: PaymentMethod | null) {
    if (!patient || !bed) return
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
        paymentMethod: method ?? undefined,
      })
      setDone({ ...result, method })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Thrown inside the payment panel it shows there; outside, show it here.
      if (method) throw err
      setError(message)
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'

  if (done) {
    const { admission, bill, method } = done
    return (
      <FlowSheet title="Admit" subtitle={subtitle} icon={BedDouble} iconTone="info" onClose={onClose}>
        <AckCard title="Patient Admitted" icon={BedDouble} onDone={onClose}>
          <p className="text-base font-semibold text-ink">
            {admission.wardLabel} · {admission.bedNumber}
          </p>
          <p>
            {admission.admissionNumber} · {admission.doctorName} · Day 1
          </p>
          <p>
            {method
              ? `${formatRupees(bill.paidAmount)} paid · ${method}`
              : `Billed to ${admission.insuranceProvider ?? admission.paymentType} — settled at discharge`}
          </p>
        </AckCard>
      </FlowSheet>
    )
  }

  return (
    <FlowSheet title="Admit" subtitle={subtitle} icon={BedDouble} iconTone="info" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {/* 1 · Patient */}
        <StepSection
          step={1}
          title="Patient"
          status={statusOf(patientDone, true)}
          summary={patient ? `${patient.name} · ${patient.uhid}` : undefined}
          onEdit={() => setEditing('patient')}
        >
          <PatientSearch mode="pick" onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile or UHID" />
        </StepSection>

        {alreadyAdmitted ? (
          <Alert tone="warning">
            <strong>{patient?.name} is already admitted</strong> — {alreadyAdmitted.wardLabel} · {alreadyAdmitted.bedNumber} (
            {alreadyAdmitted.admissionNumber}).
          </Alert>
        ) : current ? (
          <Alert tone="info">Admitting the request already waiting for a bed ({current.admissionNumber}).</Alert>
        ) : null}

        {/* 2 · Ward and bed */}
        <StepSection
          step={2}
          title="Ward & bed"
          status={statusOf(wardDone, patientDone && !alreadyAdmitted)}
          summary={bed ? `${bed.ward} · ${bed.bedNumber} · ${formatRupees(DAILY_BED_CHARGE[bed.roomType])}/day` : undefined}
          onEdit={() => setEditing('ward')}
        >
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
                      className={cn('h-4.5 w-4.5', w.ward === 'ICU' || w.ward === 'Emergency' ? 'text-critical' : 'text-primary-text')}
                    />
                    {w.ward}
                  </span>
                  <span className={cn('text-xs font-medium', full ? 'text-critical' : 'text-stable')}>
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
                      onClick={() => {
                        setBedId(b.bedId)
                        setEditing(null)
                      }}
                      title={`${b.bedNumber} · ${b.status}`}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                        b.bedId === bedId
                          ? 'border-primary-600 bg-primary-600 text-on-primary'
                          : free
                            ? 'border-stable-border bg-stable-bg text-ink hover:border-primary-600'
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
        </StepSection>

        {/* 3 · Admission details */}
        <StepSection
          step={3}
          title="Details"
          status={statusOf(detailsStepDone, wardDone)}
          summary={
            doctor ? `${doctor.name} · ${details.admissionType} · ${selfPay ? 'Self pay' : details.insuranceProvider || details.paymentType}` : undefined
          }
          onEdit={() => setEditing('details')}
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
                    'rounded-lg border py-2 text-sm font-medium transition-colors',
                    details.admissionType === type
                      ? type === 'Emergency'
                        ? 'border-critical bg-critical-bg text-critical'
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
                    'rounded-lg border py-2 text-sm font-medium transition-colors',
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
            <Button
              disabled={!detailsComplete(details)}
              onClick={() => {
                setDetailsDone(true)
                setEditing(null)
              }}
            >
              Continue
            </Button>
          </div>
        </StepSection>

        {/* 4 · Bill — paid now by a self-pay patient, billed to the payer otherwise */}
        <StepSection step={4} title={selfPay ? 'Bill & payment' : 'Bill'} status={detailsStepDone ? 'active' : 'locked'}>
          <div className="flex flex-col gap-4">
            {error ? <Alert tone="critical">{error}</Alert> : null}
            <div className="divide-y divide-border-soft rounded-xl border border-border">
              {billItems.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </div>
              ))}
            </div>
            {selfPay ? (
              <PaymentPanel
                key={`${bedId}|${details.paymentType}`}
                amount={sumItems(billItems)}
                status={<Badge tone="warning">First day</Badge>}
                onPay={(method) => admit(method)}
              />
            ) : (
              <Button size="lg" onClick={() => admit(null)}>
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                Admit — bill {details.insuranceProvider || details.paymentType}
              </Button>
            )}
            <p className="text-xs text-ink-muted">The bed charge accrues daily; the final bill is settled at discharge.</p>
          </div>
        </StepSection>
      </div>
    </FlowSheet>
  )
}
