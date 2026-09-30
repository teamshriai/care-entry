import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}: {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return undefined
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  // The scrim is solid (see --color-scrim in index.css), so the page behind a
  // dialog reads as a clean blank surface rather than a blurred but still
  // recognizable calendar/dashboard. No backdrop-filter: behind an opaque
  // fill it renders nothing and only costs a compositing pass.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      <div
        role="dialog"
        aria-modal="true"
        className={cn('glass-strong flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-xl shadow-lg', className)}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
            {description ? <p className="mt-1 text-xs text-ink-faint">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}
