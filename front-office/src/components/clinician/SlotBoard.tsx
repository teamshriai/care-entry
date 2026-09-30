import { cn } from '../../utils/cn'
import type { SlotBoardEntry, SlotStatus } from '../../types/appointment'

// The doctor's whole slot grid for a date — booked slots are shown, not
// hidden, because "10:30 is taken" is information the front desk needs when
// a patient asks for that time. Entries come from
// domain/selectors.getSlotBoard, so every state here is derived from real
// appointment records.
const LABEL: Record<SlotStatus, string> = {
  available: 'Available',
  booked: 'Booked',
  past: 'Passed',
  break: 'Break',
}

export function SlotBoard({
  entries,
  selectedSlot,
  onSelect,
  emptyMessage = 'No slots in this session.',
}: {
  entries: SlotBoardEntry[]
  selectedSlot?: string | null
  onSelect?: (slot: string) => void
  emptyMessage?: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyMessage}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
      {entries.map((entry) => {
        const selectable = entry.status === 'available' && Boolean(onSelect)
        const isSelected = selectedSlot === entry.slot
        return (
          <button
            key={entry.slot}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onSelect?.(entry.slot)}
            title={`${entry.slot} · ${LABEL[entry.status]}`}
            className={cn(
              'rounded-lg border-2 px-3 py-2.5 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              isSelected && 'border-brand-600 bg-brand-600 text-white shadow-sm',
              !isSelected &&
                entry.status === 'available' &&
                'border-stable-border bg-stable-bg text-ink hover:border-brand-500 hover:bg-brand-50 hover:shadow-sm',
              entry.status === 'booked' && 'cursor-not-allowed border-border bg-surface-muted text-ink-faint',
              entry.status === 'past' && 'cursor-not-allowed border-border bg-surface-subtle text-ink-faint',
              entry.status === 'break' && 'cursor-not-allowed border-warning-border bg-warning-bg text-warning',
            )}
          >
            <span className="block text-sm font-semibold tabular-nums">{entry.slot}</span>
            <span
              className={cn(
                'mt-0.5 block text-xs font-semibold uppercase tracking-wide',
                isSelected ? 'text-white/85' : 'opacity-80',
              )}
            >
              {LABEL[entry.status]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
