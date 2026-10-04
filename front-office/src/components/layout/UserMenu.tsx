import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { FRONT_OFFICE_STAFF } from '../../data/currentUser'
import { switchUser, useCurrentUser } from '../../hooks/useCurrentUser'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'

/** The name card at the top right: who is signed in, and a list of the
 *  desk's staff to switch to when someone else takes over the desk. */
export function UserMenu() {
  const user = useCurrentUser()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return undefined
    function handleMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    // Open on the person signed in now.
    const index = Math.max(0, FRONT_OFFICE_STAFF.findIndex((s) => s.staffId === user.staffId))
    itemRefs.current[index]?.focus()
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open, user.staffId])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(staffId: string) {
    close()
    if (staffId === user.staffId) return
    const next = switchUser(staffId)
    notify(`Signed in as ${next.name}`, { detail: next.role })
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item))
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const move = (index: number) => {
      event.preventDefault()
      items[(index + items.length) % items.length]?.focus()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') move(at + 1)
    else if (event.key === 'ArrowUp') move(at - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(items.length - 1)
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative ml-0.5 border-l border-border-soft pl-2 sm:ml-1 sm:pl-3">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${user.name}, ${user.role} — switch user`}
        className="focus-ring flex items-center gap-2.5 rounded-lg p-0.5 transition-colors hover:bg-surface-2 sm:py-1 sm:pl-1 sm:pr-1.5"
      >
        <Avatar initials={user.initials} size="sm" />
        <span className="hidden text-right sm:block xl:hidden 2xl:block">
          <span className="block text-sm font-medium leading-tight text-ink">{user.name}</span>
          <span className="block text-xs leading-tight text-ink-subtle">{user.role}</span>
        </span>
        <ChevronDown className={cn('hidden h-4 w-4 shrink-0 text-ink-subtle transition-transform sm:block', open && 'rotate-180')} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch user"
          onKeyDown={handleMenuKeyDown}
          className="menu-surface fixed inset-x-4 top-14 z-40 overflow-hidden rounded-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-72"
        >
          <p className="border-b border-border-soft px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint" aria-hidden="true">
            Switch user
          </p>
          <div className="max-h-80 overflow-y-auto py-1">
            {FRONT_OFFICE_STAFF.map((staff, index) => {
              const current = staff.staffId === user.staffId
              return (
                <button
                  key={staff.staffId}
                  ref={(element) => {
                    itemRefs.current[index] = element
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  onClick={() => choose(staff.staffId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2',
                    current && 'bg-brand-50',
                  )}
                >
                  <Avatar initials={staff.initials} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{staff.name}</span>
                    <span className="block truncate text-xs text-ink-subtle">{staff.role}</span>
                  </span>
                  {current ? <Check className="h-4 w-4 shrink-0 text-primary-text" strokeWidth={2} aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
