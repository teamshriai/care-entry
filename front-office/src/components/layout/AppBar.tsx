import { useState } from 'react'
import { Menu } from 'lucide-react'
import { currentFrontOfficeUser } from '../../data/currentUser'
import { Avatar } from '../ui/Avatar'
import { FacilitySwitcher } from './FacilitySwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationsMenu } from './NotificationsMenu'
import { ThemeToggle } from './ThemeToggle'
import { PatientSearchBox } from '../search/PatientSearchBox'

// GP-01 — app bar. Present on every Front Office screen: facility switcher,
// global search, notifications, language, user identity. Extends the
// clinician portal's Topbar mechanics (left content / right content) with
// the mandatory chrome UI_ATLAS specifies that Topbar didn't yet have.
export function AppBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [facilityId, setFacilityId] = useState(currentFrontOfficeUser.facilityId)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border-soft bg-surface-1/95 px-4 backdrop-blur sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="focus-ring tap-target -ml-1 rounded-lg text-ink-muted hover:bg-surface-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <FacilitySwitcher facilityId={facilityId} onChange={setFacilityId} />

      <div className="flex flex-1 justify-center">
        <PatientSearchBox />
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1.5">
        <ThemeToggle />
        <LanguageSwitcher />
        <NotificationsMenu />
        <div className="ml-0.5 flex items-center gap-2.5 border-l border-border-soft pl-2 sm:ml-1 sm:pl-3">
          <Avatar initials={currentFrontOfficeUser.initials} size="sm" />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-ink">{currentFrontOfficeUser.name}</p>
            <p className="text-xs leading-tight text-ink-subtle">{currentFrontOfficeUser.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
