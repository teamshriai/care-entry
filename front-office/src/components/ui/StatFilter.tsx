import type { ElementType, ReactNode } from 'react'
import { IconBadge } from './IconBadge'
import { cn } from '../../utils/cn'
import { TONE_STYLES, TONE_VAR } from '../../utils/tone'
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
        const accent = TONE_VAR[item.tone]
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.key)}
            className={cn(
              'flex flex-col rounded-xl border bg-surface-1 px-4 py-3 text-left transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              active ? 'shadow-card-md' : 'border-border hover:bg-surface-2',
            )}
            style={
              active && accent
                ? {
                    borderColor: `var(--color-${accent})`,
                    boxShadow: `0 0 0 3px color-mix(in oklab, var(--color-${accent}) 18%, transparent)`,
                  }
                : undefined
            }
          >
            <span className="flex items-center gap-2">
              <IconBadge icon={item.icon} tone={item.tone} size="xs" />
              <span className="truncate text-xs font-semibold text-ink-muted">{item.label}</span>
            </span>
            <span className={cn('mt-2 text-2xl font-semibold leading-none tabular-nums', TONE_STYLES[item.tone].text)}>
              {item.value}
            </span>
            <span className="mt-1.5 truncate text-2xs text-ink-subtle">{item.context ?? ' '}</span>
          </button>
        )
      })}
    </div>
  )
}
