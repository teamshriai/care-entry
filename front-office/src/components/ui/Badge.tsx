import type { ReactNode } from 'react'
import { TONE_STYLES, toneFor } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import { cn } from '../../utils/cn'

export function Badge({
  children,
  tone,
  status,
  className = '',
}: {
  children?: ReactNode
  tone?: Tone
  status?: string
  className?: string
}) {
  const resolvedTone = tone ?? toneFor(status) ?? 'neutral'
  const styles = TONE_STYLES[resolvedTone] ?? TONE_STYLES.neutral

  return (
    <span
      className={cn(
        'inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold',
        styles.bg,
        styles.border,
        styles.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
      {children ?? status}
    </span>
  )
}
