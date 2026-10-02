import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { AppBar } from '../components/layout/AppBar'
import { FlowHost } from '../flows/FlowHost'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink" data-density="compact">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="hidden lg:block print:hidden">
        <Sidebar />
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-scrim" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-50 h-full w-64">
            <Sidebar />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 rounded-full p-1.5 text-ink-muted hover:bg-surface-muted"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AppBar onMenuClick={() => setMobileNavOpen(true)} />
        </div>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Schedule / walk-in / billing / admit / discharge open here, over the page. */}
      <FlowHost />
    </div>
  )
}
