import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { findPossibleDuplicatesFor, getConnectivity } from '../domain/selectors'
import { registerPatient } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { cn } from '../utils/cn'
import type { Patient, Sex } from '../types/patient'

const SEXES: Sex[] = ['Male', 'Female', 'Other']

interface RegisterPatientLocationState {
  prefillName?: string
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
  const { setPatient } = usePatientContext()
  const connectivity = useStoreValue(getConnectivity)
  const locationState = location.state as RegisterPatientLocationState | null

  const [form, setForm] = useState<PatientFormState>({
    name: locationState?.prefillName ?? '',
    age: '',
    sex: 'Male',
    mobile: '',
    abhaId: '',
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
      const patient = registerPatient(form)
      setPatient(patient)
      setRegistered(patient)
      notify('Patient registered', { detail: `${patient.name} · ${patient.uhid}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Registration failed', { tone: 'error', detail: message })
    }
  }

  function selectExistingPatient(patient: Patient) {
    setPatient(patient)
    notify('Existing patient selected', { detail: `${patient.name} · ${patient.uhid}` })
    navigate('/appointments/new')
  }

  if (registered) {
    return (
      <div>
        <PageHeader title="Register Patient" subtitle="Patient created and selected — continue the workflow." />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-2xl">
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stable-bg">
                  <CheckCircle2 className="h-5 w-5 text-stable" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{registered.name} registered</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    UHID <span className="font-medium text-ink">{registered.uhid}</span> · {registered.age ?? '—'} yrs ·{' '}
                    {registered.sex} · {registered.mobile}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 border-t border-border-soft pt-4">
                <Button onClick={() => navigate('/appointments/new')}>Schedule appointment</Button>
                <Button variant="secondary" onClick={() => navigate('/doctors')}>
                  Start walk-in visit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRegistered(null)
                    setForm({ name: '', age: '', sex: 'Male', mobile: '', abhaId: '' })
                  }}
                >
                  Register another
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
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
                <input
                  value={form.mobile}
                  onChange={(event) => update('mobile', event.target.value)}
                  placeholder="+91 ..........."
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

              <div className="flex justify-end gap-2.5 border-t border-border-soft pt-4">
                <Button type="button" variant="secondary" onClick={() => navigate('/front-office')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.name.trim() || !form.mobile.trim()}>
                  Register patient
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
                      <Button size="sm" variant="secondary" onClick={() => selectExistingPatient(candidate)}>
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
