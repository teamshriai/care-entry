import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../utils/cn'

/** One quarter of the full-screen appointment page (Schedule and Reschedule):
 *  a numbered heading with the current choice, and the picker below it,
 *  always open so the choice can be changed at any time. The step to do next
 *  is highlighted. On a large screen each quarter scrolls on its own. */
export function Quadrant({
  id,
  step,
  title,
  done,
  current = false,
  summary,
  allowOverflow = false,
  scrollFrom = 'lg',
  className,
  children,
}: {
  /** An anchor for the step rail to scroll to. */
  id?: string
  step: number
  title: string
  done: boolean
  /** This is the next thing to do. */
  current?: boolean
  summary?: string
  /** The patient search opens a dropdown that must not be clipped. */
  allowOverflow?: boolean
  /** From which width the section has a fixed height and scrolls on its own. */
  scrollFrom?: 'lg' | 'xl'
  /** Grid placement. */
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        'surface-raised flex min-w-0 scroll-mt-3 flex-col rounded-xl border bg-surface-1 transition-[border-color,box-shadow] duration-300',
        scrollFrom === 'lg' ? 'lg:min-h-0' : 'xl:min-h-0',
        current
          ? 'border-primary-600/60 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary-500)_14%,transparent)]'
          : 'border-border-soft',
        allowOverflow && 'relative z-10',
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border-soft px-3.5 py-2.5 sm:px-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold',
            done
              ? 'bg-success-bg text-success-fg'
              : current
                ? 'bg-[image:var(--gradient-primary)] text-on-primary shadow-card-sm'
                : 'bg-surface-2 text-ink-subtle',
          )}
        >
          {done ? <Check size={13} strokeWidth={3} /> : step}
        </span>
        <h3 className="text-sm font-semibold text-ink">
          <span className="sr-only">Step {step}: </span>
          {title}
          {done ? <span className="sr-only"> (done)</span> : null}
        </h3>
        {summary ? <span className="ml-auto min-w-0 truncate text-sm font-medium text-ink-muted">{summary}</span> : null}
      </header>
      <div
        className={cn(
          'px-3.5 py-3.5 sm:px-4',
          scrollFrom === 'lg' ? 'lg:min-h-0 lg:flex-1' : 'xl:min-h-0 xl:flex-1',
          allowOverflow ? 'overflow-visible' : scrollFrom === 'lg' ? 'lg:overflow-y-auto lg:overscroll-contain' : 'xl:overflow-y-auto xl:overscroll-contain',
        )}
      >
        {children}
      </div>
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

export interface RailStep {
  label: string
  done: boolean
  current: boolean
  /** The quadrant id to jump to. */
  target: string
}

/** The flow's progress: Patient · Department · Doctor · Time, each done,
 *  current or still to come. Tapping a step brings its section into view
 *  (on a phone the sections are stacked). */
export function StepRail({ steps }: { steps: RailStep[] }) {
  return (
    <ol className="scrollbar-hide -mx-1 mb-3 flex items-center gap-1 overflow-x-auto px-1 pb-0.5" aria-label="Booking steps">
      {steps.map((step, index) => (
        <li key={step.label} className="flex shrink-0 items-center gap-1">
          {index > 0 ? <span aria-hidden="true" className={cn('h-px w-4 sm:w-8', steps[index - 1].done ? 'bg-success-fg/50' : 'bg-border')} /> : null}
          <button
            type="button"
            aria-current={step.current ? 'step' : undefined}
            onClick={() => {
              const section = document.getElementById(step.target)
              section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              section?.querySelector<HTMLElement>('input, button:not([disabled])')?.focus({ preventScroll: true })
            }}
            className={cn(
              'focus-ring flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors',
              step.current
                ? 'border-primary-600/50 bg-primary-50 text-primary-text'
                : step.done
                  ? 'border-success-fg/25 bg-success-bg text-success-fg'
                  : 'border-border-soft bg-surface-1 text-ink-subtle hover:text-ink',
            )}
          >
            <span aria-hidden="true" className="tabular-nums">
              {step.done ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            {step.label}
            {step.done ? <span className="sr-only"> (done)</span> : null}
          </button>
        </li>
      ))}
    </ol>
  )
}
