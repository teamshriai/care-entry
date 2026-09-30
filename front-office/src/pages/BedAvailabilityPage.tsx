import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { getBeds, getAdmissions } from '../domain/admissionSelectors'
import { WARDS, ROOM_TYPES } from '../types/admission'
import type { BedStatus, RoomType, Ward } from '../types/admission'

const STATUS_FILTERS: (BedStatus | 'All')[] = ['All', 'Available', 'Occupied', 'Reserved', 'Maintenance']

/** Every bed across every ward — the one source of truth Admit Patient's
 *  own bed picker reads from too, so a bed can never be shown available in
 *  one place and occupied in another. */
export function BedAvailabilityPage() {
  const navigate = useNavigate()
  const beds = useStoreValue(getBeds)
  const admissions = useStoreValue(getAdmissions)

  const [query, setQuery] = useState('')
  const [ward, setWard] = useState<'All wards' | Ward>('All wards')
  const [roomType, setRoomType] = useState<'All room types' | RoomType>('All room types')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return beds.filter((bed) => {
      const matchesTerm = term.length === 0 || bed.bedNumber.toLowerCase().includes(term) || bed.roomNumber.toLowerCase().includes(term)
      const matchesWard = ward === 'All wards' || bed.ward === ward
      const matchesRoomType = roomType === 'All room types' || bed.roomType === roomType
      const matchesStatus = status === 'All' || bed.status === status
      return matchesTerm && matchesWard && matchesRoomType && matchesStatus
    })
  }, [beds, query, ward, roomType, status])

  function currentPatientFor(admissionId: string | null) {
    if (!admissionId) return null
    return admissions.find((a) => a.admissionId === admissionId) ?? null
  }

  return (
    <div>
      <PageHeader title="Bed & Ward Availability" subtitle="Every bed, its ward, room type and current status." />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bed or room number..."
                className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <select
              value={ward}
              onChange={(event) => setWard(event.target.value as typeof ward)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option>All wards</option>
              {WARDS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              value={roomType}
              onChange={(event) => setRoomType(event.target.value as typeof roomType)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option>All room types</option>
              {ROOM_TYPES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-border-soft p-3">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={
                  status === option
                    ? 'rounded-full border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                    : 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted'
                }
              >
                {option}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No beds match" description="Try a different search, ward, room type or status." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">Ward</th>
                    <th className="px-5 py-2.5 font-medium">Room</th>
                    <th className="px-5 py-2.5 font-medium">Bed</th>
                    <th className="px-5 py-2.5 font-medium">Room Type</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Current Patient</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bed) => {
                    const patient = currentPatientFor(bed.currentAdmissionId)
                    return (
                      <tr key={bed.bedId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle">
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{bed.ward}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{bed.roomNumber}</td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-ink">{bed.bedNumber}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{bed.roomType}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge status={bed.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                          {patient ? (
                            <button className="text-primary-text hover:underline" onClick={() => navigate(`/admissions/${patient.admissionId}`)}>
                              {patient.patientName}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
