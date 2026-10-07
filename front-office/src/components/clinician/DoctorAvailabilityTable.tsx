import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import { DoctorIllustration } from '../ui/illustrations/DoctorIllustration'
import { initialsOf } from '../../utils/format'
import { doctorStatusLabel } from '../../utils/appointment'
import type { DoctorRow, Provider } from '../../types/doctor'
import { ResponsiveTable } from '../ui/ResponsiveTable'
import type { Column } from '../ui/ResponsiveTable'
import { formatTime, formatTimeRange } from '../../domain/time'

// Purely presentational. Every row's status, next slot, delay and count is
// derived by domain/selectors.getDoctorRows — nothing is hardcoded here and
// no clinical information is ever shown.
function statusContext(row: DoctorRow): string | null {
  if (row.status === 'Inactive') return 'Account deactivated'
  if (row.status === 'On leave') return row.schedule?.leaveReason ?? 'Unavailable today'
  if (row.status === 'Not scheduled') return 'No session today'
  if (row.delayMinutes >= 10) return `~${row.delayMinutes} min behind schedule`
  if (row.status === 'Fully booked') return 'No open slots left'
  if (row.schedule?.sessionStart) return `Session ${formatTimeRange(row.schedule.sessionStart, row.schedule.sessionEnd)}`
  return null
}

export function DoctorAvailabilityTable({
  rows,
  onBook,
  onOpenProfile,
  compact = false,
}: {
  rows: DoctorRow[]
  /** Shows a Schedule button per doctor — omit for an information-only list. */
  onBook?: (provider: Provider) => void
  onOpenProfile?: (provider: Provider) => void
  compact?: boolean
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        illustration={<DoctorIllustration className="h-11 w-11" />}
        title="No doctors match"
        description="Try a different name, department, specialty or availability filter."
      />
    )
  }

  const visible = compact ? rows.slice(0, 4) : rows

  const columns: Column<DoctorRow>[] = [
    {
      key: 'doctor',
      header: 'Doctor',
      mobile: 'title',
      sortValue: (row) => row.provider.name,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={row.provider.name} initials={initialsOf(row.provider.name)} size="sm" />
          <div className="min-w-0">
            {onOpenProfile ? (
              <button
                type="button"
                onClick={() => onOpenProfile(row.provider)}
                className="focus-ring -my-3 block max-w-full truncate rounded py-3 text-left font-medium text-ink transition-colors hover:text-primary-text tbl:max-w-[14rem]"
                title={row.provider.name}
              >
                {row.provider.name}
              </button>
            ) : (
              <p className="max-w-full truncate font-medium text-ink tbl:max-w-[14rem]" title={row.provider.name}>
                {row.provider.name}
              </p>
            )}
            <p className="max-w-full truncate text-xs font-normal text-ink-subtle tbl:max-w-[14rem]" title={row.provider.specialty}>
              {compact ? row.provider.department : `${row.provider.department} · ${row.provider.specialty}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'aside',
      cell: (row) => (
        <>
          <Badge status={row.status}>{doctorStatusLabel(row.status)}</Badge>
          {compact ? null : <p className="mt-1 text-2xs text-ink-subtle">{statusContext(row)}</p>}
        </>
      ),
    },
    {
      key: 'next',
      header: 'Next slot',
      className: 'whitespace-nowrap',
      sortValue: (row) => row.nextSlot ?? '99:99',
      cell: (row) => (
        <>
          <span className="font-medium tabular-nums text-ink">{row.nextSlot ? formatTime(row.nextSlot) : '—'}</span>
          {row.nextSlot ? <span className="block text-2xs text-ink-subtle">{row.openSlotCount} open</span> : null}
        </>
      ),
    },
    ...(compact
      ? []
      : [
          {
            key: 'today',
            header: 'Today',
            className: 'whitespace-nowrap text-ink-muted',
            sortValue: (row: DoctorRow) => row.todaysAppointmentCount,
            cell: (row: DoctorRow) => `${row.todaysAppointmentCount} appts`,
          } satisfies Column<DoctorRow>,
        ]),
    ...(onBook
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            className: 'whitespace-nowrap text-right',
            mobile: 'actions',
            cell: (row: DoctorRow) => {
              // The schedule flow looks two weeks ahead, so any active doctor
              // can be booked — not only those with a slot left today.
              const canBook = row.provider.status === 'Active'
              return (
                <Button size="sm" variant={canBook ? 'primary' : 'secondary'} disabled={!canBook} onClick={() => onBook(row.provider)}>
                  Schedule Appointment
                </Button>
              )
            },
          } satisfies Column<DoctorRow>,
        ]
      : []),
  ]

  return <ResponsiveTable rows={visible} columns={columns} rowKey={(row) => row.provider.providerId} caption="Doctors" />
}
