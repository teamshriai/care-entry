import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { AppointmentIllustration } from '../ui/illustrations/AppointmentIllustration'
import { cn } from '../../utils/cn'
import { formatClock } from '../../utils/format'
import { appointmentStatusLabel } from '../../utils/appointment'
import type { AppointmentRow, UpcomingAppointmentRow } from '../../types/appointment'

// Arrival column shows the real check-in timestamp from the linked Visit —
// blank until the patient actually arrives, never a placeholder time.
export function AppointmentsTable({
  appointments,
  renderActions,
  renderStatus,
  actionsLabel,
  compact = false,
  maxRows,
  emptyAction,
}: {
  appointments: (AppointmentRow | UpcomingAppointmentRow)[]
  renderActions?: (appointment: AppointmentRow | UpcomingAppointmentRow) => ReactNode
  /** Overrides the Status column's content (default: the generic status
   *  Badge). Lets a specific view — e.g. a simplified check-in status —
   *  replace it without affecting every other place this table is used. */
  renderStatus?: (appointment: AppointmentRow | UpcomingAppointmentRow) => ReactNode
  /** Header label for the trailing actions column (default: none, matching
   *  every existing usage, which treats it as an unlabeled action strip). */
  actionsLabel?: string
  compact?: boolean
  /** Truncates the row list (default: show everything) — independent of
   *  `compact`, which only controls column density. A full-list "view all"
   *  page can use the narrower compact columns without losing rows. */
  maxRows?: number
  emptyAction?: ReactNode
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        illustration={<AppointmentIllustration className="h-11 w-11" />}
        title="No appointments today"
        description="Schedule an appointment to get started."
        action={emptyAction}
      />
    )
  }

  const rows = typeof maxRows === 'number' ? appointments.slice(0, maxRows) : appointments

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', compact ? 'min-w-[380px] [&_td]:px-1.5 [&_th]:px-1.5 [&_td:first-child]:pl-3.5 [&_th:first-child]:pl-3.5 [&_td:last-child]:pr-3.5 [&_th:last-child]:pr-3.5' : 'min-w-[820px]')}>
        <thead>
          <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
            <th className="px-5 py-2 font-semibold">Time</th>
            <th className="px-5 py-2 font-semibold">Patient</th>
            <th className="px-5 py-2 font-semibold">Doctor</th>
            {compact ? null : <th className="px-5 py-2 font-semibold">Department</th>}
            <th className="px-5 py-2 font-semibold">Status</th>
            {compact ? null : <th className="px-5 py-2 font-semibold">Arrival</th>}
            {/* Omitted entirely (not just left empty) when there's nothing to
                act on — a view with no per-row action shouldn't carry a
                trailing blank column just to match this table's usual shape. */}
            {renderActions ? <th className="px-5 py-2 font-semibold">{actionsLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((appointment) => (
            <tr
              key={appointment.appointmentId}
              className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2"
            >
              <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-ink">{appointment.slot}</td>
              <td className="px-5 py-3">
                <p className="max-w-[12rem] truncate text-ink" title={appointment.patient?.name}>
                  {appointment.patient?.name ?? '—'}
                </p>
                {compact ? null : (
                  <p className="text-2xs text-ink-faint">{appointment.patient?.uhid}</p>
                )}
              </td>
              <td className="px-5 py-3">
                <p className="max-w-[11rem] truncate text-ink-muted" title={appointment.provider?.name}>
                  {appointment.provider?.name ?? '—'}
                </p>
              </td>
              {compact ? null : (
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{appointment.department}</td>
              )}
              <td className="whitespace-nowrap px-5 py-3">
                {renderStatus ? (
                  renderStatus(appointment)
                ) : (
                  <Badge status={appointment.status} className={compact ? 'px-2' : undefined}>
                    {appointmentStatusLabel(appointment.status)}
                  </Badge>
                )}
              </td>
              {compact ? null : (
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted tabular-nums">
                  {appointment.visit?.checkInTime ? (
                    <span title="Time the visit was started">{formatClock(appointment.visit.checkInTime)}</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
              )}
              {renderActions ? (
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-1.5">{renderActions(appointment)}</div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
