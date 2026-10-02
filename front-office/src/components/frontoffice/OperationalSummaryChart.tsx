import type { ElementType } from 'react'
import { cn } from '../../utils/cn'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import { IconBadge } from '../ui/IconBadge'
import { Card, CardHeader } from '../ui/Card'

// Vivid solid bar fills per tone (tokens in index.css; lighter steps in dark theme).
const BAR_COLOR: Partial<Record<Tone, string>> = {
  info: 'var(--color-bar-blue)',
  indigo: 'var(--color-bar-indigo)',
  stable: 'var(--color-bar-green)',
  warning: 'var(--color-bar-amber)',
  rose: 'var(--color-bar-rose)',
}

export interface OperationalSummaryDatum {
  label: string
  value: number
  /** Short line shown in the hover tooltip beside the metric name and value. */
  context?: string
  icon: ElementType
  tone: Tone
  /** Optional — the row leads somewhere useful, as the KPI card it replaces did. */
  onClick?: () => void
}

// One horizontal bar per operational metric. Purely presentational: every
// value is passed in from the existing getOperationalSummary /
// getPaymentSummary derivations. Bars are solid, sized relative to the
// largest value, and each row prints its number so color is never the only
// carrier of information.
export function OperationalSummaryChart({ data }: { data: OperationalSummaryDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <Card className="h-full">
      <CardHeader title="Operational summary" subtitle="Today's figures at a glance" />
      <div className="flex flex-col gap-1 px-3 pb-4">
        {data.map((d) => {
          const styles = TONE_STYLES[d.tone]
          const widthPercent = d.value > 0 ? Math.max((d.value / max) * 100, 3) : 0
          const row = (
            <>
              <span className="flex w-full shrink-0 items-center gap-2.5 sm:w-52">
                <IconBadge icon={d.icon} tone={d.tone} size="xs" />
                <span className="truncate text-sm font-medium text-ink">{d.label}</span>
              </span>
              <span className="relative h-2.5 min-w-0 flex-1 basis-0 rounded-full bg-surface-3">
                <span
                  className={cn('block h-full rounded-full', styles.bar)}
                  style={{ width: `${widthPercent}%`, backgroundColor: BAR_COLOR[d.tone] }}
                />
                <span
                  role="tooltip"
                  className="menu-surface pointer-events-none absolute -top-9 left-2 z-10 hidden whitespace-nowrap rounded-lg px-2.5 py-1 text-xs text-ink group-hover:block group-focus-visible:block"
                >
                  <span className="font-semibold">{d.label}</span>: {d.value}
                  {d.context ? <span className="text-ink-muted"> · {d.context}</span> : null}
                </span>
              </span>
              <span className={cn('w-9 shrink-0 text-right text-base font-semibold tabular-nums', styles.text)}>
                {d.value}
              </span>
            </>
          )
          const rowClass =
            'group flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg sm:flex-nowrap px-2 py-2 text-left transition-colors'

          return d.onClick ? (
            <button
              key={d.label}
              type="button"
              onClick={d.onClick}
              className={cn(
                rowClass,
                'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              )}
            >
              {row}
            </button>
          ) : (
            <div key={d.label} className={rowClass}>
              {row}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
