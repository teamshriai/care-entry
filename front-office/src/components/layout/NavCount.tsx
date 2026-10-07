import type { CSSProperties } from 'react'
import { cn } from '../../utils/cn'
import type { NavBadge } from '../../domain/selectors'

const HUE: Record<NavBadge['tone'], string> = {
  critical: 'var(--color-hue-red)',
  warning: 'var(--color-hue-amber)',
  info: 'var(--color-hue-blue)',
}

/**
 * A count beside a place in the navigation. Urgent counts are a solid chip
 * (red); the rest a soft pill in their hue. `dot` is the collapsed rail's
 * form. The count is also said in words for screen readers.
 */
export function NavCount({ badge, dot = false, className }: { badge: NavBadge; dot?: boolean; className?: string }) {
  const style = { '--tone': HUE[badge.tone] } as CSSProperties
  if (dot) {
    return (
      <span style={style} className={cn('chip-solid pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-1', className)} aria-hidden="true" />
    )
  }
  return (
    <span
      style={style}
      title={badge.label}
      className={cn(
        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular-nums',
        badge.tone === 'critical' ? 'chip-solid' : 'ink-tone bg-[color-mix(in_oklab,var(--tone)_16%,var(--color-surface-1))]',
        className,
      )}
    >
      {badge.count > 99 ? '99+' : badge.count}
    </span>
  )
}
