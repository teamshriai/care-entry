import { createContext, useContext } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { IconBadge } from './IconBadge'
import { TONE_VAR } from '../../utils/tone'
import type { Tone } from '../../utils/tone'

type CardEmphasis = 'default' | 'critical' | 'quiet'

/** A card's colour, so its header can pick up the same hue. */
const CardAccent = createContext<string | undefined>(undefined)

export function Card({
  className = '',
  emphasis = 'default',
  /** The card's colour: a solid bar along its top edge, a tint of it in the
   *  header, and its edge mixed into the border. The body stays plain so
   *  lists and forms read cleanly; print drops the colour. */
  accentTone,
  children,
  style,
  ...props
}: ComponentPropsWithoutRef<'div'> & { emphasis?: CardEmphasis; accentTone?: Tone }) {
  const emphasisStyles: Record<CardEmphasis, string> = {
    default: 'border border-border bg-surface-1 shadow-card',
    critical: 'border border-critical-border bg-critical-bg',
    quiet: 'border border-border-soft bg-surface-2',
  }
  const accentVar = accentTone ? TONE_VAR[accentTone] : undefined
  const edge = accentVar ? `color-mix(in oklab, var(--color-${accentVar}) 32%, var(--color-border))` : undefined

  return (
    <div
      className={cn('rounded-xl', emphasisStyles[emphasis], accentVar && 'card-accent', className)}
      style={
        accentVar
          ? {
              borderLeftColor: edge,
              borderRightColor: edge,
              borderBottomColor: edge,
              borderTopColor: `var(--color-${accentVar})`,
              borderTopWidth: 3,
              ...style,
            }
          : style
      }
      {...props}
    >
      <CardAccent.Provider value={accentVar}>{children}</CardAccent.Provider>
    </div>
  )
}

export function CardHeader({
  icon: Icon,
  iconTone,
  title,
  subtitle,
  action,
  className = '',
}: {
  icon?: ElementType
  /** Semantic accent for the header icon — reuses the app's existing tone
   *  palette (see utils/tone.ts). Omitted keeps the previous neutral color. */
  iconTone?: Tone
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const accentVar = useContext(CardAccent)
  return (
    <div
      className={cn('flex min-h-11 items-start justify-between gap-4 px-4 pt-4 pb-3 sm:px-5', accentVar && 'card-accent-head rounded-t-[inherit]', className)}
      style={accentVar ? { background: `color-mix(in oklab, var(--color-${accentVar}) 9%, var(--color-surface-1))` } : undefined}
    >
      <div className="flex items-center gap-3">
        {Icon ? <IconBadge icon={Icon} tone={iconTone ?? 'neutral'} size="xs" /> : null}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
