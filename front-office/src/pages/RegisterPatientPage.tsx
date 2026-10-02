import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UserPlus, UserRoundCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { MobileInput } from '../components/ui/MobileInput'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { AckCard } from '../components/flow/AckCard'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { findPossibleDuplicatesFor, getConnectivity } from '../domain/selectors'
import { registerPatient } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { cn } from '../utils/cn'
import type { Patient, Sex } from '../types/patient'

const SEXES: Sex[] = ['Male', 'Female', 'Other']

interface RegisterPatientLocationState {
  prefillName?: string
}

/** What the desk typed into the search box before pressing Register. */
function prefillFrom(search: string, state: RegisterPatientLocationState | null): { name: string; mobile: string } {
  const query = new URLSearchParams(search)
  return {
    name: query.get('name')?.trim() ?? state?.prefillName ?? '',
    mobile: (query.get('mobile') ?? '').replace(/[^0-9]/g, '').slice(-10),
  }
}

interface PatientFormState {
  name: string
  age: string
  sex: Sex
  mobile: string
  abhaId: string
}

export function RegisterPatientPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const connectivity = useStoreValue(getConnectivity)
  const [form, setForm] = useState<PatientFormState>(() => {
    const prefill = prefillFrom(location.search, location.state as RegisterPatientLocationState | null)
    return { name: prefill.name, age: '', sex: 'Male', mobile: prefill.mobile, abhaId: '' }
  })
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<Patient | null>(null)

  const duplicateQuery = useMemo(() => ({ name: form.name, mobile: form.mobile }), [form.name, form.mobile])
  const duplicates = useStoreValue(findPossibleDuplicatesFor, duplicateQuery)

  function update<K extends keyof PatientFormState>(field: K, value: PatientFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
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
    // The acknowledgement, then the new patient's profile. `replace` drops the
    // filled-in form from history, so Back never lands on it again.
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <AckCard
            title="Patient Registered"
            icon={UserRoundCheck}
            onDone={() => navigate(`/patients/${registered.uhid}`, { replace: true })}
          >
            <p className="text-base font-semibold text-ink">{registered.name}</p>
            <p className="text-2xl font-semibold tracking-wide tabular-nums text-primary-text">{registered.uhid}</p>
            <p>
              {registered.age ? `${registered.age} yrs · ` : ''}
              {registered.sex} · {registered.mobile}
            </p>
            {registered.abhaId ? <p>ABHA {registered.abhaId}</p> : null}
          </AckCard>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Register Patient" subtitle="Create a new patient record and allocate a UHID." />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader icon={UserPlus} iconTone="teal" title="Patient details" />
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}

              <Field label="Full name" required>
                <input
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="As written on the patient's ID"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Age">
                  <input
                    value={form.age}
                    onChange={(event) => update('age', event.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="Years"
                    className={inputClass}
                  />
                </Field>
                <Field label="Sex" required>
                  <div className="flex gap-1.5">
                    {SEXES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => update('sex', option)}
                        className={cn(
                          'flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                          form.sex === option
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-border bg-surface text-ink hover:bg-surface-muted',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Mobile number" required hint="Used to match against existing records">
                <MobileInput
                  value={form.mobile}
                  onValueChange={(value) => update('mobile', value)}
                  placeholder="10-digit mobile number"
                  className={inputClass}
                />
              </Field>

              <Field
                label="ABHA address"
                hint={
                  connectivity.abha === 'unavailable'
                    ? 'ABHA lookup is unavailable — enter manually or link later. Registration is never blocked.'
                    : 'Optional'
                }
              >
                <input
                  value={form.abhaId}
                  onChange={(event) => update('abhaId', event.target.value)}
                  placeholder="name@abdm or 14-digit number"
                  className={inputClass}
                />
              </Field>

              <div className="flex justify-end border-t border-border-soft pt-4">
                <Button type="submit" disabled={!form.name.trim() || !form.mobile.trim()}>
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                  Register
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="min-w-0">
          {duplicates.length > 0 ? (
            <Card className="border-warning-border bg-warning-bg/40">
              <CardHeader
                title="Possible existing patient found"
                subtitle="Matched on mobile number or name. Confirm before creating a second record."
              />
              <div className="divide-y divide-border-soft">
                {duplicates.map((candidate) => (
                  <div key={candidate.patientId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar initials={initialsOf(candidate.name)} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{candidate.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {candidate.uhid} · {candidate.age} yrs · {candidate.sex} · {candidate.mobile}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge status={candidate.abhaId ? 'Linked' : 'Not linked'} className="hidden text-2xs xl:inline-flex" />
                      <Button size="sm" variant="secondary" onClick={() => openExistingPatient(candidate)}>
                        Use this patient
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="h-full">
              <CardBody>
                <p className="text-sm font-medium text-ink">Duplicate check</p>
                <p className="mt-1 text-sm text-ink-muted">
                  As you type a name or mobile number, existing records that look like the same person appear here so a
                  second UHID is never created by accident.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-ink-faint'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-muted">
        {label} {required ? <span className="text-critical">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  )
}
