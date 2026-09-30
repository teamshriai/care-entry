import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import { DoctorIllustration } from '../ui/illustrations/DoctorIllustration'
import { initialsOf } from '../../utils/format'
import { cn } from '../../utils/cn'
import { doctorStatusLabel } from '../../utils/appointment'
import type { DoctorRow, DoctorStatus, Provider } from '../../types/doctor'

// Purely presentational. Every row's status, next slot, delay and count is
// derived by domain/selectors.getDoctorRows — nothing is hardcoded here and
// no clinical information is ever shown.
const BOOKABLE: DoctorStatus[] = ['Available', 'Running late', 'In consultation', 'On break']
const QUEUEABLE: DoctorStatus[] = ['Available', 'Running late', 'In consultation', 'On break', 'Fully booked']

function statusContext(row: DoctorRow): string | null {
  if (row.status === 'Inactive') return 'Account deactivated'
  if (row.status === 'On leave') return row.schedule?.leaveReason ?? 'Unavailable today'
  if (row.status === 'Not scheduled') return 'No session today'
  if (row.delayMinutes >= 10) return `~${row.delayMinutes} min behind schedule`
  if (row.status === 'Fully booked') return 'No open slots left'
  if (row.schedule?.sessionStart) return `Session ${row.schedule.sessionStart}–${row.schedule.sessionEnd}`
  return null
}

export function DoctorAvailabilityTable({
  rows,
  onBook,
  onViewSlots,
  onWalkIn,
  onOpenProfile,
  patientInContext = false,
  compact = false,
}: {
  rows: DoctorRow[]
  onBook?: (provider: Provider, nextSlot: string | null) => void
  onViewSlots?: (row: DoctorRow) => void
  onWalkIn?: (provider: Provider) => void
  onOpenProfile?: (provider: Provider) => void
  patientInContext?: boolean
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

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', compact ? 'min-w-[380px] [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4' : 'min-w-[760px]')}>
        <thead>
          <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
            <th className="px-5 py-2 font-semibold">Doctor</th>
            <th className="px-5 py-2 font-semibold">Status</th>
            <th className="px-5 py-2 font-semibold">Next slot</th>
            {compact ? null : <th className="px-5 py-2 font-semibold">Today</th>}
            <th className="px-5 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const canBook = BOOKABLE.includes(row.status) && Boolean(row.nextSlot)
            const canWalkIn = patientInContext && QUEUEABLE.includes(row.status)
            return (
              <tr
                key={row.provider.providerId}
                className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initialsOf(row.provider.name)} size="sm" />
                    <div className="min-w-0">
                      {onOpenProfile ? (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(row.provider)}
                          className="block max-w-[14rem] truncate text-left font-medium text-ink transition-colors hover:text-primary-text"
                          title={row.provider.name}
                        >
                          {row.provider.name}
                        </button>
                      ) : (
                        <p className="max-w-[14rem] truncate font-medium text-ink" title={row.provider.name}>
                          {row.provider.name}
                        </p>
                      )}
                      <p className="max-w-[14rem] truncate text-xs text-ink-faint" title={row.provider.specialty}>
                        {compact ? row.provider.department : `${row.provider.department} · ${row.provider.specialty}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge status={row.status}>{doctorStatusLabel(row.status)}</Badge>
                  {compact ? null : <p className="mt-1 text-2xs text-ink-faint">{statusContext(row)}</p>}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="font-medium tabular-nums text-ink">{row.nextSlot ?? '—'}</span>
                  {row.nextSlot ? <p className="text-2xs text-ink-faint">{row.openSlotCount} open</p> : null}
                </td>
                {compact ? null : (
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{row.todaysAppointmentCount} appts</td>
                )}
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {onViewSlots && !compact ? (
                      <Button size="sm" variant="ghost" onClick={() => onViewSlots(row)}>
                        View slots
                      </Button>
                    ) : null}
                    {canWalkIn && onWalkIn ? (
                      <Button size="sm" variant="secondary" onClick={() => onWalkIn(row.provider)}>
                        Walk-in
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={canBook ? 'primary' : 'secondary'}
                      disabled={!canBook}
                      onClick={() => onBook?.(row.provider, row.nextSlot)}
                    >
                      Schedule
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
