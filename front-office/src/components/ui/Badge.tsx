import type { ReactNode } from 'react'
import { TONE_STYLES, toneFor } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import { cn } from '../../utils/cn'

type BadgeSize = 'xs' | 'sm' | 'md'

const SIZES: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-2xs rounded-full gap-1',
  sm: 'px-2.5 py-0.5 text-xs rounded-full gap-1.5',
  md: 'px-3 py-1 text-xs rounded-full gap-1.5',
}

/**
 * StatusBadge (DESIGN_SYSTEM §10.6): always words, never colour alone. The
 * tone comes from `tone`, or from the status word via utils/tone.ts. A long
 * label truncates inside its container instead of widening the page.
 */
export function Badge({
  children,
  tone,
  status,
  size = 'sm',
  dot = true,
  className = '',
}: {
  children?: ReactNode
  tone?: Tone
  status?: string
  size?: BadgeSize
  /** The leading dot; `false` for a compact chip. */
  dot?: boolean
  className?: string
}) {
  const resolvedTone = tone ?? toneFor(status) ?? 'neutral'
  const styles = TONE_STYLES[resolvedTone] ?? TONE_STYLES.neutral

  return (
    <span
      className={cn(
        'inline-flex max-w-full select-none items-center whitespace-nowrap border font-semibold',
        SIZES[size],
        styles.bg,
        styles.border,
        styles.text,
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)} /> : null}
      <span className="inline-flex min-w-0 items-center gap-1 truncate">{children ?? status}</span>
    </span>
  )
}
