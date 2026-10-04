import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useLayer } from '../../hooks/useLayer'
import { useFocusTrap } from '../../hooks/useFocusTrap'

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
  if (!open) return null
  return (
    <ModalDialog onClose={onClose} title={title} description={description} footer={footer} className={className}>
      {children}
    </ModalDialog>
  )
}

function ModalDialog({
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  onClose?: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className: string
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  // Escape closes only the topmost layer, so a dialog opened inside a flow
  // sheet closes alone.
  useLayer(true, onClose)
  useFocusTrap(dialog, true)

  // The scrim is solid (see --color-scrim in index.css), so the page behind a
  // dialog reads as a clean blank surface rather than a blurred but still
  // recognizable calendar/dashboard. No backdrop-filter: behind an opaque
  // fill it renders nothing and only costs a compositing pass.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim px-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'glass-strong flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-xl shadow-lg focus:outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-xs text-ink-faint">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-skip-autofocus
            className="rounded-full p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
