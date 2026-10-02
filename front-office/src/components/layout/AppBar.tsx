import { Menu } from 'lucide-react'
import { currentFrontOfficeUser } from '../../data/currentUser'
import { Avatar } from '../ui/Avatar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationsMenu } from './NotificationsMenu'
import { ThemeToggle } from './ThemeToggle'
import indostatesLogo from '../../assets/indostates-logo.png'

// GP-01 — app bar, present on every Front Office screen: notifications, theme, language,
// user identity, and the IndoStates logo (an external link) at the right.
export function AppBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border-soft bg-bg px-4 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="focus-ring tap-target -ml-1 rounded-lg text-ink-muted hover:bg-surface-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Pushes everything else to the right-hand side. */}
      <div className="flex-1" />

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

      {/* IndoStates — an external link, opened in a new tab so the portal stays open. The
          logo artwork is dark-on-white, so it sits on a white tile. */}
      <a
        href="https://indostates.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="IndoStates (opens indostates.com in a new tab)"
        className="focus-ring ml-1 flex h-11 shrink-0 items-center rounded-lg bg-white px-2.5 sm:ml-2"
      >
        <img src={indostatesLogo} alt="IndoStates Health" className="h-7 w-auto max-w-[8.5rem] object-contain sm:h-9 sm:max-w-none" />
      </a>
    </header>
  )
}
