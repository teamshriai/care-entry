import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { STAT_HUE } from '../../utils/statHue'
import type { StatHue } from '../../utils/statHue'


/**
 * One dashboard figure, in the clinician portal's compact style: a tinted
 * card, a solid icon square, the figure in the hue's ink, a label and one
 * line saying what it is made of. The whole card opens the place that holds
 * the figure.
 */
export function StatCard({
  icon: Icon,
  hue,
  value,
  label,
  hint,
  to,
  title,
  selected,
  onSelect,
}: {
  icon: ElementType
  hue: StatHue
  value: number | string
  label: string
  hint: string
  /** Where the card opens. Leave out for an information-only card (no button, no click). */
  to?: string
  /** Where the card leads — shown as its tooltip. */
  title?: string
  /** Makes the card a choice on the same page (no navigation): called when it is pressed. */
  onSelect?: () => void
  /** With onSelect: this is the chosen card — ringed in its hue and lifted. */
  selected?: boolean
}) {
  const navigate = useNavigate()
  const style = STAT_HUE[hue]
  const body = (
    <>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', style.icon)}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-2xl font-bold leading-none tabular-nums', style.ink)}>{value}</span>
        <span className="mt-1 block text-sm font-semibold leading-tight text-ink">{label}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-muted">{hint}</span>
      </span>
    </>
  )
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={Boolean(selected)}
        title={title}
        className={cn(
          'focus-ring flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md sm:flex-row sm:items-center sm:gap-3',
          style.card,
          selected && cn('-translate-y-0.5 shadow-card-md ring-2', style.ring),
        )}
      >
        {body}
      </button>
    )
  }
  if (!to) {
    return (
      <div className={cn('flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left sm:flex-row sm:items-center sm:gap-3', style.card)}>
        {body}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      title={title}
      className={cn(
        // A phone stacks the icon over the figure so nothing is cut short.
        'focus-ring flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md sm:flex-row sm:items-center sm:gap-3',
        style.card,
      )}
    >
      {body}
    </button>
  )
}
