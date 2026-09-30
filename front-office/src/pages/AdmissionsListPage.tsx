import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { AdmissionIllustration } from '../components/ui/illustrations/AdmissionIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { getAdmissions } from '../domain/admissionSelectors'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'
import { WARDS } from '../types/admission'
import type { AdmissionStatus, AdmissionType } from '../types/admission'

const STATUS_FILTERS: (AdmissionStatus | 'All')[] = ['All', 'Pending', 'Bed Reserved', 'Admitted', 'Transferred', 'Discharged', 'Cancelled']
const TYPE_FILTERS: (AdmissionType | 'All')[] = ['All', 'Emergency', 'Elective', 'Transfer']
const DATE_FILTERS = ['All time', 'Today'] as const

/** Every admission across every patient — search by name/UHID/admission
 *  number/phone, filter by status, department, ward, type and date. */
export function AdmissionsListPage() {
  const navigate = useNavigate()
  const admissions = useStoreValue(getAdmissions)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [ward, setWard] = useState<'All wards' | (typeof WARDS)[number]>('All wards')
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>('All time')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const today = todayKey()
    return admissions.filter((a) => {
      const matchesTerm =
        term.length === 0 ||
        a.patientName.toLowerCase().includes(term) ||
        a.patientId.toLowerCase().includes(term) ||
        a.admissionNumber.toLowerCase().includes(term) ||
        a.attendant.phone.toLowerCase().includes(term)
      const matchesStatus = status === 'All' || a.status === status
      const matchesType = type === 'All' || a.admissionType === type
      const matchesWard = ward === 'All wards' || a.wardLabel === ward
      const matchesDate = dateFilter === 'All time' || todayKey(new Date(a.createdAt)) === today
      return matchesTerm && matchesStatus && matchesType && matchesWard && matchesDate
    })
  }, [admissions, query, status, type, ward, dateFilter])

  return (
    <div>
      <PageHeader
        title="Admissions"
        subtitle="Every admission recorded at the counter, across every patient."
        illustration={<AdmissionIllustration className="h-8 w-8" />}
        illustrationTone="purple"
        actions={
          <Button size="sm" onClick={() => navigate('/admissions/new')}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Admit Patient
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient, UHID, admission no. or phone..."
                className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <div className="flex gap-1.5">
              {DATE_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDateFilter(option)}
                  className={
                    dateFilter === option
                      ? 'rounded-full border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                      : 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted'
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-3">
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500">
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All statuses' : option}
                </option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500">
              {TYPE_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All admission types' : option}
                </option>
              ))}
            </select>
            <select value={ward} onChange={(e) => setWard(e.target.value as typeof ward)} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500">
              <option>All wards</option>
              {WARDS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              illustration={<AdmissionIllustration className="h-11 w-11" />}
              title="No admissions found"
              description="Try a different search or filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">Admission No.</th>
                    <th className="px-5 py-2.5 font-medium">Patient</th>
                    <th className="px-5 py-2.5 font-medium">UHID</th>
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Doctor</th>
                    <th className="px-5 py-2.5 font-medium">Department</th>
                    <th className="px-5 py-2.5 font-medium">Ward</th>
                    <th className="px-5 py-2.5 font-medium">Bed</th>
                    <th className="px-5 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.admissionId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-primary-text">{a.admissionNumber}</td>
                      <td className="px-5 py-3 text-ink">{a.patientName}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.patientId}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {formatDateKey(todayKey(new Date(a.createdAt)))} · {formatClock(a.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.doctorName}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.department}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.wardLabel ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.bedNumber ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.admissionType}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Badge status={a.status} />
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
