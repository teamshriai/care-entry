import { cn } from '../../utils/cn'

// Loading placeholders. Reads from the in-memory store are synchronous
// today, so these only render where a genuinely asynchronous source exists
// or will exist (they are wired through the same props a real fetch would
// drive) — no artificial delay is introduced just to show them.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-muted', className)} />
}

export function TableSkeleton({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border-soft">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} className={cn('h-3', columnIndex === 0 ? 'w-40' : 'w-20')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function MetricSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface px-4 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-6 w-12" />
          <Skeleton className="mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  )
}
