import { useMemo, useState } from 'react'
import { IdCard, Search, Undo2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { getAttendantPasses, getKnownWards, searchPatients } from '../domain/selectors'
import { issueAttendantPass, returnAttendantPass } from '../domain/actions'
import { formatClock, formatRelativeTime } from '../utils/format'
import { cn } from '../utils/cn'
import type { AttendantPass } from '../types/frontDesk'
import type { Patient } from '../types/patient'

const DAY_MS = 24 * 60 * 60 * 1000
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other']

// Standard wards offered on every install; wards already defined elsewhere in
// the project (bed data, existing passes) are appended by getKnownWards.
// A pass stores the short ward code ('2A') or the full ward name ('ICU',
// 'General Ward'), exactly as the seeded passes do.
const STANDARD_WARDS = ['2A', '2B', '3A', '3B', 'ICU']
const NAMED_WARD = /ward|icu|emergency/i

/** Display text for a stored ward value: short codes read 'Ward 2A', names
 *  that already say what they are ('ICU', 'General Ward') are left alone. */
function wardLabel(ward: string): string {
  return NAMED_WARD.test(ward) ? ward : `Ward ${ward}`
}

export function AttendantPassPage() {
  const now = useNow(30000)
  const { notify } = useToast()
  const { patient: contextPatient } = usePatientContext()
  const knownWards = useStoreValue(getKnownWards)
  const passes = useStoreValue(getAttendantPasses)

  // The patient chosen on this form. Starts from whoever is already in
  // context (selected via the app bar or Find Patient) but is changeable here.
  const [chosenPatient, setChosenPatient] = useState<Patient | null>(null)
  const [changing, setChanging] = useState(false)
  const patient = changing ? null : (chosenPatient ?? contextPatient)
  const [query, setQuery] = useState('')
  const matches = useStoreValue(searchPatients, query)
  const [ward, setWard] = useState('')
  const [relationship, setRelationship] = useState('')
  const wardOptions = useMemo(() => {
    const extra = knownWards.filter((known) => !STANDARD_WARDS.includes(known))
    return [...STANDARD_WARDS, ...extra].map((value) => ({ value, label: wardLabel(value) }))
  }, [knownWards])
  const [error, setError] = useState<string | null>(null)

  const active = passes.filter((pass) => !pass.returned)
  const returned = passes.filter((pass) => pass.returned)

  function handleIssue(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      // The submit button is disabled without a patient, so this only runs
      // once one is selected; the '' fallback just satisfies the type and
      // fails the same server-side validation an undefined id would.
      const pass = issueAttendantPass({ patientId: patient?.patientId ?? '', ward, relationship })
      notify('Attendant pass issued', { detail: `${pass.passId} · ${pass.patientName}` })
      setWard('')
      setRelationship('')
      setChosenPatient(null)
      setChanging(false)
      setQuery('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not issue pass', { tone: 'error', detail: message })
    }
  }

  function handleReturn(pass: AttendantPass) {
    try {
      returnAttendantPass(pass.passId)
      notify('Pass returned', { detail: pass.passId })
    } catch (err) {
      notify('Could not return pass', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendant Pass"
        subtitle="Issue and return attendant passes. One active pass per patient — overdue passes surface on the dashboard."
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader icon={IdCard} iconTone="brand" title="Issue a pass" />
          <CardBody>
            <form onSubmit={handleIssue} className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  Search Patient <span className="text-critical">*</span>
                </label>
                {patient ? (
                  <div className="mt-1.5 flex items-start justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{patient.name}</p>
                      <p className="text-xs text-ink-muted">UHID {patient.uhid}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setChanging(true)
                        setQuery('')
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative mt-1.5">
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                      <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by patient name or UHID"
                        className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                      />
                    </div>
                    {query.trim().length >= 2 ? (
                      <div className="menu-surface absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-xl">
                        {matches.length > 0 ? (
                          <div className="max-h-64 divide-y divide-border-soft overflow-y-auto">
                            {matches.slice(0, 6).map(({ patient: match }) => (
                              <button
                                key={match.patientId}
                                type="button"
                                onClick={() => {
                                  setChosenPatient(match)
                                  setChanging(false)
                                  setQuery('')
                                }}
                                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
                              >
                                <p className="truncate text-sm font-medium text-ink">{match.name}</p>
                                <p className="truncate text-xs text-ink-muted">UHID {match.uhid}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="px-4 py-3 text-sm text-ink-muted">No matching patients</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  Ward <span className="text-critical">*</span>
                </label>
                <select
                  value={ward}
                  onChange={(event) => setWard(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Select Ward</option>
                  {wardOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  Relationship to patient <span className="text-critical">*</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {RELATIONSHIPS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRelationship(option)}
                      className={cn(
                        'rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        relationship === option
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-border bg-surface text-ink hover:bg-surface-muted',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={!patient || !ward || !relationship}>
                Issue pass
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="Active passes"
              subtitle="Outstanding passes, oldest first"
              action={<span className="text-xs tabular-nums text-ink-faint">{active.length}</span>}
            />
            {active.length === 0 ? (
              <EmptyState icon={IdCard} title="No active passes" description="Issued passes appear here until returned." />
            ) : (
              <div className="divide-y divide-border-soft">
                {active.map((pass) => {
                  const overdue = now - pass.issuedAt > DAY_MS
                  return (
                    <div
                      key={pass.passId}
                      className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {pass.passId} · {pass.patientName}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {wardLabel(pass.ward)} · {pass.relationship} · issued {formatRelativeTime(pass.issuedAt, now)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge status={overdue ? 'Overdue' : 'Issued'} />
                        <Button size="sm" variant="secondary" onClick={() => handleReturn(pass)}>
                          <Undo2 className="h-3.5 w-3.5 text-primary-text" strokeWidth={1.75} />
                          Return
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Returned today" action={<span className="text-xs tabular-nums text-ink-faint">{returned.length}</span>} />
            {returned.length === 0 ? (
              <EmptyState title="Nothing returned yet" description="Returned passes are listed here for the shift." />
            ) : (
              <div className="divide-y divide-border-soft">
                {returned.map((pass) => (
                  <div key={pass.passId} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {pass.passId} · {pass.patientName}
                      </p>
                      <p className="text-xs text-ink-muted">{wardLabel(pass.ward)}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                      {/* A returned pass always has returnedAt set, by construction of returnAttendantPass. */}
                      Returned {formatClock(pass.returnedAt!)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
