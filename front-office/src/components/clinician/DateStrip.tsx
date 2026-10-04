import { cn } from '../../utils/cn'
import { relativeDayLabel } from '../../utils/dates'
import type { DateStripDay } from '../../domain/selectors'

/** Two weeks of one doctor's days — open ones with their free-slot count,
 *  the rest shown as full, on leave or off so the desk can say why. */
export function DateStrip({
  days,
  selected,
  onSelect,
  today,
}: {
  days: DateStripDay[]
  selected: string | null
  onSelect: (date: string) => void
  today: string
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide" role="group" aria-label="Day">
      {days.map((day) => {
        const selectable = day.state === 'open'
        const isSelected = day.date === selected
        return (
          <button
            key={day.date}
            type="button"
            disabled={!selectable}
            aria-pressed={isSelected}
            onClick={() => onSelect(day.date)}
            className={cn(
              'flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 text-xs transition-colors',
              isSelected
                ? 'border-primary-600 bg-primary-600 text-on-primary'
                : selectable
                  ? 'border-border bg-surface-1 text-ink hover:bg-surface-2'
                  : 'cursor-not-allowed border-border-soft bg-surface-2 text-ink-subtle',
            )}
          >
            <span className="font-semibold">{relativeDayLabel(day.date, today)}</span>
            <span className={isSelected ? 'opacity-85' : 'text-ink-muted'}>
              {day.state === 'open' ? `${day.open} open` : day.state === 'full' ? 'Full' : day.state === 'leave' ? 'Leave' : 'Off'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
