import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { TONE_STYLES } from '../../utils/tone'
import type { Tone } from '../../utils/tone'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  illustration,
  illustrationTone,
  tabs,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Optional decorative SVG mark (see components/ui/illustrations) shown
   *  in a soft tinted tile beside the title — a subtle visual anchor for a
   *  major section, never required, never a stand-in for the title text. */
  illustration?: ReactNode
  /** Semantic accent for the illustration tile — reuses the app's existing
   *  tone palette (see utils/tone.ts). Omitted keeps the brand tint. */
  illustrationTone?: Tone
  /** Tabs between the views of one place, set on the header's bottom edge. */
  tabs?: ReactNode
}) {
  const styles = TONE_STYLES[illustrationTone ?? 'brand']
  return (
    <div className={cn('border-b border-border-soft px-4 sm:px-6 lg:px-8', tabs ? 'pt-5' : 'py-5')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3.5">
        {illustration ? (
          <div className={cn('hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex', styles.bg, styles.text)}>
            {illustration}
          </div>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-text">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 gap-2.5">{actions}</div> : null}
      </div>
      {tabs ? <div className="-mb-px mt-4">{tabs}</div> : null}
    </div>
  )
}
