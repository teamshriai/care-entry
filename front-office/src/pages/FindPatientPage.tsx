import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { PatientIllustration } from '../components/ui/illustrations/PatientIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { useFlow } from '../flows/useFlow'
import { getPatientSearchResults, getPossibleDuplicates } from '../domain/selectors'
import { initialsOf } from '../utils/format'
import type { Patient } from '../types/patient'

interface FindPatientLocationState {
  query?: string
}

export function FindPatientPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { setPatient } = usePatientContext()
  const { openFlow } = useFlow()
  const inputRef = useRef<HTMLInputElement>(null)
  const locationState = location.state as FindPatientLocationState | null
  const [query, setQuery] = useState(locationState?.query ?? '')

  const results = useStoreValue(getPatientSearchResults, query)
  const duplicates = useStoreValue(getPossibleDuplicates)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const duplicateIds = new Set(duplicates.flat().map((patient) => patient.patientId))
  const hasQuery = query.trim().length >= 2

  function select(patient: Patient, then?: string, state?: unknown) {
    setPatient(patient)
    notify('Patient selected', { detail: `${patient.name} · ${patient.uhid}` })
    if (then) navigate(then, state ? { state } : undefined)
  }

  return (
    <div>
      <PageHeader
        title="Find Patient"
        subtitle="Search by name, UHID, phone or ABHA. Selecting a patient keeps them in context for booking and visits."
        illustration={<PatientIllustration className="h-8 w-8" />}
        illustrationTone="teal"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/register/new')}>
            <UserPlus className="h-3.5 w-3.5 text-primary-text" strokeWidth={1.75} />
            Register patient
          </Button>
        }
      />

      <div className="flex flex-col gap-4 px-6 py-6 lg:px-8">
        {duplicates.length > 0 ? (
          <Alert tone="warning">
            <strong>Possible duplicate records.</strong>{' '}
            {duplicates
              .map((group) => `${group.map((p) => p.uhid).join(' / ')} (${group[0].name})`)
              .join('; ')}{' '}
            share a mobile number. Confirm with the patient before creating anything new.
          </Alert>
        ) : null}

        <Card>
          <div className="border-b border-border-soft p-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, UHID, phone number or ABHA address"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs font-medium text-ink-faint transition-colors hover:text-ink"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {!hasQuery ? (
            <EmptyState
              icon={Search}
              title="Search the patient index"
              description="Type at least two characters. Transliterated spellings are matched too — searching “laxmanan” finds “R. Lakshmanan”."
            />
          ) : results.length === 0 ? (
            <EmptyState
              illustration={<PatientIllustration className="h-12 w-12" />}
              title="No patient found"
              description="No record matches that search. Register the patient to continue."
              action={
                <Button size="sm" onClick={() => navigate('/register/new', { state: { prefillName: query } })}>
                  Register new patient
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">Patient</th>
                    <th className="px-5 py-2.5 font-medium">UHID</th>
                    <th className="px-5 py-2.5 font-medium">Age / Sex</th>
                    <th className="px-5 py-2.5 font-medium">Mobile</th>
                    <th className="px-5 py-2.5 font-medium">ABHA</th>
                    <th className="px-5 py-2.5 font-medium">Today</th>
                    <th className="px-5 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ patient, matchedOn, appointmentToday }) => (
                    <tr
                      key={patient.patientId}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={initialsOf(patient.name)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink" title={patient.name}>
                              <button
                                type="button"
                                className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
                                onClick={() => select(patient, `/patients/${patient.uhid}`)}
                              >
                                {patient.name}
                              </button>
                              {patient.nameNative ? (
                                <span className="ml-1.5 text-xs font-normal text-ink-faint">{patient.nameNative}</span>
                              ) : null}
                            </p>
                            <p className="text-2xs uppercase tracking-wide text-primary-text">Matched: {matchedOn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {patient.uhid}
                        {duplicateIds.has(patient.patientId) ? (
                          <Badge tone="warning" className="ml-2 text-2xs">
                            Possible duplicate
                          </Badge>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {patient.age ?? '—'} · {patient.sex}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{patient.mobile}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Badge status={patient.abhaId ? 'Linked' : 'Not linked'} className="text-2xs" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {appointmentToday ? (
                          <span title={`${appointmentToday.provider?.name} · ${appointmentToday.department}`}>
                            {appointmentToday.slot} · {appointmentToday.department}
                          </span>
                        ) : (
                          <span className="text-ink-faint">No appointment</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => select(patient, `/patients/${patient.uhid}`)}
                          >
                            Profile
                          </Button>
                          <Button size="sm" onClick={() => openFlow('schedule', { uhid: patient.uhid })}>
                            Schedule
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
