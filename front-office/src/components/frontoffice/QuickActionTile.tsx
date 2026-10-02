import { useNavigate } from 'react-router-dom'
import type { ElementType } from 'react'
import { cn } from '../../utils/cn'
import type { Tone } from '../../utils/tone'
import { IconBadge } from '../ui/IconBadge'

// A single quick-action launcher. Plain <button> so click, Tab+Enter and
// Tab+Space all work with no extra wiring. No AI badge or decoration here —
// AI touchpoints belong inside the destination screens, not the launcher.
const PRIMARY_TILE = {
  blue: 'bg-action-blue text-white',
  emerald: 'bg-action-emerald text-white',
  coral: 'bg-action-coral text-white',
  amber: 'bg-action-amber text-white',
  purple: 'bg-action-purple text-white',
  turquoise: 'bg-action-turquoise text-white',
  magenta: 'bg-action-magenta text-white',
} as const

export function QuickActionTile({
  icon: Icon,
  iconTone,
  primaryColor,
  label,
  count,
  hint,
  to,
  state,
  variant = 'secondary',
  dense = false,
}: {
  icon: ElementType
  /** Semantic accent for the icon (secondary/dense tiles only — a primary
   *  tile's icon stays white on its solid brand background). Reuses the
   *  app's existing tone palette (see utils/tone.ts). */
  iconTone?: Tone
  /** Solid tile hue for a primary tile's fill (--color-action-*, bright solid fills). */
  primaryColor?: 'blue' | 'emerald' | 'coral' | 'amber' | 'purple' | 'turquoise' | 'magenta'
  label: string
  /** Optional figure shown opposite the icon (e.g. today's discharges, ₹ due). */
  count?: number | string
  /** A line under the label that says what the figure is made of. */
  hint?: string
  to?: string
  state?: Record<string, unknown>
  variant?: 'primary' | 'secondary'
  dense?: boolean
}) {
  const navigate = useNavigate()

  const isPrimary = variant === 'primary'

  function handleClick() {
    if (to) navigate(to, state ? { state } : undefined)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group focus-ring flex flex-col items-start rounded-xl border text-left transition-all duration-200',
        dense ? 'gap-2 p-3' : 'gap-3 p-4',
        'shadow-card hover:-translate-y-0.5 hover:shadow-card-md',
        isPrimary
          ? cn('border-transparent', PRIMARY_TILE[primaryColor ?? 'blue'])
          : 'border-border bg-surface-1 hover:border-border-strong',
      )}
    >
      <div className={count !== undefined ? 'flex w-full flex-wrap items-start justify-between gap-2' : undefined}>
        {isPrimary ? (
          <span
            className={cn(
              'flex items-center justify-center rounded-lg bg-white/15 transition-transform duration-150 group-hover:scale-105',
              dense ? 'h-7 w-7' : 'h-9 w-9',
            )}
          >
            <Icon className={cn(dense ? 'h-4 w-4' : 'h-[18px] w-[18px]', 'text-current')} strokeWidth={2} />
          </span>
        ) : (
          <IconBadge icon={Icon} tone={iconTone ?? 'neutral'} size={dense ? 'xs' : 'sm'} interactive />
        )}
        {count !== undefined ? (
          <span className="text-xl font-semibold leading-none tabular-nums text-current sm:text-2xl">{count}</span>
        ) : null}
      </div>
      <span className={cn(dense ? 'text-xs font-medium' : 'text-sm font-semibold', isPrimary ? 'text-current' : 'text-ink')}>
        {label}
        {hint ? <span className="mt-0.5 block text-2xs font-normal text-ink-subtle">{hint}</span> : null}
      </span>
    </button>
  )
}
