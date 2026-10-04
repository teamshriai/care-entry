import type { ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { STAT_HUE, TONE_HUE } from '../../utils/statHue'
import type { Tone } from '../../utils/tone'

export interface StatFilterItem<K extends string> {
  key: K
  label: string
  value: ReactNode
  context?: ReactNode
  tone: Tone
  icon: ElementType
}

/**
 * A row of figures that ARE the filter for the list below them — the number
 * and the way to see those records are one control, never a tile plus a
 * separate chip doing the same thing.
 */
export function StatFilter<K extends string>({
  items,
  selected,
  onSelect,
  label,
  columns = 'grid-cols-2 lg:grid-cols-4',
}: {
  items: StatFilterItem<K>[]
  selected: K
  onSelect: (key: K) => void
  label: string
  /** The grid's column classes — four across by default. */
  columns?: string
}) {
  return (
    <div role="group" aria-label={label} className={cn('grid gap-3', columns)}>
      {items.map((item) => {
        const active = item.key === selected
        const hue = STAT_HUE[TONE_HUE[item.tone]]
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.key)}
            className={cn(
              // A phone stacks the icon over the figure so nothing is cut short.
              'flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left transition-all duration-150 sm:flex-row sm:items-center sm:gap-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              hue.card,
              // The chosen figure carries a ring in its own colour.
              active ? cn('shadow-card-md ring-2 ring-offset-2 ring-offset-bg', hue.ring) : 'hover:-translate-y-0.5 hover:shadow-card-md',
            )}
          >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', hue.icon)}>
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={cn('block text-2xl font-bold leading-none tabular-nums', hue.ink)}>{item.value}</span>
              <span className="mt-1 block text-sm font-semibold leading-tight text-ink">{item.label}</span>
              {item.context ? <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-muted">{item.context}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
