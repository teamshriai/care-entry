import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Users,
  IndianRupee,
  Stethoscope,
  IdCard,
  Receipt,
  FileWarning,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import logo from '../../logo.png'

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
  /** A heading for the group; the plain places have none. */
  label?: string
  items: NavItem[]
}

// Places only. Actions — register, schedule, admit, discharge, collect —
// start from the search in the app bar or the patient's profile, so none of
// them has a second home here.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true, tone: 'brand' },
      // One place for patients — everyone, outpatients and inpatients are
      // its tabs, and a patient's profile lives under it too.
      { to: '/patients', label: 'Patients', icon: Users, tone: 'teal' },
      { to: '/billing', label: 'Billing', icon: IndianRupee, tone: 'stable' },
      { to: '/doctors', label: 'Doctors', icon: Stethoscope, tone: 'indigo' },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: '/services/guest-pass', label: 'Guest Pass', icon: IdCard, tone: 'brand' },
      { to: '/services/enquiry', label: 'Enquiry & Estimate', icon: Receipt, tone: 'stable' },
      { to: '/services/mlc', label: 'MLC', icon: FileWarning, tone: 'warning' },
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
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-border-soft bg-bg">
      {/* The SHRI Health mark leads back to the SHRI apps home. */}
      <a
        href="https://shri-ai.org"
        aria-label="SHRI Health — shri-ai.org"
        className="focus-ring flex h-16 items-center gap-2.5 border-b border-border-soft px-5 transition-colors hover:bg-surface-2"
      >
        <img src={logo} alt="" className="h-9 w-auto" />
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">SHRI Health</p>
          <p className="text-xs font-medium leading-tight text-ink-subtle">Care Entry</p>
        </div>
      </a>

      <nav aria-label="Main navigation" className="mt-3 flex flex-1 flex-col gap-4 px-3 pb-4">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `places-${index}`}>
            {group.label ? (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{group.label}</p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, end, tone }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring inline-flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium leading-snug transition-colors',
                      isActive
                        ? 'bg-surface-1 text-primary-text shadow-card'
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

      {/* Which build this is — the time it was made, and its commit on hover. */}
      <p
        className="border-t border-border-soft px-5 py-3 text-2xs font-medium tabular-nums tracking-wide text-ink-subtle"
        title={`Build ${__BUILD_STAMP__} · commit ${__BUILD_COMMIT__}`}
      >
        Version {__BUILD_STAMP__}
      </p>
    </aside>
  )
}
