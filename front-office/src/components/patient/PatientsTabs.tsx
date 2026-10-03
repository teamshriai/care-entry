import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BedDouble, CalendarClock, Users } from 'lucide-react'
import { useStoreValue } from '../../hooks/useStore'
import { useNow } from '../../hooks/useNow'
import { getPatientRows } from '../../domain/patientSelectors'
import { getOutpatients } from '../../domain/outpatientSelectors'
import { getInpatientRows } from '../../domain/admissionSelectors'
import { cn } from '../../utils/cn'

/**
 * The three views of the one Patients place: everyone registered, today's
 * outpatients (bookings, walk-ins, the queue) and the inpatients (beds,
 * admissions, discharges). Each tab carries its live count.
 */
export function PatientsTabs() {
  const now = useNow(60000)
  const all = useStoreValue(getPatientRows).length
  const outpatients = useStoreValue(getOutpatients, now, 'today', false, '').counts.today
  const inpatients = useStoreValue(getInpatientRows, now).length

  const tabs: { to: string; label: string; icon: LucideIcon; count: number; end?: boolean; title: string }[] = [
    { to: '/patients', label: 'All patients', icon: Users, count: all, end: true, title: 'Every registered patient' },
    { to: '/patients/outpatients', label: 'Outpatients', icon: CalendarClock, count: outpatients, title: 'Bookings and walk-ins today' },
    { to: '/patients/inpatients', label: 'Inpatients', icon: BedDouble, count: inpatients, title: 'Admitted now' },
  ]

  return (
    <nav aria-label="Patients" className="scrollbar-hide flex gap-1 overflow-x-auto">
      {tabs.map(({ to, label, icon: Icon, count, end, title }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={title}
          className={({ isActive }) =>
            cn(
              'focus-ring inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 pb-2.5 pt-1.5 text-sm font-semibold transition-colors',
              isActive ? 'border-primary-600 text-primary-text' : 'border-transparent text-ink-muted hover:border-border hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-2xs font-bold tabular-nums',
                  isActive ? 'bg-primary-50 text-primary-text' : 'bg-surface-2 text-ink-muted',
                )}
              >
                {count}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
