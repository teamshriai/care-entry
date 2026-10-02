import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus, Search } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { MobileInput } from '../components/ui/MobileInput'
import { MOBILE_ERROR, isValidMobile } from '../utils/phone'
import { ADMISSION_CHARGE, DAILY_BED_CHARGE, IP_PAYMENT_METHODS, formatRupees } from '../utils/billing'
import { Avatar } from '../components/ui/Avatar'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { getPatientSearchResults, getProviders } from '../domain/selectors'
import { getAvailableBeds } from '../domain/admissionSelectors'
import { admitPatient } from '../domain/admissionActions'
import { initialsOf } from '../utils/format'
import {
  ADMISSION_TYPES,
  ATTENDANT_RELATIONSHIPS,
  PAYMENT_TYPES,
  REFERRAL_SOURCES,
  WARDS,
} from '../types/admission'
import type { Admission, AdmissionType, AttendantRelationship, PaymentType, ReferralSource, Ward } from '../types/admission'
import type { Patient } from '../types/patient'
import type { PaymentMethod } from '../types/payment'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-ink-faint'

const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'General Surgery', 'Pediatrics', 'Obstetrics & Gynecology']

interface AdmissionDraft {
  admissionType: AdmissionType
  department: string
  doctorId: string
  reason: string
  referralSource: ReferralSource
  ward: Ward | ''
  bedId: string
  attendantName: string
  attendantRelationship: AttendantRelationship
  attendantPhone: string
  attendantAddress: string
  paymentType: PaymentType
  insuranceProvider: string
  policyNumber: string
  /** How the initial charges are paid (Cash / UPI / Card / Other). */
  paymentMethod: PaymentMethod | ''
}

const EMPTY_DRAFT: AdmissionDraft = {
  admissionType: 'Elective',
  department: DEPARTMENTS[0],
  doctorId: '',
  reason: '',
  referralSource: 'Walk-in',
  ward: '',
  bedId: '',
  attendantName: '',
  attendantRelationship: 'Spouse',
  attendantPhone: '',
  attendantAddress: '',
  paymentType: 'Self Pay',
  insuranceProvider: '',
  policyNumber: '',
  paymentMethod: '',
}

/** The admission workflow (the IP Admission → Admit Patient page).
 *  An admission can never be created without a patient — this form enforces
 *  that by gating the whole form behind patient selection, then walks
 *  through details -> bed -> attendant -> payment -> a review step before
 *  actually creating anything. */
export function AdmitPatientForm({
  onCancel,
  onAdmitted,
}: {
  onCancel: () => void
  onAdmitted: (admission: Admission) => void
}) {
  const { notify } = useToast()

  const [query, setQuery] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [draft, setDraft] = useState<AdmissionDraft>(EMPTY_DRAFT)
  const [phase, setPhase] = useState<'form' | 'review'>('form')
  const [error, setError] = useState<string | null>(null)

  const results = useStoreValue(getPatientSearchResults, query)
  const providers = useStoreValue(getProviders)
  const availableBeds = useStoreValue(getAvailableBeds)

  const doctor = providers.find((p) => p.providerId === draft.doctorId) ?? null
  const bedsForWard = useMemo(() => availableBeds.filter((b) => !draft.ward || b.ward === draft.ward), [availableBeds, draft.ward])
  const selectedBed = availableBeds.find((b) => b.bedId === draft.bedId) ?? null
  // Initial charges follow the chosen bed's room type (changing ward/bed updates them).
  const dailyCharge = selectedBed ? DAILY_BED_CHARGE[selectedBed.roomType] : 0
  const initialAmount = selectedBed ? ADMISSION_CHARGE + dailyCharge : 0

  function selectPatient(next: Patient) {
    setPatient(next)
    setQuery('')
    setDraft(EMPTY_DRAFT)
    setPhase('form')
    setError(null)
  }

  function update(patch: Partial<AdmissionDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const formValid =
    Boolean(draft.doctorId) &&
    draft.reason.trim().length > 0 &&
    Boolean(draft.bedId) &&
    Boolean(draft.paymentMethod) &&
    initialAmount > 0 &&
    draft.attendantName.trim().length > 0 &&
    isValidMobile(draft.attendantPhone) &&
    (draft.paymentType === 'Self Pay' || draft.paymentType === 'Corporate' || draft.insuranceProvider.trim().length > 0)

  function handleConfirm() {
    if (!patient || !selectedBed || !doctor) return
    setError(null)
    try {
      const admission = admitPatient({
        patientId: patient.patientId,
        patientName: patient.name,
        doctorId: doctor.providerId,
        department: draft.department,
        admissionType: draft.admissionType,
        reason: draft.reason,
        referralSource: draft.referralSource,
        bedId: selectedBed.bedId,
        attendant: {
          name: draft.attendantName,
          relationship: draft.attendantRelationship,
          phone: draft.attendantPhone,
          address: draft.attendantAddress.trim() || null,
        },
        paymentType: draft.paymentType,
        insuranceProvider: draft.paymentType === 'Self Pay' || draft.paymentType === 'Corporate' ? null : draft.insuranceProvider,
        policyNumber: draft.paymentType === 'Self Pay' || draft.paymentType === 'Corporate' ? null : draft.policyNumber,
        initialPayment: { method: draft.paymentMethod as PaymentMethod, amount: initialAmount },
      })
      notify('Patient admitted', {
        detail: `${admission.admissionNumber} · ${admission.bedNumber} · ${formatRupees(initialAmount)} paid`,
      })
      onAdmitted(admission)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not create admission', { tone: 'error', detail: message })
      setPhase('form')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Find patient" />
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, UHID, phone or ABHA"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            {query.trim().length >= 2 ? (
              <div className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border">
                {results.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-ink-muted">No patient found.</p>
                ) : (
                  results.slice(0, 6).map(({ patient: candidate, matchedOn }) => (
                    <button
                      key={candidate.patientId}
                      type="button"
                      onClick={() => selectPatient(candidate)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{candidate.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {candidate.uhid} · {candidate.mobile}
                        </span>
                      </span>
                      <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-primary-text">{matchedOn}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {patient ? (
              <div className="flex flex-col gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initialsOf(patient.name)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{patient.name}</p>
                    <p className="text-xs text-ink-muted">{patient.uhid}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <div>
                    Age/Sex: <span className="text-ink">{patient.age ?? '—'} · {patient.sex}</span>
                  </div>
                  <div>
                    Phone: <span className="text-ink">{patient.mobile}</span>
                  </div>
                </dl>
                <Button size="sm" variant="ghost" className="self-start" onClick={() => setPatient(null)}>
                  Change patient
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {!patient ? (
            <Card>
              <EmptyState icon={ClipboardPlus} title="Select a patient" description="An admission always belongs to a specific patient." />
            </Card>
          ) : phase === 'review' ? (
            <ReviewSection
              patient={patient}
              draft={draft}
              doctorName={doctor?.name ?? ''}
              bedLabel={selectedBed ? `${selectedBed.roomNumber} · ${selectedBed.bedNumber}` : '—'}
              initialAmount={initialAmount}
              error={error}
              onBack={() => setPhase('form')}
              onConfirm={handleConfirm}
            />
          ) : (
            <>
              <Card className="min-w-0">
                <CardHeader title="Admission Details" />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Admission Type">
                    <select value={draft.admissionType} onChange={(e) => update({ admissionType: e.target.value as AdmissionType })} className={inputClass}>
                      {ADMISSION_TYPES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department">
                    <select value={draft.department} onChange={(e) => update({ department: e.target.value })} className={inputClass}>
                      {DEPARTMENTS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Admitting Doctor">
                    <select value={draft.doctorId} onChange={(e) => update({ doctorId: e.target.value })} className={inputClass}>
                      <option value="">Select a doctor</option>
                      {providers.map((p) => (
                        <option key={p.providerId} value={p.providerId}>
                          {p.name} · {p.specialty}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Referral Source">
                    <select value={draft.referralSource} onChange={(e) => update({ referralSource: e.target.value as ReferralSource })} className={inputClass}>
                      {REFERRAL_SOURCES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Reason for Admission">
                      <input value={draft.reason} onChange={(e) => update({ reason: e.target.value })} className={inputClass} placeholder="e.g. Elective admission for observation" />
                    </Field>
                  </div>
                </CardBody>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Ward / Room / Bed" subtitle="Only available beds can be selected" />
                <CardBody className="flex flex-col gap-3">
                  <Field label="Ward">
                    <select
                      value={draft.ward}
                      onChange={(e) => update({ ward: e.target.value as Ward, bedId: '' })}
                      className={inputClass}
                    >
                      <option value="">Select a ward</option>
                      {WARDS.map((option) => {
                        const free = availableBeds.filter((b) => b.ward === option).length
                        return (
                          <option key={option} value={option}>
                            {option} — {free} {free === 1 ? 'bed' : 'beds'} available
                          </option>
                        )
                      })}
                    </select>
                  </Field>
                  {draft.ward ? (
                    bedsForWard.length === 0 ? (
                      <Alert tone="warning">No available beds in {draft.ward} right now.</Alert>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {bedsForWard.map((bed) => (
                          <button
                            key={bed.bedId}
                            type="button"
                            onClick={() => update({ bedId: bed.bedId })}
                            className={
                              bed.bedId === draft.bedId
                                ? 'rounded-lg border border-brand-600 bg-brand-600 px-3 py-2 text-left text-sm font-medium text-white'
                                : 'rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted'
                            }
                          >
                            <p className="font-medium">{bed.roomNumber}</p>
                            <p className="text-xs opacity-80">{bed.bedNumber} · {bed.roomType}</p>
                          </button>
                        ))}
                      </div>
                    )
                  ) : null}
                </CardBody>
              </Card>

              {selectedBed ? (
                <Card className="min-w-0">
                  <CardHeader title="Initial Charges" subtitle="Updates automatically when the ward or bed changes" />
                  <CardBody>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                      <ChargeRow label="Ward" value={selectedBed.ward} />
                      <ChargeRow label="Bed" value={selectedBed.bedNumber} />
                      <ChargeRow label="Bed/Room Type" value={selectedBed.roomType} />
                      <ChargeRow label="Daily Bed/Room Charge" value={`${formatRupees(dailyCharge)}/day`} />
                      <ChargeRow label="Admission Charge" value={formatRupees(ADMISSION_CHARGE)} />
                      <ChargeRow label="Initial Amount" value={formatRupees(initialAmount)} strong />
                    </dl>
                  </CardBody>
                </Card>
              ) : null}

              <Card className="min-w-0">
                <CardHeader title="Attendant Details" />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Attendant Name">
                    <input value={draft.attendantName} onChange={(e) => update({ attendantName: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Relationship">
                    <select value={draft.attendantRelationship} onChange={(e) => update({ attendantRelationship: e.target.value as AttendantRelationship })} className={inputClass}>
                      {ATTENDANT_RELATIONSHIPS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Phone">
                    <MobileInput
                      value={draft.attendantPhone}
                      onValueChange={(value) => update({ attendantPhone: value })}
                      placeholder="10-digit mobile number"
                      className={inputClass}
                    />
                    {draft.attendantPhone.length > 0 && !isValidMobile(draft.attendantPhone) ? (
                      <span className="text-xs font-normal text-critical-fg" role="alert">
                        {MOBILE_ERROR}
                      </span>
                    ) : null}
                  </Field>
                  <Field label="Address (optional)">
                    <input value={draft.attendantAddress} onChange={(e) => update({ attendantAddress: e.target.value })} className={inputClass} />
                  </Field>
                </CardBody>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Payment Information" />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Payment Type">
                    <select value={draft.paymentType} onChange={(e) => update({ paymentType: e.target.value as PaymentType })} className={inputClass}>
                      {PAYMENT_TYPES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.paymentType === 'Insurance' || draft.paymentType === 'TPA' ? (
                    <>
                      <Field label="Provider / Company">
                        <input value={draft.insuranceProvider} onChange={(e) => update({ insuranceProvider: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Policy / Member ID">
                        <input value={draft.policyNumber} onChange={(e) => update({ policyNumber: e.target.value })} className={inputClass} />
                      </Field>
                    </>
                  ) : null}
                </CardBody>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Payment" subtitle="The initial amount is collected now, before the admission is confirmed" />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Amount to Pay">
                    <input value={initialAmount > 0 ? formatRupees(initialAmount) : '—'} readOnly className={`${inputClass} font-semibold`} />
                  </Field>
                  <Field label="Payment Method">
                    <select
                      value={draft.paymentMethod}
                      onChange={(e) => update({ paymentMethod: e.target.value as PaymentMethod | '' })}
                      className={inputClass}
                    >
                      <option value="">Select payment method</option>
                      {IP_PAYMENT_METHODS.map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex flex-col gap-1 sm:col-span-2" aria-live="polite">
                    {!draft.ward ? <FieldNote>Select a ward.</FieldNote> : null}
                    {draft.ward && !draft.bedId ? <FieldNote>Select an available bed to see the charges.</FieldNote> : null}
                    {draft.bedId && !draft.paymentMethod ? <FieldNote>Select a payment method.</FieldNote> : null}
                  </div>
                </CardBody>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
                <Button disabled={!formValid} onClick={() => setPhase('review')}>
                  Review Admission
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewSection({
  patient,
  draft,
  doctorName,
  bedLabel,
  initialAmount,
  error,
  onBack,
  onConfirm,
}: {
  patient: Patient
  draft: AdmissionDraft
  doctorName: string
  bedLabel: string
  initialAmount: number
  error: string | null
  onBack: () => void
  onConfirm: () => void
}) {
  return (
    <Card className="min-w-0">
      <CardHeader title="Review Admission" subtitle="Confirm every detail before creating the admission" />
      <CardBody className="flex flex-col gap-5">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <ReviewGroup title="Patient">
          <Row label="Name" value={patient.name} />
          <Row label="UHID" value={patient.uhid} />
          <Row label="Age / Gender" value={`${patient.age ?? '—'} · ${patient.sex}`} />
          <Row label="Phone" value={patient.mobile} />
        </ReviewGroup>

        <ReviewGroup title="Admission">
          <Row label="Type" value={draft.admissionType} />
          <Row label="Department" value={draft.department} />
          <Row label="Doctor" value={doctorName} />
          <Row label="Reason" value={draft.reason} />
        </ReviewGroup>

        <ReviewGroup title="Bed">
          <Row label="Ward" value={draft.ward || '—'} />
          <Row label="Bed" value={bedLabel} />
        </ReviewGroup>

        <ReviewGroup title="Attendant">
          <Row label="Name" value={draft.attendantName} />
          <Row label="Relationship" value={draft.attendantRelationship} />
          <Row label="Phone" value={draft.attendantPhone} />
        </ReviewGroup>

        <ReviewGroup title="Payment">
          <Row label="Payment Type" value={draft.paymentType} />
          <Row label="Amount to Pay" value={formatRupees(initialAmount)} />
          <Row label="Payment Method" value={draft.paymentMethod || '—'} />
          {draft.paymentType === 'Insurance' || draft.paymentType === 'TPA' ? <Row label="Provider" value={draft.insuranceProvider || '—'} /> : null}
        </ReviewGroup>

        <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onConfirm}>Confirm Payment &amp; Admit Patient</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink" title={value}>
        {value}
      </dd>
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

/** IP Admission → Admit Patient: a page of its own, separate from Admissions &
 *  Bed Management. Admitting writes to the same bed/admission records that page
 *  reads, so it shows the new admission and the occupied bed straight away. */
export function AdmitPatientPage() {
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader
        title="Admit Patient"
        subtitle="Find a patient, choose an available bed, and admit them."
        illustration={<ClipboardPlus className="h-6 w-6" strokeWidth={1.75} />}
        illustrationTone="purple"
      />
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <AdmitPatientForm onCancel={() => navigate('/admissions')} onAdmitted={() => navigate('/admissions')} />
      </div>
    </div>
  )
}

function ChargeRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={strong ? 'mt-0.5 text-base font-semibold text-ink' : 'mt-0.5 font-medium text-ink'}>{value}</dd>
    </div>
  )
}

function FieldNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-critical-fg">{children}</p>
}
