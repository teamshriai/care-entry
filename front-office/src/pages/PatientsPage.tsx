import { useLocation, useNavigate } from 'react-router-dom'
import { BedDouble, Copy, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { PatientIllustration } from '../components/ui/illustrations/PatientIllustration'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { StatFilter } from '../components/ui/StatFilter'
import type { StatFilterItem } from '../components/ui/StatFilter'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { getPatientRows } from '../domain/patientSelectors'
import type { PatientListRow } from '../domain/patientSelectors'
import { todayKey } from '../domain/time'
import { formatRupees } from '../utils/billing'
import { initialsOf } from '../utils/format'

type PatientFilter = 'all' | 'today' | 'inpatients' | 'duplicates'

const FILTERS: PatientFilter[] = ['all', 'today', 'inpatients', 'duplicates']

function readFilter(search: string): PatientFilter {
  const value = new URLSearchParams(search).get('filter')
  return FILTERS.includes(value as PatientFilter) ? (value as PatientFilter) : 'all'
}

const EMPTY: Record<PatientFilter, { title: string; description: string }> = {
  all: { title: 'No patients yet', description: 'Registered patients appear here.' },
  today: { title: 'Nobody registered yet today', description: 'Patients registered today appear here.' },
  inpatients: { title: 'Nobody is admitted', description: 'Patients in a bed appear here.' },
  duplicates: { title: 'No possible duplicates', description: 'Records that share a mobile number appear here.' },
}

/**
 * Every registered patient, newest first — each figure is also the filter.
 * A row opens the patient's profile, where everything for them is done;
 * finding someone is the search in the app bar, so there is no second box.
 */
export function PatientsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const now = useNow(60000)
  const filter = readFilter(location.search)
  const rows = useStoreValue(getPatientRows)

  const today = todayKey(new Date(now))
  const isToday = (row: PatientListRow) => todayKey(new Date(row.patient.createdAt)) === today
  const lists: Record<PatientFilter, PatientListRow[]> = {
    all: rows,
    today: rows.filter(isToday),
    inpatients: rows.filter((row) => row.bed),
    duplicates: rows.filter((row) => row.duplicate),
  }
  const shown = lists[filter]

  function selectFilter(next: PatientFilter) {
    const query = new URLSearchParams(location.search)
    query.set('filter', next)
    // A filter is a view of this page, not a place — don't fill history.
    navigate({ search: `?${query.toString()}` }, { replace: true })
  }

  const items: StatFilterItem<PatientFilter>[] = [
    { key: 'all', label: 'All patients', value: rows.length, context: 'Newest first', tone: 'info', icon: Users },
    { key: 'today', label: 'Registered today', value: lists.today.length, context: 'New records', tone: 'stable', icon: UserPlus },
    { key: 'inpatients', label: 'Inpatients', value: lists.inpatients.length, context: 'In a bed now', tone: 'info', icon: BedDouble },
    { key: 'duplicates', label: 'Possible duplicates', value: lists.duplicates.length, context: 'Same mobile number', tone: 'warning', icon: Copy },
  ]

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Every registered patient, newest first. Open one to schedule, bill, admit or discharge."
        illustration={<PatientIllustration className="h-8 w-8" />}
        illustrationTone="teal"
      />

      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <StatFilter label="Show patients" items={items} selected={filter} onSelect={selectFilter} />

        <Card>
          {shown.length === 0 ? (
            <EmptyState
              illustration={<PatientIllustration className="h-12 w-12" />}
              title={EMPTY[filter].title}
              description={EMPTY[filter].description}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
                    <th className="px-5 py-2 font-semibold">Patient</th>
                    <th className="px-5 py-2 font-semibold">Age / Sex</th>
                    <th className="px-5 py-2 font-semibold">UHID</th>
                    <th className="px-5 py-2 font-semibold">Mobile</th>
                    <th className="px-5 py-2 font-semibold">ABHA</th>
                    <th className="px-5 py-2 font-semibold">Now</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => {
                    const { patient } = row
                    const open = () => navigate(`/patients/${patient.uhid}`)
                    return (
                      <tr
                        key={patient.patientId}
                        onClick={open}
                        className="cursor-pointer border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar initials={initialsOf(patient.name)} size="sm" />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  open()
                                }}
                                className="rounded-sm text-left font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-600"
                              >
                                {patient.name}
                              </button>
                              {patient.nameNative ? <span className="block text-xs text-ink-subtle">{patient.nameNative}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                          {patient.age ?? '—'} · {patient.sex}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-muted">{patient.uhid}</td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-muted">{patient.mobile}</td>
                        <td className="max-w-[14rem] truncate whitespace-nowrap px-5 py-3 text-ink-muted" title={patient.abhaId ?? undefined}>
                          {patient.abhaId ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {isToday(row) ? <Badge tone="stable">Registered today</Badge> : null}
                            {row.bed ? <Badge tone="info">In bed {row.bed}</Badge> : null}
                            {row.due > 0 ? (
                              <Badge tone={row.failed ? 'critical' : 'warning'}>
                                {row.failed ? 'Failed' : 'Due'} · {formatRupees(row.due)}
                              </Badge>
                            ) : null}
                            {row.duplicate ? <Badge tone="warning">Possible duplicate</Badge> : null}
                          </div>
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
