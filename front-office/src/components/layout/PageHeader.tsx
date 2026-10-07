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
  pinActions = false,
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
  /** Keep the actions in the top-right corner on phones too, beside the
   *  title, instead of stacking them under it. For one compact action. */
  pinActions?: boolean
}) {
  const styles = TONE_STYLES[illustrationTone ?? 'brand']
  // Compact (staff) page-title recipe, DESIGN_SYSTEM §3.4. It sits inside the
  // shell's page container, so it carries no padding of its own.
  return (
    <div>
      <div
        className={cn(
          'flex gap-2.5 sm:items-end sm:justify-between sm:gap-3',
          pinActions ? 'flex-row items-start justify-between gap-3' : 'flex-col sm:flex-row',
        )}
      >
        <div className="flex min-w-0 items-start gap-3.5">
          {illustration ? (
            <div className={cn('hidden h-12 w-12 shrink-0 items-center justify-center rounded-[14px] sm:flex', styles.bg, styles.text)}>
              {illustration}
            </div>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{eyebrow}</p> : null}
            <h1 className={cn('text-balance break-words text-lg font-bold tracking-[-0.025em] text-ink sm:text-xl lg:text-2xl', eyebrow ? 'mt-1' : null)}>{title}</h1>
            {subtitle ? <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className={cn('flex flex-wrap gap-2.5 sm:shrink-0 sm:justify-end', pinActions && 'shrink-0')}>{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-3 sm:mt-4">{tabs}</div> : null}
    </div>
  )
}
