import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserRoundPlus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { DoctorIllustration } from '../components/ui/illustrations/DoctorIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DoctorAvailabilityTable } from '../components/clinician/DoctorAvailabilityTable'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useFlow } from '../flows/useFlow'
import { getDoctorRows, getDepartments, getSpecialties, getToday } from '../domain/selectors'
import { cn } from '../utils/cn'
import type { DoctorRow, Provider } from '../types/doctor'

const AVAILABILITY_FILTERS = ['All', 'Bookable now', 'Available', 'Fully booked', 'Unavailable'] as const
type AvailabilityFilter = (typeof AVAILABILITY_FILTERS)[number]

function matchesAvailability(row: DoctorRow, filter: AvailabilityFilter): boolean {
  if (filter === 'All') return true
  if (filter === 'Bookable now') return Boolean(row.nextSlot)
  if (filter === 'Available') return row.status === 'Available'
  if (filter === 'Fully booked') return row.status === 'Fully booked'
  if (filter === 'Unavailable') return ['On leave', 'Not scheduled', 'Inactive'].includes(row.status)
  return true
}

export function DoctorDirectoryPage() {
  const navigate = useNavigate()
  const now = useNow(30000)
  const { openFlow } = useFlow()
  const today = useStoreValue(getToday)

  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All departments')
  const [specialty, setSpecialty] = useState('All specialties')
  const [availability, setAvailability] = useState<AvailabilityFilter>('All')

  const rows = useStoreValue(getDoctorRows, now)
  const departments = useStoreValue(getDepartments)
  const specialties = useStoreValue(getSpecialties)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesTerm =
        term.length === 0 ||
        row.provider.name.toLowerCase().includes(term) ||
        row.provider.specialty.toLowerCase().includes(term) ||
        row.provider.department.toLowerCase().includes(term)
      const matchesDepartment = department === 'All departments' || row.provider.department === department
      const matchesSpecialty = specialty === 'All specialties' || row.provider.specialty === specialty
      return matchesTerm && matchesDepartment && matchesSpecialty && matchesAvailability(row, availability)
    })
  }, [rows, query, department, specialty, availability])

  // Scheduling picks the patient inside the flow; walk-ins start from the
  // patient's profile (Start Consultation), never from here.
  function handleBook(provider: Provider, nextSlot: string | null) {
    openFlow('schedule', nextSlot ? { doctor: provider.providerId, date: today, slot: nextSlot } : { doctor: provider.providerId })
  }

  return (
    <div>
      <PageHeader
        title="Doctor Directory"
        subtitle="Live availability by department and specialty — operational information only, no clinical detail."
        illustration={<DoctorIllustration className="h-8 w-8" />}
        illustrationTone="indigo"
        actions={
          <Button size="sm" onClick={() => navigate('/doctors/register')}>
            <UserRoundPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Register doctor
          </Button>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 xl:flex-row xl:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search doctor, specialty or department"
                className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option>All departments</option>
              {departments.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              className="h-9 max-w-[14rem] rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option>All specialties</option>
              {specialties.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-border-soft px-4 py-2.5">
            {AVAILABILITY_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAvailability(option)}
                className={cn(
                  'rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  availability === option
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-border bg-surface text-ink-muted hover:bg-surface-muted',
                )}
              >
                {option}
              </button>
            ))}
            <span className="ml-auto text-xs text-ink-muted">
              {filtered.length} of {rows.length} doctors
            </span>
          </div>

          <DoctorAvailabilityTable
            rows={filtered}
            onBook={handleBook}
            onOpenProfile={(provider) => navigate(`/doctors/${provider.providerId}`)}
          />
        </Card>
      </div>
    </div>
  )
}
