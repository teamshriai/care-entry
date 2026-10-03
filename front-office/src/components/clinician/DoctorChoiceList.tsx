import type { ReactNode } from 'react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { ModeBadge } from '../appointment/ModeBadge'
import { cn } from '../../utils/cn'
import { formatRupees } from '../../utils/billing'
import { relativeDayLabel } from '../../utils/dates'
import { doctorStatusLabel, modesFor } from '../../utils/appointment'
import { initialsOf } from '../../utils/format'
import type { DoctorSuggestion } from '../../domain/selectors'

/**
 * A department's doctors to choose from — fee, how they stand today, and
 * when they are next free, as information only: nothing is chosen until the
 * desk taps a doctor. A doctor with no open slot is shown, greyed, with why.
 */
export function DoctorChoiceList({
  suggestions,
  selectedId,
  onChoose,
  today,
  marker,
  note,
}: {
  suggestions: DoctorSuggestion[]
  selectedId: string | null
  onChoose: (providerId: string) => void
  today: string
  /** A badge beside the name — "Current" in a reschedule. */
  marker?: (suggestion: DoctorSuggestion) => ReactNode
  /** A line under the details — the fee difference in a reschedule. */
  note?: (suggestion: DoctorSuggestion) => ReactNode
}) {
  if (suggestions.length === 0) return <p className="text-sm text-ink-muted">No doctors in this department.</p>
  return (
    <ul className="flex flex-col gap-2">
      {suggestions.map((s) => {
        const modes = modesFor(s.provider)
        const next = s.nextSlots[0]
        const selected = s.provider.providerId === selectedId
        return (
          <li key={s.provider.providerId}>
            <button
              type="button"
              disabled={!s.bookable}
              aria-pressed={selected}
              onClick={() => onChoose(s.provider.providerId)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                selected ? 'border-primary-600 bg-primary-50' : 'border-border hover:bg-surface-2',
                !s.bookable && 'cursor-not-allowed opacity-60 hover:bg-transparent',
              )}
            >
              <Avatar initials={initialsOf(s.provider.name)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                  {s.provider.name}
                  {marker?.(s)}
                  {modes.includes('Teleconsult') ? (
                    modes.length === 1 ? <Badge tone="purple">Teleconsult only</Badge> : <ModeBadge mode="Teleconsult" />
                  ) : null}
                </span>
                <span className="block text-xs text-ink-muted">
                  {s.provider.specialty} · {formatRupees(s.provider.consultationFee)}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {s.bookable && next ? `Next free ${relativeDayLabel(next.date, today)} ${next.slot}` : s.reason}
                </span>
                {note?.(s)}
              </span>
              <Badge status={s.status} className="shrink-0">
                {doctorStatusLabel(s.status)} today
              </Badge>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
