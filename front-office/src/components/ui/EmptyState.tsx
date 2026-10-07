import type { ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'

/** The empty state (DESIGN_SYSTEM §10.10): a calm message and the next action. */
export function EmptyState({
  icon: Icon,
  /** Optional decorative SVG mark (see components/ui/illustrations) shown
   *  instead of the plain icon well. */
  illustration,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ElementType
  illustration?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {illustration ? (
        <div className="mb-4 text-ink-subtle">{illustration}</div>
      ) : Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
          <Icon size={22} className="text-ink-subtle" aria-hidden="true" />
        </div>
      ) : null}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
