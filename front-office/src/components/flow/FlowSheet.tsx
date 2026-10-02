import { useId, useRef } from 'react'
import type { ElementType, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconBadge } from '../ui/IconBadge'
import { useLayer } from '../../hooks/useLayer'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { Tone } from '../../utils/tone'

/**
 * The surface every flow (schedule, walk-in, billing, admit, discharge) runs
 * in: a full-height panel over the right of the current page, so the page
 * the desk started from stays where it is underneath and is back the moment
 * the flow closes. Escape and the close button both close it; clicking the
 * dimmed page does not, so a half-finished flow is never lost by a stray click.
 */
export function FlowSheet({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  onClose,
  children,
  footer,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ElementType
  iconTone?: Tone
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useLayer(true, onClose)
  useFocusTrap(panel, true)

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end print:hidden">
      <div className="absolute inset-0 bg-scrim" aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-2xl flex-col bg-surface-1 shadow-lg focus:outline-none animate-[sheetIn_180ms_ease-out]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <IconBadge icon={icon} tone={iconTone} size="sm" /> : null}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-ink">
                {title}
              </h2>
              {subtitle ? <div className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</div> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-skip-autofocus
            className="tap-target rounded-full text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="border-t border-border-soft px-5 py-4">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
