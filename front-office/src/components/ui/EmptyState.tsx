import type { ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function EmptyState({
  icon: Icon,
  /** Optional decorative SVG mark (see components/ui/illustrations) shown
   *  instead of the plain icon circle. Purely visual — falls back to the
   *  existing `icon` circle when omitted, so every current call site is
   *  unchanged. */
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
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      {illustration ? (
        <div className="mb-1 text-ink-faint">{illustration}</div>
      ) : Icon ? (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="h-5 w-5 text-ink-faint" strokeWidth={1.5} />
        </div>
      ) : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-xs text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
