import type { ReactNode } from 'react'
import { Activity, ListChecks } from 'lucide-react'
import type { ActivityEvent, ActivityType } from '../../domain/reportSelectors'
import { timeLabel } from '../../utils/activityFormat'
import { formatRupees } from '../../utils/billing'
import { Badge } from '../ui/Badge'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

/** The most records the table lists; it scrolls inside its card. */
const MAX_ROWS = 50

/** How each summary card names itself above its records. */
const DETAIL_TITLE: Record<ActivityType, string> = {
  PATIENT_REGISTERED: 'Patients Registered',
  APPOINTMENT_SCHEDULED: 'Appointments Scheduled',
  PATIENT_CHECKED_IN: 'Patients Checked In',
  GUEST_PASS_ISSUED: 'Guest Passes Issued',
  PATIENT_ADMITTED: 'Admissions',
  PATIENT_DISCHARGED: 'Discharges',
  PAYMENT_COMPLETED: 'Payments',
}

interface Column {
  header: string
  cell: (event: ActivityEvent, withDate: boolean) => ReactNode
  /** Right-align numbers. */
  numeric?: boolean
}

const dash = <span className="text-ink-subtle">—</span>
const text = (value: string | undefined | null) => (value ? value : dash)
const statusBadge = (event: ActivityEvent) => <Badge tone={event.status === 'Completed' ? 'stable' : 'neutral'}>{event.status}</Badge>

const at = (header: string): Column => ({ header, cell: (e, withDate) => timeLabel(e.timestamp, withDate) })
const patient: Column = { header: 'Patient', cell: (e) => <span className="font-medium text-ink">{text(e.patientName)}</span> }
const patientId = (header = 'Patient ID'): Column => ({ header, cell: (e) => <span className="tabular-nums">{text(e.uhid ?? e.patientId)}</span> })
const doctor: Column = { header: 'Doctor', cell: (e) => text(e.doctorName) }
const status: Column = { header: 'Status', cell: statusBadge }
/** A booked slot: the time alone when it is the same day as the activity, else with its date. */
const bookedAt: Column = {
  header: 'Appointment Time',
  cell: (e) =>
    e.appointmentAt === undefined
      ? dash
      : timeLabel(e.appointmentAt, new Date(e.appointmentAt).toDateString() !== new Date(e.timestamp).toDateString()),
}

const COLUMNS: Record<ActivityType, Column[]> = {
  PATIENT_REGISTERED: [at('Time'), patient, patientId('Patient ID / UHID'), { header: 'Registered By', cell: (e) => e.staffName }, status],
  APPOINTMENT_SCHEDULED: [
    at('Time'),
    patient,
    patientId(),
    doctor,
    { header: 'Department', cell: (e) => text(e.department) },
    bookedAt,
    status,
  ],
  PATIENT_CHECKED_IN: [at('Check-in Time'), patient, patientId(), doctor, bookedAt, status],
  GUEST_PASS_ISSUED: [
    at('Time'),
    patient,
    patientId(),
    { header: 'Guest Name', cell: (e) => text(e.guestName) },
    { header: 'Pass Type', cell: (e) => text(e.passType) },
    { header: 'Issued By', cell: (e) => e.staffName },
    status,
  ],
  PATIENT_ADMITTED: [
    at('Admission Time'),
    patient,
    patientId(),
    { header: 'Ward', cell: (e) => text(e.ward) },
    { header: 'Bed', cell: (e) => text(e.bed) },
    { header: 'Admission Type', cell: (e) => text(e.admissionType) },
    doctor,
    status,
  ],
  PATIENT_DISCHARGED: [
    at('Discharge Time'),
    patient,
    patientId(),
    { header: 'Ward', cell: (e) => text(e.ward) },
    doctor,
    { header: 'Discharge Status', cell: (e) => <Badge tone="stable">{e.dischargeType ?? 'Discharged'}</Badge> },
  ],
  PAYMENT_COMPLETED: [
    at('Time'),
    patient,
    patientId(),
    { header: 'Bill / Receipt No.', cell: (e) => <span className="tabular-nums">{text(e.receiptNo)}</span> },
    { header: 'Amount', numeric: true, cell: (e) => <span className="font-medium text-ink">{e.amount === undefined ? '—' : formatRupees(e.amount)}</span> },
    { header: 'Payment Type', cell: (e) => text(e.paymentMethod) },
    status,
  ],
}

/**
 * The records behind one summary card — read-only, on the same page. The
 * columns follow the kind of activity; every value is read off the record the
 * activity came from.
 */
export function ActivityDetails({
  type,
  events,
  periodLabel,
  withDate,
}: {
  type: ActivityType
  events: ActivityEvent[]
  periodLabel: string
  withDate: boolean
}) {
  const columns = COLUMNS[type]
  const rows = events.slice(0, MAX_ROWS)
  const count = `${events.length} ${events.length === 1 ? 'record' : 'records'}`
  return (
    <Card accentTone="brand">
      <CardHeader
        icon={ListChecks}
        iconTone="brand"
        title={DETAIL_TITLE[type]}
        subtitle={`${count} · ${periodLabel}`}
      />
      {events.length === 0 ? (
        <EmptyState icon={Activity} title="No records found" description="There are no activities matching the selected filters." />
      ) : (
        <>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs font-semibold text-ink-muted">
                  {columns.map((column) => (
                    <th key={column.header} className={column.numeric ? 'sticky top-0 bg-surface-2 px-5 py-2 text-right font-semibold' : 'sticky top-0 bg-surface-2 px-5 py-2 font-semibold'}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => (
                  <tr key={event.id} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2">
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        className={column.numeric ? 'whitespace-nowrap px-5 py-2.5 text-right text-ink-muted' : 'whitespace-nowrap px-5 py-2.5 text-ink-muted'}
                      >
                        {column.cell(event, withDate)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length > rows.length ? (
            <p className="border-t border-border-soft px-5 py-3 text-xs text-ink-muted">
              Showing the latest {rows.length} of {events.length} — choose a shorter period to see fewer.
            </p>
          ) : null}
        </>
      )}
    </Card>
  )
}

