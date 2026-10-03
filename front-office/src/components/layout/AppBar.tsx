import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationsMenu } from './NotificationsMenu'
import { ThemeToggle } from './ThemeToggle'
import { PatientSearch } from '../patient/PatientSearch'
import { readFlow } from '../../flows/flowParams'
import indostatesLogo from '../../assets/indostates-logo.png'

/** Pages with their own patient field — the app-bar search steps aside there,
 *  so a screen never shows two search boxes. */
const OWN_PATIENT_FIELD = new Set(['/services/guest-pass', '/services/mlc', '/services/enquiry'])

// GP-01 — app bar, present on every Front Office screen: patient search and
// Register, then notifications, theme, language, user identity, and the
// IndoStates logo (an external link) at the right.
export function AppBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname, search } = useLocation()
  // One search box per screen: a task panel brings its own patient search,
  // and so do the service pages above.
  const showSearch = readFlow(search) === null && !OWN_PATIENT_FIELD.has(pathname)

  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-border-soft bg-bg px-4 py-2.5 sm:px-6 xl:h-16 xl:flex-nowrap xl:gap-4 xl:py-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="focus-ring tap-target -ml-1 rounded-lg text-ink-muted hover:bg-surface-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* The patient search, with Register beside it — hidden while a panel or
          page has its own. Until the bar is wide enough for one row, it takes
          its own full-width row under the icons. */}
      {showSearch ? (
        <div className="order-last flex w-full min-w-0 xl:order-none xl:w-auto xl:flex-1">
          <PatientSearch mode="navigate" />
        </div>
      ) : (
        <div className="hidden xl:block xl:flex-1" aria-hidden="true" />
      )}

      <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5 xl:ml-0">
        <ThemeToggle />
        <div className="hidden sm:flex">
          <LanguageSwitcher />
        </div>
        <NotificationsMenu />
        <UserMenu />
      </div>

      {/* IndoStates — an external link, opened in a new tab so the portal stays open. The
          logo artwork is dark-on-white, so it sits on a white tile. */}
      <a
        href="https://indostates.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="IndoStates (opens indostates.com in a new tab)"
        className="focus-ring ml-1 flex h-11 shrink-0 items-center rounded-lg bg-white px-2.5 sm:ml-2"
      >
        <img src={indostatesLogo} alt="IndoStates Health" className="h-6 w-auto max-w-[6.5rem] object-contain sm:h-9 sm:max-w-none" />
      </a>
    </header>
  )
}
