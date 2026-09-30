import type { ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { TONE_STYLES, TONE_VAR } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import { IconBadge } from '../ui/IconBadge'

// Compact operational metric: label, the number, and one line of context
// that makes the number actionable ("avg wait 18 min"). Clickable when it
// leads somewhere useful. Deliberately small — this is a glance strip, not
// a row of hero cards. `icon` is optional so every existing call site
// (no icon) is unchanged; passing one adds the shared IconBadge container
// above the label, colored by `iconTone` (falls back to `tone`).
export function MetricCard({
  label,
  value,
  context,
  tone,
  icon,
  iconTone,
  onClick,
}: {
  label: ReactNode
  value: ReactNode
  context?: ReactNode
  tone?: Tone
  icon?: ElementType
  iconTone?: Tone
  onClick?: () => void
}) {
  const styles = TONE_STYLES[tone ?? 'neutral'] ?? TONE_STYLES.neutral
  const className = cn(
    'group rounded-xl border border-t-[3px] border-border bg-[var(--color-card)] px-4 py-3 text-left transition-all duration-150',
    onClick &&
      'hover:-translate-y-0.5 hover:border-border hover:bg-surface-subtle hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  )
  const accentVar = TONE_VAR[iconTone ?? tone ?? 'neutral']
  const accentStyle = accentVar
    ? {
        borderColor: `color-mix(in srgb, var(--color-${accentVar}) 38%, transparent)`,
        borderTopColor: `var(--color-${accentVar})`,
      }
    : undefined
  const content = (
    <>
      {icon ? (
        <IconBadge icon={icon} tone={iconTone ?? tone ?? 'brand'} size="sm" interactive={Boolean(onClick)} className="mb-2" />
      ) : null}
      <p className="truncate text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums leading-none', tone ? styles.text : 'text-ink')}>
        {value}
      </p>
      <p className="mt-1.5 truncate text-2xs text-ink-faint">{context ?? ' '}</p>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} style={accentStyle}>
        {content}
      </button>
    )
  }

  return (
    <div className={className} style={accentStyle}>
      {content}
    </div>
  )
}

export function MetricRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{children}</div>
}
