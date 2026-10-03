import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'

const HUE = {
  blue: { card: 'bg-stat-blue-bg', icon: 'bg-stat-blue', ink: 'text-stat-blue-ink' },
  orange: { card: 'bg-stat-orange-bg', icon: 'bg-stat-orange', ink: 'text-stat-orange-ink' },
  purple: { card: 'bg-stat-purple-bg', icon: 'bg-stat-purple', ink: 'text-stat-purple-ink' },
  red: { card: 'bg-stat-red-bg', icon: 'bg-stat-red', ink: 'text-stat-red-ink' },
  teal: { card: 'bg-stat-teal-bg', icon: 'bg-stat-teal', ink: 'text-stat-teal-ink' },
} as const

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
}: {
  icon: ElementType
  hue: keyof typeof HUE
  value: number | string
  label: string
  hint: string
  to: string
  /** Where the card leads — shown as its tooltip. */
  title: string
}) {
  const navigate = useNavigate()
  const style = HUE[hue]
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
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', style.icon)}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-2xl font-bold leading-none tabular-nums', style.ink)}>{value}</span>
        <span className="mt-1 block text-sm font-semibold leading-tight text-ink">{label}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-muted">{hint}</span>
      </span>
    </button>
  )
}
