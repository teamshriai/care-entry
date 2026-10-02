import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { notifications } from '../../data/notifications'
import type { NotificationTier } from '../../data/notifications'
import { cn } from '../../utils/cn'

// GP-04 — notification bell, criticality-tiered. Operational content only;
// nothing clinical ever appears here for this persona.
const TIER_DOT: Record<NotificationTier, string> = {
  critical: 'bg-critical',
  urgent: 'bg-warning',
  routine: 'bg-info',
  digest: 'bg-ink-faint',
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications (${notifications.length} unread)`}
        className="relative rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {notifications.length > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[9px] font-semibold text-white">
            {notifications.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="menu-surface absolute right-0 top-[calc(100%+6px)] z-30 w-80 overflow-hidden rounded-xl">
          <p className="border-b border-border-soft px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Notifications
          </p>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 border-b border-border-soft px-4 py-3 last:border-b-0">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', TIER_DOT[item.tier])} />
                <div className="min-w-0">
                  <p className="text-sm text-ink">{item.text}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
