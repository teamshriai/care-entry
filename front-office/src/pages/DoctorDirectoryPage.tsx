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
import { getDoctorRows, getDepartments, getSpecialties } from '../domain/selectors'
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

  // Scheduling picks the patient, then when — now as a walk-in, or a time
  // to book — inside the flow; the doctor is all this page settles.
  function handleBook(provider: Provider) {
    openFlow('schedule', { doctor: provider.providerId })
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

      <div className="mt-5 sm:mt-6">
        <Card accentTone="indigo">
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-soft bg-surface-1 px-3 transition-colors hover:border-border-strong focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/10">
              <Search className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search doctor, specialty or department"
                aria-label="Search doctors"
                className="min-h-11 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
              />
            </div>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              aria-label="Department"
              className="focus-ring min-h-11 rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink"
            >
              <option>All departments</option>
              {departments.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              aria-label="Specialty"
              className="focus-ring min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface-1 px-3 text-sm text-ink sm:max-w-[14rem]"
            >
              <option>All specialties</option>
              {specialties.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-4 py-3" role="group" aria-label="Availability">
            {AVAILABILITY_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={availability === option}
                onClick={() => setAvailability(option)}
                className={cn(
                  'focus-ring min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  availability === option
                    ? 'border-primary-600 bg-primary-600 text-on-primary shadow-card'
                    : 'border-border-soft bg-surface-1 text-ink-muted hover:border-border-strong hover:text-ink',
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
