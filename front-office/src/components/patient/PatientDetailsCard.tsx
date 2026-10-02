import { useState } from 'react'
import { Pencil, UserCog } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { MobileInput } from '../ui/MobileInput'
import { useToast } from '../../hooks/useToast'
import { useStoreValue } from '../../hooks/useStore'
import { getConnectivity } from '../../domain/selectors'
import { linkAbha, updatePatientDemographics } from '../../domain/actions'
import { toEditableMobile } from '../../utils/phone'
import { formatDateKey } from '../../utils/dates'
import { todayKey } from '../../domain/time'
import type { Patient, Sex } from '../../types/patient'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600 placeholder:text-ink-subtle'

interface Draft {
  name: string
  age: string
  sex: Sex
  mobile: string
  email: string
  address: string
}

/** Contact and identity details that aren't already in the header — edited
 *  in place, with ABHA linked from the same card. */
export function PatientDetailsCard({ patient }: { patient: Patient }) {
  const { notify } = useToast()
  const connectivity = useStoreValue(getConnectivity)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [abha, setAbha] = useState('')
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setError(null)
    setDraft({
      name: patient.name,
      age: patient.age != null ? String(patient.age) : '',
      sex: patient.sex,
      mobile: toEditableMobile(patient.mobile),
      email: patient.email ?? '',
      address: patient.address ?? '',
    })
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    try {
      updatePatientDemographics(patient.patientId, { ...draft, age: Number(draft.age) || null })
      notify('Details updated', { detail: patient.uhid })
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function link(event: React.FormEvent) {
    event.preventDefault()
    try {
      linkAbha(patient.patientId, abha)
      notify('ABHA linked', { detail: abha.trim() })
      setAbha('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Card>
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

        {draft ? (
          <form onSubmit={save} className="flex flex-col gap-3">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} placeholder="Full name" aria-label="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={draft.age}
                onChange={(e) => setDraft({ ...draft, age: e.target.value.replace(/[^0-9]/g, '') })}
                className={inputClass}
                placeholder="Age"
                aria-label="Age"
                inputMode="numeric"
              />
              <select value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Sex })} className={inputClass} aria-label="Sex">
                {(['Male', 'Female', 'Other'] as Sex[]).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <MobileInput value={draft.mobile} onValueChange={(value) => setDraft({ ...draft, mobile: value })} className={inputClass} placeholder="Mobile (10 digits)" />
            <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputClass} placeholder="Email" aria-label="Email" />
            <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className={inputClass} placeholder="Address" aria-label="Address" />
            <div className="flex gap-2">
              <Button type="submit" size="sm">
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
          <form onSubmit={link} className="flex flex-col gap-2 border-t border-border-soft pt-3">
            {connectivity.abha === 'unavailable' ? (
              <p className="text-xs text-ink-muted">ABHA lookup is unavailable — record an existing ABHA by hand. Care is never blocked on it.</p>
            ) : null}
            <div className="flex gap-2">
              <input
                value={abha}
                onChange={(event) => setAbha(event.target.value)}
                placeholder="name@abdm or 14-digit number"
                aria-label="ABHA address or number"
                className={inputClass}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!abha.trim()} className="shrink-0">
                Link ABHA
              </Button>
            </div>
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
