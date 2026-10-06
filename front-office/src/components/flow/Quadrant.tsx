import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '../../utils/cn'

/** One quarter of the full-screen appointment page (Schedule and Reschedule): a numbered heading with the current choice,
 *  and the picker below it, always open so the choice can be changed at any time.
 *  On a large screen each quarter scrolls on its own. */
export function Quadrant({
  step,
  title,
  done,
  summary,
  allowOverflow = false,
  children,
}: {
  step: number
  title: string
  done: boolean
  summary?: string
  /** The patient search opens a dropdown that must not be clipped. */
  allowOverflow?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col rounded-xl border bg-surface-1 shadow-card lg:min-h-0',
        done ? 'border-border' : 'border-primary-200',
        allowOverflow && 'relative z-10',
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border-soft px-4 py-3">
        {done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-stable" strokeWidth={2} aria-hidden="true" />
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-2xs font-bold text-on-primary">
            {step}
          </span>
        )}
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {summary ? <span className="ml-auto min-w-0 truncate text-sm font-medium text-ink-muted">{summary}</span> : null}
      </header>
      <div className={cn('px-4 py-4 lg:flex-1 lg:min-h-0', allowOverflow ? 'overflow-visible' : 'lg:overflow-y-auto')}>{children}</div>
    </section>
  )
}

export function Waiting({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border-soft px-4 py-6 text-center text-sm text-ink-subtle">{children}</p>
}

export function SummaryItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className={cn('truncate', value ? 'font-medium text-ink' : 'text-ink-subtle')} title={value ?? undefined}>
        {value ?? '—'}
      </dd>
    </div>
  )
}
