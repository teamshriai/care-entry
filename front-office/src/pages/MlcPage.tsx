import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileWarning, ShieldCheck, Send } from 'lucide-react'
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
import { getMlcRecords } from '../domain/selectors'
import { registerMlc, markMlcIntimationSent, acknowledgeMlcIntimation } from '../domain/actions'
import { formatRelativeTime, formatClock } from '../utils/format'
import { cn } from '../utils/cn'
import type { MlcCategory } from '../types/frontDesk'

const CATEGORIES: MlcCategory[] = ['Road traffic accident', 'Assault', 'Poisoning', 'Burns', 'Suicide attempt', 'Other']
const BROUGHT_BY = ['Police', 'Relative', 'Bystander', 'Ambulance']

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-ink-faint'

export function MlcPage() {
  const navigate = useNavigate()
  const now = useNow(60000)
  const { notify } = useToast()
  const { patient } = usePatientContext()
  const records = useStoreValue(getMlcRecords)

  const [category, setCategory] = useState<MlcCategory | ''>('')
  const [broughtBy, setBroughtBy] = useState('Police')
  const [policeStation, setPoliceStation] = useState('')
  const [incidentAt, setIncidentAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      // The submit button is disabled without a patient/category, so both
      // fallbacks below only satisfy the type and fail the same validation
      // an empty value would at runtime.
      const record = registerMlc({
        patientId: patient?.patientId ?? '',
        category: category || 'Other',
        broughtBy,
        policeStation,
        incidentAt,
      })
      notify('MLC registered', { detail: `${record.mlcId} · ${record.patientName}` })
      setCategory('')
      setPoliceStation('')
      setIncidentAt('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not register MLC', { tone: 'error', detail: message })
    }
  }

  function run(fn: (id: string) => void, id: string, message: string) {
    try {
      fn(id)
      notify(message)
    } catch (err) {
      notify('Action failed', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div>
      <PageHeader
        title="Medico-Legal Case Registration"
        subtitle="An MLC is always recorded against a patient. Police intimation is captured and acknowledged — never assumed."
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader icon={FileWarning} iconTone="warning" title="Register an MLC" />
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}

              <div>
                <p className="text-xs font-medium text-ink-muted">Patient</p>
                {patient ? (
                  <div className="mt-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-ink">{patient.name}</p>
                    <p className="text-xs text-ink-muted">
                      {patient.uhid} · {patient.age ?? '—'} yrs · {patient.sex}
                    </p>
                  </div>
                ) : (
                  <Alert tone="warning" className="mt-1.5">
                    Select or register the patient first — identity may be pending, but an MLC is always bound to a
                    patient record.{' '}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => navigate('/patients/search')}
                    >
                      Find patient
                    </button>
                  </Alert>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  MLC category <span className="text-critical">*</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      className={cn(
                        'rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        category === option
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-border bg-surface text-ink hover:bg-surface-muted',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  Brought by <span className="text-critical">*</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {BROUGHT_BY.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBroughtBy(option)}
                      className={cn(
                        'rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        broughtBy === option
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-border bg-surface text-ink hover:bg-surface-muted',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">
                  Police station <span className="text-critical">*</span>
                </label>
                <input
                  value={policeStation}
                  onChange={(event) => setPoliceStation(event.target.value)}
                  placeholder="Jurisdiction station"
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted">Incident date & time</label>
                <input
                  type="datetime-local"
                  value={incidentAt}
                  onChange={(event) => setIncidentAt(event.target.value)}
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>

              <Button type="submit" disabled={!patient || !category || !policeStation.trim()}>
                Allocate MLC number
              </Button>
              <p className="text-xs text-ink-faint">
                Records are retained for 10 years, which overrides erasure requests.
              </p>
            </form>
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="MLC register"
            subtitle="Today's medico-legal cases and their intimation status"
            action={<span className="text-xs tabular-nums text-ink-faint">{records.length}</span>}
          />
          {records.length === 0 ? (
            <EmptyState
              icon={FileWarning}
              title="No MLC records"
              description="Registered medico-legal cases appear here with their police intimation status."
            />
          ) : (
            <div className="divide-y divide-border-soft">
              {records.map((record) => (
                <div key={record.mlcId} className="flex flex-col gap-2 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {record.mlcId} · {record.patientName}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {record.category} · brought by {record.broughtBy} · {record.policeStation} ·{' '}
                      {formatRelativeTime(record.registeredAt, now)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {record.acknowledgedAt ? (
                      <Badge tone="stable">Acknowledged {formatClock(record.acknowledgedAt)}</Badge>
                    ) : record.intimationSent ? (
                      <Badge tone="warning">Acknowledgement pending</Badge>
                    ) : (
                      <Badge tone="critical">Intimation pending</Badge>
                    )}
                    {!record.intimationSent ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => run(markMlcIntimationSent, record.mlcId, 'Police intimation sent')}
                      >
                        <Send className="h-3.5 w-3.5 text-info" strokeWidth={1.75} />
                        Send intimation
                      </Button>
                    ) : !record.acknowledgedAt ? (
                      <Button
                        size="sm"
                        onClick={() => run(acknowledgeMlcIntimation, record.mlcId, 'Acknowledgement captured')}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-stable" strokeWidth={1.75} />
                        Capture acknowledgement
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
