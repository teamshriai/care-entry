import { useState } from 'react'
import { IdCard, Undo2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PatientPickField } from '../components/patient/PatientPickField'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { getGuestPasses, getPatientById } from '../domain/selectors'
import { getCurrentAdmissionForPatient } from '../domain/patientSelectors'
import { issueGuestPass, returnGuestPass } from '../domain/actions'
import { todayKey } from '../domain/time'
import { formatClock, formatRelativeTime } from '../utils/format'
import { cn } from '../utils/cn'
import type { GuestPass } from '../types/frontDesk'

const DAY_MS = 24 * 60 * 60 * 1000
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other']
const NAMED_WARD = /ward|icu|emergency/i

/** Display text for a stored ward value: short codes read 'Ward 2A', names
 *  that already say what they are ('ICU', 'General Ward') are left alone. */
function wardLabel(ward: string): string {
  return NAMED_WARD.test(ward) ? ward : `Ward ${ward}`
}

export function GuestPassPage() {
  const now = useNow(30000)
  const { notify } = useToast()
  const passes = useStoreValue(getGuestPasses)

  // A pass is for an admitted patient's companion; the ward is the one
  // they are in.
  const [patientId, setPatientId] = useState('')
  const patient = useStoreValue(getPatientById, patientId)
  const stay = useStoreValue(getCurrentAdmissionForPatient, patientId)
  const [relationship, setRelationship] = useState('')
  const [error, setError] = useState<string | null>(null)

  const active = passes.filter((pass) => !pass.returned)
  const returned = passes.filter(
    (pass) => pass.returned && pass.returnedAt !== null && todayKey(new Date(pass.returnedAt)) === todayKey(new Date(now)),
  )

  function handleIssue(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      // The submit button is disabled without a patient, so this only runs
      // once one is selected; the '' fallback just satisfies the type and
      // fails the same server-side validation an undefined id would.
      const pass = issueGuestPass({ patientId: patient?.patientId ?? '', relationship })
      notify('Guest pass issued', { detail: `${pass.passId} · ${pass.patientName}` })
      setRelationship('')
      setPatientId('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not issue pass', { tone: 'error', detail: message })
    }
  }

  function handleReturn(pass: GuestPass) {
    try {
      returnGuestPass(pass.passId)
      notify('Pass returned', { detail: pass.passId })
    } catch (err) {
      notify('Could not return pass', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div>
      <PageHeader
        title="Guest Pass"
        subtitle="A pass for an inpatient's companion — one per patient, for the ward they are in, returned at discharge."
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader icon={IdCard} iconTone="brand" title="Issue a pass" />
          <CardBody>
            <form onSubmit={handleIssue} className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}

              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">
                  Inpatient <span className="text-critical">*</span>
                </p>
                <PatientPickField
                  patient={patient}
                  onChange={(next) => {
                    setPatientId(next.patientId)
                    setError(null)
                  }}
                  scope="inpatients"
                  placeholder="Search an admitted patient by name, mobile or UHID"
                  detail={stay?.wardLabel ? `${stay.wardLabel} · ${stay.bedNumber}` : undefined}
                />
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

              <Button type="submit" disabled={!patient || stay?.status !== 'Admitted' || !relationship}>
                Issue pass{stay?.wardLabel ? ` · ${wardLabel(stay.wardLabel)}` : ''}
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
                      {/* A returned pass always has returnedAt set, by construction of returnGuestPass. */}
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
