import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UserPlus, UserRoundCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { MobileInput } from '../components/ui/MobileInput'
import { Avatar } from '../components/ui/Avatar'
import { AckCard } from '../components/flow/AckCard'
import { AgeConfirm, FieldError } from '../components/patient/AgeConfirm'
import { CreateAbhaLink } from '../components/patient/CreateAbhaLink'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { findAbhaHolder, findPossibleDuplicatesFor, getConnectivity } from '../domain/selectors'
import { registerPatient } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { cn } from '../utils/cn'
import { nationalMobile } from '../utils/phone'
import { abhaError, ageError, ageNeedsConfirmation, mobileError, nameError, nextAgeInput, nextNameInput, sexError } from '../utils/validation'
import type { Patient, Sex } from '../types/patient'
import { errorClass, inputClass } from '../utils/formClasses'

const SEXES: Sex[] = ['Male', 'Female', 'Other']

interface RegisterPatientLocationState {
  prefillName?: string
}

/** What the desk typed into the search box before pressing Register Patient. */
function prefillFrom(search: string, state: RegisterPatientLocationState | null): { name: string; mobile: string } {
  const query = new URLSearchParams(search)
  return {
    name: nextNameInput(query.get('name')?.trim() ?? state?.prefillName ?? '').trim(),
    mobile: nationalMobile(query.get('mobile')).slice(0, 10),
  }
}

interface PatientFormState {
  name: string
  age: string
  sex: Sex | ''
  mobile: string
  abhaId: string
  ageConfirmed: boolean
}

type FieldKey = 'name' | 'age' | 'sex' | 'mobile' | 'abhaId'

const FIELD_LABEL: Record<FieldKey, string> = { name: 'name', age: 'age', sex: 'sex', mobile: 'mobile', abhaId: 'ABHA' }

export function RegisterPatientPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const connectivity = useStoreValue(getConnectivity)
  const [form, setForm] = useState<PatientFormState>(() => {
    const prefill = prefillFrom(location.search, location.state as RegisterPatientLocationState | null)
    return { name: prefill.name, age: '', sex: '', mobile: prefill.mobile, abhaId: '', ageConfirmed: false }
  })
  // A field shows its message once it has been left (or a submit was tried) —
  // never while the desk is still typing its first character.
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<Patient | null>(null)

  const duplicateQuery = useMemo(() => ({ name: form.name, mobile: form.mobile, abhaId: form.abhaId }), [form.name, form.mobile, form.abhaId])
  const duplicates = useStoreValue(findPossibleDuplicatesFor, duplicateQuery)
  const abhaHolder = useStoreValue(findAbhaHolder, form.abhaId)

  const errors: Record<FieldKey, string | null> = {
    name: nameError(form.name),
    age: ageError(form.age),
    sex: sexError(form.sex),
    mobile: mobileError(form.mobile),
    abhaId: abhaError(form.abhaId) ?? (abhaHolder ? `Already linked to ${abhaHolder.name} (${abhaHolder.uhid}).` : null),
  }
  const needsAgeConfirm = ageNeedsConfirmation(form.age)
  const invalid = (Object.keys(errors) as FieldKey[]).filter((key) => errors[key])
  const ready = invalid.length === 0 && (!needsAgeConfirm || form.ageConfirmed)
  const shown = (key: FieldKey) => (touched[key] ? errors[key] : null)
  // A typed ABHA already on another record is flagged at once, not on blur.
  const abhaShown = form.abhaId.trim() ? (shown('abhaId') ?? (abhaHolder ? errors.abhaId : null)) : null

  function update<K extends keyof PatientFormState>(field: K, value: PatientFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
      // A new age needs confirming again.
      ...(field === 'age' ? { ageConfirmed: false } : {}),
    }))
    setError(null)
  }

  const touch = (key: FieldKey) => () => setTouched((current) => ({ ...current, [key]: true }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setTouched({ name: true, age: true, sex: true, mobile: true, abhaId: true })
    if (!ready) return
    try {
      // Registering is free — it only creates the record and its UHID.
      setRegistered(registerPatient(form))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Registration failed', { tone: 'error', detail: message })
    }
  }

  function openExistingPatient(patient: Patient) {
    navigate(`/patients/${patient.uhid}`, { replace: true })
  }

  if (registered) {
    // A plain acknowledgement, then the new patient's profile. `replace`
    // drops the filled-in form from history, so Back never lands on it again.
    return (
      <div className="flex min-h-[60dvh] items-center justify-center py-6">
        <Card accentTone="teal" className="w-full max-w-md">
          <AckCard
            title="Patient Created"
            icon={UserRoundCheck}
            durationMs={7000}
            onDone={() => navigate(`/patients/${registered.uhid}`, { replace: true })}
          >
            <p className="text-base font-semibold text-ink">{registered.name}</p>
            <p className="text-2xl font-semibold tracking-wide tabular-nums text-primary-text">{registered.uhid}</p>
            <p>
              {registered.age} yrs · {registered.sex} · {registered.mobile}
            </p>
            {registered.abhaId ? <p>ABHA {registered.abhaId}</p> : null}
          </AckCard>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Register Patient" subtitle="Welcome a new patient — create their record and UHID." />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)] mt-4 sm:mt-5">
        <Card accentTone="teal" className="min-w-0">
          <CardHeader icon={UserPlus} iconTone="teal" title="Patient details" />
          <CardBody>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}

              <Field label="Full name" required htmlFor="reg-name" hint="Letters only — no numbers" error={shown('name')}>
                <input
                  id="reg-name"
                  value={form.name}
                  onChange={(event) => update('name', nextNameInput(event.target.value))}
                  onBlur={touch('name')}
                  placeholder="As written on the patient's ID"
                  maxLength={60}
                  autoComplete="off"
                  aria-invalid={Boolean(shown('name'))}
                  className={cn(inputClass, shown('name') && errorClass)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-[6rem_minmax(0,1fr)]">
                <Field label="Age" required htmlFor="reg-age" error={shown('age')}>
                  <input
                    id="reg-age"
                    value={form.age}
                    onChange={(event) => update('age', nextAgeInput(event.target.value, form.age))}
                    onBlur={touch('age')}
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="0–130"
                    aria-invalid={Boolean(shown('age'))}
                    className={cn(inputClass, (shown('age') || needsAgeConfirm) && errorClass, needsAgeConfirm && 'font-semibold text-critical-fg')}
                  />
                </Field>
                <Field label="Sex" required error={shown('sex')}>
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Sex">
                    {SEXES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={form.sex === option}
                        onClick={() => {
                          update('sex', option)
                          touch('sex')()
                        }}
                        className={cn(
                          'focus-ring min-h-11 flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                          form.sex === option
                            ? 'border-primary-600 bg-primary-600 text-on-primary'
                            : shown('sex')
                              ? 'border-critical-fg bg-surface-1 text-ink hover:bg-surface-2'
                              : 'border-border bg-surface-1 text-ink hover:bg-surface-2',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {needsAgeConfirm ? (
                <AgeConfirm age={form.age} confirmed={form.ageConfirmed} onConfirm={(next) => setForm((current) => ({ ...current, ageConfirmed: next }))} />
              ) : null}

              <Field label="Mobile number" required htmlFor="reg-mobile" hint="10 digits, starting with 6, 7, 8 or 9 — used to find existing records" error={shown('mobile')}>
                <MobileInput
                  id="reg-mobile"
                  value={form.mobile}
                  onValueChange={(value) => update('mobile', value)}
                  onBlur={touch('mobile')}
                  placeholder="10-digit mobile number"
                  aria-invalid={Boolean(shown('mobile'))}
                  className={cn(inputClass, shown('mobile') && errorClass)}
                />
              </Field>

              <Field
                label="ABHA address or number"
                htmlFor="reg-abha"
                error={abhaShown}
                hint={
                  <>
                    {/* Matches abhaError: a 14-digit number, or an address of 8–18 characters @abdm. Made-up values — never a real patient’s. */}
                    <span className="block">
                      e.g. <span className="font-medium text-ink-muted tabular-nums">12-3456-7890-1234</span> or{' '}
                      <span className="font-medium text-ink-muted">priya.kumar@abdm</span>
                    </span>
                    <span className="mt-0.5 block">
                      {connectivity.abha === 'unavailable'
                        ? 'Optional. ABHA lookup is unavailable — type it in or link it later. The patient is never held up.'
                        : 'Optional — links the patient’s health records from other hospitals.'}
                    </span>
                  </>
                }
              >
                {/* Kept short, so the Create ABHA popup has room to open on its right. */}
                <div className="flex max-w-md gap-2">
                  <input
                    id="reg-abha"
                    value={form.abhaId}
                    onChange={(event) => update('abhaId', event.target.value)}
                    onBlur={touch('abhaId')}
                    placeholder="name@abdm or 14-digit number"
                    autoComplete="off"
                    aria-invalid={Boolean(abhaShown)}
                    aria-describedby={abhaShown ? 'reg-abha-error' : 'reg-abha-hint'}
                    className={cn(inputClass, abhaShown && errorClass)}
                  />
                  {/* No ABHA yet? The patient can create one with ABDM. */}
                  {form.abhaId.trim() ? null : <CreateAbhaLink />}
                </div>
              </Field>

              <div className="flex flex-col items-stretch gap-2 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-end">
                {!ready ? (
                  <p className="text-xs text-ink-muted sm:mr-auto">
                    {invalid.length
                      ? `To create the patient: check the ${invalid.map((key) => FIELD_LABEL[key]).join(', ')}.`
                      : 'To create the patient: confirm the age with the patient.'}
                  </p>
                ) : null}
                <Button type="submit" disabled={!ready}>
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                  Register Patient
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {duplicates.length > 0 ? (
            <Card accentTone="warning" className="border-warning-fg/25 bg-warning-bg/40">
              <CardHeader
                title="Possible existing patient found"
                subtitle="Matched on mobile number, name or ABHA. Check with the patient before creating a second record."
              />
              <div className="divide-y divide-border-soft">
                {duplicates.map((candidate) => (
                  <div key={candidate.patientId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={candidate.name} initials={initialsOf(candidate.name)} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{candidate.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {candidate.uhid} · {candidate.age ?? '—'} yrs · {candidate.sex} · {candidate.mobile}
                          {candidate.abhaId ? ` · ABHA ${candidate.abhaId}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openExistingPatient(candidate)}>
                        Use this patient
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card accentTone="teal">
              <CardBody>
                <p className="text-sm font-medium text-ink">Duplicate check</p>
                <p className="mt-1 text-sm text-ink-muted">
                  As you type the patient’s name, mobile number or ABHA, any record that may already be theirs appears here — so
                  each patient keeps one record and one complete history.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}


function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string | null
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-muted">
        {label} {required ? <span className="text-critical-fg">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <FieldError id={htmlFor ? `${htmlFor}-error` : undefined} message={error} />
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
