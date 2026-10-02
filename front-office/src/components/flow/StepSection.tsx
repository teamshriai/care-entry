import { useId } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Pencil } from 'lucide-react'
import { cn } from '../../utils/cn'

export type StepStatus = 'active' | 'done' | 'locked'

/**
 * One step of a flow. A finished step collapses to a single line showing
 * what was chosen; tapping it opens that step again — there are no Back
 * buttons inside a flow. Steps not reached yet show as a quiet outline, so
 * the desk can see what comes next.
 */
export function StepSection({
  step,
  title,
  status,
  summary,
  onEdit,
  children,
}: {
  step: number
  title: string
  status: StepStatus
  summary?: ReactNode
  onEdit?: () => void
  children?: ReactNode
}) {
  const headingId = useId()

  if (status === 'done') {
    return (
      <button
        type="button"
        onClick={onEdit}
        disabled={!onEdit}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border border-border-soft bg-surface-2 px-4 py-3 text-left transition-colors',
          onEdit ? 'hover:border-border hover:bg-surface-3' : 'cursor-default',
        )}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-stable" strokeWidth={2} aria-hidden="true" />
        <span className="w-24 shrink-0 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">{title}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{summary}</span>
        {onEdit ? (
          <>
            <Pencil className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="sr-only">Change {title.toLowerCase()}</span>
          </>
        ) : null}
      </button>
    )
  }

  if (status === 'locked') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-soft px-4 py-3 text-ink-subtle">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-2xs font-semibold">
          {step}
        </span>
        <span className="text-sm">{title}</span>
      </div>
    )
  }

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-primary-200 bg-surface-1 px-4 py-4 shadow-card">
      <h3 id={headingId} className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-2xs font-bold text-on-primary">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}
