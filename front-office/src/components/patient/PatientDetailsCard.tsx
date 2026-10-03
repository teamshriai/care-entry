import { useState } from 'react'
import { Pencil, UserCog } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { MobileInput } from '../ui/MobileInput'
import { useToast } from '../../hooks/useToast'
import { useStoreValue } from '../../hooks/useStore'
import { findAbhaHolder, getConnectivity } from '../../domain/selectors'
import { linkAbha, updatePatientDemographics } from '../../domain/actions'
import { toEditableMobile } from '../../utils/phone'
import { abhaError, addressError, ageError, ageNeedsConfirmation, emailError, mobileError, nameError, nextAgeInput } from '../../utils/validation'
import { cn } from '../../utils/cn'
import { AgeConfirm, FieldError } from './AgeConfirm'
import { formatDateKey } from '../../utils/dates'
import { todayKey } from '../../domain/time'
import type { Patient, Sex } from '../../types/patient'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600 placeholder:text-ink-subtle'
const errorClass = 'border-critical focus:border-critical focus:ring-critical'

interface Draft {
  name: string
  age: string
  sex: Sex
  mobile: string
  email: string
  address: string
  ageConfirmed: boolean
}

/** Contact and identity details that aren't already in the header — edited
 *  in place with the same checks as registration, with ABHA linked from the
 *  same card. */
export function PatientDetailsCard({ patient }: { patient: Patient }) {
  const { notify } = useToast()
  const connectivity = useStoreValue(getConnectivity)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [abha, setAbha] = useState('')
  const [abhaTouched, setAbhaTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abhaHolder = useStoreValue(findAbhaHolder, abha)

  function startEditing() {
    setError(null)
    setDraft({
      name: patient.name,
      age: patient.age != null ? String(patient.age) : '',
      sex: patient.sex,
      mobile: toEditableMobile(patient.mobile),
      email: patient.email ?? '',
      address: patient.address ?? '',
      ageConfirmed: false,
    })
  }

  const draftErrors = draft
    ? {
        name: nameError(draft.name),
        age: ageError(draft.age),
        mobile: mobileError(draft.mobile),
        email: emailError(draft.email),
        address: addressError(draft.address),
      }
    : null
  const ageChanged = draft ? Number(draft.age) !== patient.age : false
  const needsAgeConfirm = Boolean(draft && ageChanged && ageNeedsConfirmation(draft.age))
  const draftReady = Boolean(
    draftErrors && Object.values(draftErrors).every((message) => !message) && (!needsAgeConfirm || draft?.ageConfirmed),
  )

  const abhaProblem = abhaError(abha) ?? (abhaHolder && abhaHolder.patientId !== patient.patientId ? `Already linked to ${abhaHolder.name} (${abhaHolder.uhid}).` : null)

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft || !draftReady) return
    try {
      updatePatientDemographics(patient.patientId, draft)
      notify('Details updated', { detail: patient.uhid })
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function link(event: React.FormEvent) {
    event.preventDefault()
    setAbhaTouched(true)
    if (abhaProblem) return
    try {
      linkAbha(patient.patientId, abha)
      notify('ABHA linked', { detail: abha.trim() })
      setAbha('')
      setAbhaTouched(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function edit<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (!draft) return
    setDraft({ ...draft, [key]: value, ...(key === 'age' ? { ageConfirmed: false } : {}) })
    setError(null)
  }

  return (
    <Card accentTone="teal">
      <CardHeader
        icon={UserCog}
        iconTone="teal"
        title="Details"
        action={
          draft ? null : (
            <Button size="sm" variant="ghost" onClick={startEditing} aria-label="Edit details">
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              Edit
            </Button>
          )
        }
      />
      <CardBody className="flex flex-col gap-4">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        {draft && draftErrors ? (
          <form onSubmit={save} noValidate className="flex flex-col gap-3">
            <div>
              <input value={draft.name} onChange={(e) => edit('name', e.target.value)} maxLength={60} className={cn(inputClass, draftErrors.name && errorClass)} placeholder="Full name" aria-label="Full name" aria-invalid={Boolean(draftErrors.name)} />
              <FieldError message={draftErrors.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  value={draft.age}
                  onChange={(e) => edit('age', nextAgeInput(e.target.value, draft.age))}
                  className={cn(inputClass, (draftErrors.age || needsAgeConfirm) && errorClass)}
                  placeholder="Age 0–130"
                  aria-label="Age in years, 0 to 130"
                  aria-invalid={Boolean(draftErrors.age)}
                  inputMode="numeric"
                  maxLength={3}
                />
                <FieldError message={draftErrors.age} />
              </div>
              <select value={draft.sex} onChange={(e) => edit('sex', e.target.value as Sex)} className={inputClass} aria-label="Sex">
                {(['Male', 'Female', 'Other'] as Sex[]).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            {needsAgeConfirm ? <AgeConfirm age={draft.age} confirmed={draft.ageConfirmed} onConfirm={(next) => edit('ageConfirmed', next)} /> : null}
            <div>
              <MobileInput value={draft.mobile} onValueChange={(value) => edit('mobile', value)} className={cn(inputClass, draftErrors.mobile && errorClass)} placeholder="Mobile (10 digits)" aria-invalid={Boolean(draftErrors.mobile)} />
              <FieldError message={draftErrors.mobile} />
            </div>
            <div>
              <input type="email" value={draft.email} onChange={(e) => edit('email', e.target.value)} className={cn(inputClass, draftErrors.email && errorClass)} placeholder="Email (optional)" aria-label="Email" aria-invalid={Boolean(draftErrors.email)} />
              <FieldError message={draftErrors.email} />
            </div>
            <div>
              <input value={draft.address} onChange={(e) => edit('address', e.target.value)} maxLength={200} className={cn(inputClass, draftErrors.address && errorClass)} placeholder="Address (optional)" aria-label="Address" aria-invalid={Boolean(draftErrors.address)} />
              <FieldError message={draftErrors.address} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!draftReady}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Discard
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-2 text-sm">
            <Row label="Address" value={patient.address ?? '—'} />
            <Row label="Email" value={patient.email ?? '—'} />
            <Row label="Registered" value={formatDateKey(todayKey(new Date(patient.createdAt)))} />
            <Row label="ABHA" value={patient.abhaId ?? 'Not linked'} />
          </dl>
        )}

        {!patient.abhaId && !draft ? (
          <form onSubmit={link} noValidate className="flex flex-col gap-2 border-t border-border-soft pt-3">
            {connectivity.abha === 'unavailable' ? (
              <p className="text-xs text-ink-muted">ABHA lookup is unavailable — record an existing ABHA by hand. Care is never blocked on it.</p>
            ) : null}
            <div className="flex gap-2">
              <input
                value={abha}
                onChange={(event) => {
                  setAbha(event.target.value)
                  setError(null)
                }}
                onBlur={() => setAbhaTouched(true)}
                placeholder="name@abdm or 14-digit number"
                aria-label="ABHA address or number"
                aria-invalid={Boolean(abhaTouched && abhaProblem)}
                className={cn(inputClass, abhaTouched && abhaProblem && errorClass)}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!abha.trim()} className="shrink-0">
                Link ABHA
              </Button>
            </div>
            <FieldError message={abhaTouched ? abhaProblem : null} />
          </form>
        ) : null}
      </CardBody>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  )
}
