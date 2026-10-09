import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { BedDouble, ClipboardList, IndianRupee, ShieldCheck, Stethoscope } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { Quadrant, SummaryItem, Waiting } from '../../components/flow/Quadrant'
import { useToast } from '../../hooks/useToast'
import { PatientSearch } from '../../components/patient/PatientSearch'
import { MobileInput } from '../../components/ui/MobileInput'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { WardIcon } from '../../components/ui/WardIcon'
import { useStoreValue } from '../../hooks/useStore'
import { getState } from '../../domain/store'
import { getDepartments, getPatientById, getProviders } from '../../domain/selectors'
import { getBedsForWard, getFirstFreeBed, getWardSummaries } from '../../domain/admissionSelectors'
import { getCurrentAdmissionForPatient, getTodaysEncounterDoctor } from '../../domain/patientSelectors'
import { admitPatient } from '../../domain/admissionActions'
import { DAILY_BED_CHARGE, admissionBillItems, formatRupees } from '../../utils/billing'
import { isValidMobile } from '../../utils/phone'
import { cn } from '../../utils/cn'
import { ATTENDANT_RELATIONSHIPS, REFERRAL_SOURCES } from '../../types/admission'
import { departmentIcon, departmentTone } from '../../utils/departments'
import { TONE_HEX } from '../../utils/toneHex'
import type { AdmissionType, AttendantRelationship, PaymentType, ReferralSource, Ward } from '../../types/admission'
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
    referralSource: waiting?.referralSource ?? 'Outpatient',
    attendantName: waiting?.attendant.name ?? '',
    attendantRelationship: waiting?.attendant.relationship ?? 'Spouse',
    attendantPhone: waiting?.attendant.phone.replace(/[^0-9]/g, '').slice(-10) ?? '',
    paymentType: waiting?.paymentType ?? 'Self Pay',
    insuranceProvider: waiting?.insuranceProvider ?? '',
    policyNumber: waiting?.policyNumber ?? '',
  }
}

/** The department of a doctor, by id — where the department picker starts. */
function departmentOf(doctorId: string): string | null {
  return getState().providers.find((p) => p.providerId === doctorId)?.department ?? null
}

/** The details card's own fields: the reason and the attendant. */
function detailsFilled(d: Details): boolean {
  return d.reason.trim().length > 0 && d.attendantName.trim().length > 0 && isValidMobile(d.attendantPhone)
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
 * is printed for them to pay at the billing counter; then "Patient Admitted". The profile shows the
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
  const departments = useStoreValue(getDepartments)
  // The department narrows the doctors to choose from; it starts at the known doctor's.
  const [department, setDepartment] = useState<string | null>(() => departmentOf(details.doctorId))
  const { notify } = useToast()
  const [error, setError] = useState<string | null>(null)

  const doctor = providers.find((p) => p.providerId === details.doctorId) ?? null
  const selfPay = details.paymentType === 'Self Pay'
  const billItems = bed ? admissionBillItems(bed.roomType, 1) : []

  const wardDone = !alreadyAdmitted && Boolean(bed && bed.status === 'Available')
  const ready = Boolean(patient) && wardDone && detailsComplete(details)

  function choosePatient(next: Patient) {
    setPatientId(next.patientId)
    const started = startingDetails(next.patientId)
    setDetails(started)
    setDepartment(departmentOf(started.doctorId))
  }

  function chooseDepartment(next: string) {
    if (next === department) return
    setDepartment(next)
    // A doctor from another department no longer fits.
    if (doctor && doctor.department !== next) update({ doctorId: '' })
  }

  function chooseWard(next: Ward) {
    setWard(next)
    setBedId(getFirstFreeBed(getState(), next)?.bedId ?? null)
    // An ICU admission is an emergency.
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
      // Admitted: straight back to the patient's profile. The first-day bill is
      // printed from its Payment History for the patient to pay at the billing counter.
      notify('Patient admitted', { detail: `${result.admission.admissionNumber} · ${result.admission.wardLabel} · ${result.admission.bedNumber}` })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose the patient'


  const billTotal = billItems.reduce((sum, item) => sum + item.amount, 0)
  const bedSummary = bed ? `${bed.ward} · ${bed.bedNumber} · ${formatRupees(DAILY_BED_CHARGE[bed.roomType])}/day` : undefined

  const confirmBar = (
    <div className="flex flex-col gap-4 py-2">
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-base sm:grid-cols-4">
          <SummaryItem label="Patient" value={patient ? `${patient.name} · ${patient.uhid}` : null} />
          <SummaryItem label="Ward & bed" value={bed && wardDone ? `${bed.ward} · ${bed.bedNumber}` : null} />
          <SummaryItem label="Doctor" value={doctor ? doctor.name : null} />
          <SummaryItem label="Payer" value={selfPay ? 'Self pay' : details.insuranceProvider || details.paymentType} />
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
          <div className="text-right">
            <p className="text-sm text-ink-muted">First-day bill</p>
            <p className="text-2xl font-bold tabular-nums text-ink">{formatRupees(billTotal)}</p>
          </div>
          <Button size="lg" onClick={admit} disabled={!ready}>
            {selfPay ? <BedDouble className="h-4 w-4" strokeWidth={1.75} /> : <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
            {selfPay ? 'Admit' : `Admit — bill ${details.insuranceProvider || details.paymentType}`}
          </Button>
        </div>
      </div>
      <p className="text-sm text-ink-muted">
        {ready
          ? selfPay
            ? `After admitting, print the first-day bill from ${patient?.name ?? 'the patient'}’s Payment History for the billing counter. The bed charge accrues daily; the final bill is settled at discharge.`
            : 'The bill goes to the payer and is settled at discharge.'
          : 'Choose the patient, a free bed and complete the details to admit.'}
      </p>
    </div>
  )

  return (
    <FlowSheet title="Admit" subtitle={subtitle} icon={BedDouble} iconTone="info" onClose={onClose} size="full" footer={confirmBar}>
      <div className="flex flex-col gap-4">
        {/* The patient is known — Admit opens from their profile or a patient list.
            Only a flow opened with no patient asks for one. */}
        {!patient ? (
          <Quadrant step={1} title="Patient" done={false} allowOverflow>
            <PatientSearch mode="pick" onPick={choosePatient} autoFocus placeholder="Search the patient by name, mobile, UHID or ABHA" />
          </Quadrant>
        ) : alreadyAdmitted ? (
          <Alert tone="warning">
            <strong>{patient.name} is already admitted</strong> — {alreadyAdmitted.wardLabel} · {alreadyAdmitted.bedNumber} ({alreadyAdmitted.admissionNumber}).
          </Alert>
        ) : current ? (
          <Alert tone="info">Admitting the request already waiting for a bed ({current.admissionNumber}).</Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          {/* Left: who admits the patient, and the admission's details */}
          <div className="flex min-w-0 flex-col gap-5">
            <Quadrant
              step={patient ? 1 : 2}
              title="Department & doctor"
              icon={Stethoscope}
              hue="violet"
              done={Boolean(doctor)}
              summary={doctor ? `${doctor.name} · ${doctor.department}` : undefined}
            >
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Department">
                  {departments.map((dep) => {
                    const Icon = departmentIcon(dep)
                    const tone = TONE_HEX[departmentTone(dep)]
                    const chosen = dep === department
                    const count = providers.filter((p) => p.status === 'Active' && p.department === dep).length
                    return (
                      <button
                        key={dep}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => chooseDepartment(dep)}
                        style={{ '--tone': tone } as CSSProperties}
                        className={cn(
                          'focus-ring flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all',
                          chosen
                            ? 'border-[var(--tone)] bg-[color-mix(in_oklab,var(--tone)_10%,var(--color-surface-1))] shadow-card-sm'
                            : 'border-border-soft bg-surface-1 hover:border-[color-mix(in_oklab,var(--tone)_45%,var(--color-border))] hover:bg-surface-2',
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--tone)_16%,var(--color-surface-1))] text-[var(--tone)]">
                          <Icon size={16} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{dep}</span>
                          <span className="block text-xs text-ink-muted">
                            {count} {count === 1 ? 'doctor' : 'doctors'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                {department ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-ink-muted">
                      Admitting doctor · {department} <RequiredStar />
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Admitting doctor">
                      {providers
                        .filter((p) => p.status === 'Active' && p.department === department)
                        .map((p) => {
                          const chosen = p.providerId === details.doctorId
                          return (
                            <button
                              key={p.providerId}
                              type="button"
                              role="radio"
                              aria-checked={chosen}
                              onClick={() => update({ doctorId: p.providerId })}
                              className={cn(
                                'focus-ring flex min-w-0 flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors',
                                chosen ? 'border-primary-600 bg-primary-50 shadow-card-sm' : 'border-border-soft bg-surface-1 hover:bg-surface-2',
                              )}
                            >
                              <span className="block w-full truncate text-sm font-semibold text-ink">{p.name}</span>
                              <span className="block w-full truncate text-xs text-ink-muted">{p.specialty}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <Waiting>Choose a department to see its doctors.</Waiting>
                )}
              </div>
            </Quadrant>

            <Quadrant
              step={patient ? 2 : 3}
              title="Details"
              icon={ClipboardList}
              hue="blue"
              done={detailsFilled(details)}
              summary={details.attendantName.trim() ? `Attendant · ${details.attendantName.trim()}` : undefined}
            >
              <div className="flex flex-col gap-3">
                <p className="text-xs text-ink-muted">
                  <RequiredStar /> Required
                </p>
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  Referred from
                  <select value={details.referralSource} onChange={(e) => update({ referralSource: e.target.value as ReferralSource })} className={inputClass}>
                    {/* Walk-in is not a choice here; an older request that has it keeps it. */}
                    {REFERRAL_SOURCES.filter((option) => option !== 'Walk-in' || details.referralSource === 'Walk-in').map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <StarField>
                  <input value={details.reason} onChange={(e) => update({ reason: e.target.value })} placeholder="Reason for admission" aria-label="Reason for admission" className={cn(inputClass, 'pr-8')} aria-required="true" />
                </StarField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
                  <StarField>
                    <input value={details.attendantName} onChange={(e) => update({ attendantName: e.target.value })} placeholder="Attendant name" aria-label="Attendant name" className={cn(inputClass, 'pr-8')} aria-required="true" />
                  </StarField>
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
                <StarField>
                  <MobileInput value={details.attendantPhone} onValueChange={(value) => update({ attendantPhone: value })} placeholder="Attendant mobile (10 digits)" className={cn(inputClass, 'pr-8')} />
                </StarField>
              </div>
            </Quadrant>
          </div>

          {/* Right: where the patient goes, and the first-day bill */}
          <div className="flex min-w-0 flex-col gap-5">
            <Quadrant step={patient ? 3 : 4} title="Ward & bed" icon={BedDouble} hue="teal" done={wardDone} summary={bedSummary}>
              {!patient ? (
                <Waiting>Choose the patient to pick a ward and bed.</Waiting>
              ) : alreadyAdmitted ? (
                <Waiting>This patient is already admitted.</Waiting>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {wards
                      .filter((w) => w.ward !== 'Emergency')
                      .map((w) => {
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
                              'focus-ring flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-all',
                              w.ward === ward ? 'border-primary-600 bg-primary-50 shadow-card-sm' : 'border-border-soft bg-surface-1 hover:bg-surface-2',
                              full && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                              <WardIcon ward={w.ward} className={cn('h-4.5 w-4.5', w.ward === 'ICU' ? 'text-critical-fg' : 'text-primary-text')} />
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

            <Quadrant step={patient ? 4 : 5} title="Bill" icon={IndianRupee} hue="green" done={billItems.length > 0 && ready} summary={billItems.length ? formatRupees(billTotal) : undefined}>
              {billItems.length === 0 ? (
                <Waiting>Choose a bed to see the first-day bill.</Waiting>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
                    {billItems.map((item) => (
                      <div key={item.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-ink">{item.description}</span>
                        <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-success-bg px-4 py-3 text-sm font-semibold text-ink">
                      <span>Total</span>
                      <span className="text-base tabular-nums">{formatRupees(billTotal)}</span>
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
        </div>
      </div>
    </FlowSheet>
  )
}

/** The red star that marks a field the admission cannot go ahead without. */
function RequiredStar() {
  return (
    <span aria-hidden="true" className="font-semibold text-critical-fg">
      *
    </span>
  )
}

/** A required text field: its red star sits at the right end of the box. */
function StarField({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-semibold leading-none text-critical-fg">
        *
      </span>
    </div>
  )
}
