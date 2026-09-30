import type { ElementType, ReactNode } from 'react'
import { Info, AlertTriangle, ShieldCheck } from 'lucide-react'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'
import { cn } from '../../utils/cn'

const ICONS: Partial<Record<Tone, ElementType>> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
  stable: ShieldCheck,
}

export function Alert({
  tone = 'info',
  icon,
  children,
  className = '',
}: {
  tone?: Tone
  icon?: ElementType
  children?: ReactNode
  className?: string
}) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.info
  const Icon = icon ?? ICONS[tone] ?? Info

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
        styles.bg,
        styles.border,
        styles.text,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <div className="leading-relaxed text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </div>
  )
}
