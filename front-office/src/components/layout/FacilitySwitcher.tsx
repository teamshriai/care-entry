import { useEffect, useRef, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { facilities } from '../../data/facilities'
import { cn } from '../../utils/cn'

// GP-07 — facility/tenant switcher. Deliberately styled as an obvious,
// clickable control (not a quiet dropdown) since switching facility changes
// authorization scope. Selection is local UI state only — no session/auth
// wiring exists yet (plan §22).
export function FacilitySwitcher({
  facilityId,
  onChange,
}: {
  facilityId: string
  onChange: (facilityId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = facilities.find((facility) => facility.id === facilityId) ?? facilities[0]

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
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary-text" strokeWidth={1.75} />
        <span className="hidden max-w-[12rem] truncate sm:inline">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="menu-surface absolute left-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-xl py-1"
        >
          <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
            Switch facility
          </p>
          {facilities.map((facility) => (
            <button
              key={facility.id}
              type="button"
              role="option"
              aria-selected={facility.id === current.id}
              onClick={() => {
                onChange?.(facility.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted',
                facility.id === current.id ? 'text-primary-text' : 'text-ink',
              )}
            >
              <span className="truncate">{facility.name}</span>
              {facility.id === current.id ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
