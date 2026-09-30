import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  LayoutGrid,
  Users,
  UserPlus,
  UserRoundPlus,
  IdCard,
  Receipt,
  FileWarning,
  ClipboardList,
  ClipboardPlus,
  BedDouble,
} from 'lucide-react'
import { currentFrontOfficeUser } from '../../data/currentUser'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../utils/cn'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Semantic accent for the icon while the item is NOT active — the active
   *  state keeps its existing brand highlight unchanged either way. Reuses
   *  the app's existing tone palette (see utils/tone.ts). */
  tone?: Tone
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// One sidebar for the whole portal — there is no separate patient or doctor
// navigation. Contextual operations (demographics, ABHA linking, MLC against
// a patient, visit opening) live inside their workflows, not here.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Front Office',
    items: [
      { to: '/front-office', label: 'Dashboard', icon: LayoutGrid, end: true, tone: 'brand' },
      { to: '/patients/search', label: 'Search Patient', icon: Users, tone: 'teal' },
      { to: '/register/new', label: 'Register Patient', icon: UserPlus, tone: 'teal' },
    ],
  },
  {
    label: 'Doctors',
    items: [
      { to: '/doctors/register', label: 'Register Doctor', icon: UserRoundPlus, tone: 'indigo' },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: '/services/attendant-pass', label: 'Attendant Pass', icon: IdCard, tone: 'brand' },
      { to: '/services/enquiry', label: 'Enquiry & Estimate', icon: Receipt, tone: 'stable' },
      { to: '/services/mlc', label: 'MLC', icon: FileWarning, tone: 'warning' },
    ],
  },
  {
    label: 'IP Admission',
    items: [
      { to: '/admissions/new', label: 'Admit Patient', icon: ClipboardPlus, tone: 'purple' },
      { to: '/admissions', label: 'Admissions', icon: ClipboardList, end: true, tone: 'purple' },
      { to: '/admissions/beds', label: 'Bed & Ward Availability', icon: BedDouble, tone: 'purple' },
    ],
  },
]

// Nav rail styled after the Doctors Portal's NavRail — a frosted glass panel,
// pill-shaped items. Active state uses --color-nav-active-bg/-text (see
// index.css): a soft brand tint in light theme, a solid brand-600 pill with
// white text in dark theme, matching the reference screenshot's prominent
// active highlight on a near-black page.
export function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-border-soft bg-surface-1">
      <div className="flex h-16 items-center gap-2.5 border-b border-border-soft px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
          <Building2 className="h-5 w-5 text-on-primary" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">SHRI Health</p>
          <p className="text-xs font-medium leading-tight text-ink-subtle">Care Entry</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="mt-3 flex flex-1 flex-col gap-4 px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, end, tone }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring inline-flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-text'
                        : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        aria-hidden="true"
                        className={cn('shrink-0', tone && TONE_STYLES[tone].text)}
                      />
                      {label}
                      {isActive ? <span className="sr-only">(current page)</span> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border-soft px-4 py-3">
        <Avatar initials={currentFrontOfficeUser.initials} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink">{currentFrontOfficeUser.name}</p>
          <p className="truncate text-xs text-ink-subtle">{currentFrontOfficeUser.role}</p>
        </div>
      </div>
    </aside>
  )
}
