import { cn } from '../../utils/cn'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'

export interface BarChartDatum {
  label: string
  value: number
  tone?: Tone
}

/** A small, dependency-free horizontal bar list — no charting library
 *  needed for five rows of "label, bar, count". Bar width is relative to
 *  the largest value in `data`, colored via the app's existing tone tokens
 *  so it re-themes for free in dark mode. Purely a visualization; it reads
 *  whatever counts the caller already computed. */
export function HorizontalBarChart({ data, className = '' }: { data: BarChartDatum[]; className?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {data.map((d) => {
        const styles = TONE_STYLES[d.tone ?? 'neutral']
        const widthPercent = Math.max((d.value / max) * 100, 4)
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', styles.dot)} />
            <p className="w-32 shrink-0 truncate text-xs font-medium text-ink-muted">{d.label}</p>
            <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn('h-full rounded-full', styles.bar)}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <p className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{d.value}</p>
          </div>
        )
      })}
    </div>
  )
}
