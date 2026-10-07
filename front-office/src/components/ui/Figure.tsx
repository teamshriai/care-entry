import type { ElementType, ReactNode } from 'react'
import type { IconTone } from '../../utils/toneHex'

/**
 * One dashboard figure (DESIGN_SYSTEM §9.4 KPI tile, coloured per §4.4): a
 * white card washed in its destination hue, a soft icon tile, the count in
 * ink and a label. Hue lives in tints — never a saturated fill — and the
 * words carry the meaning, so colour is never the only signal.
 *
 * `figureClasses` + `figureStyle` (utils/figure.ts) style the outer element
 * (a button, link or plain div); `FigureBody` is what goes inside.
 */
export function FigureBody({
  icon: Icon,
  hue,
  value,
  label,
  hint,
}: {
  icon: ElementType
  hue: IconTone
  value: ReactNode
  label: string
  hint?: ReactNode
}) {
  return (
    <>
      {/* A large, faint watermark of the icon in the card's hue. */}
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 text-[var(--fig-tone)] opacity-[0.07] dark:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        data-hue={hue}
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--fig-tone)_30%,transparent),color-mix(in_oklab,var(--fig-tone)_12%,transparent))] text-[color-mix(in_oklab,var(--fig-tone)_70%,black)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_0_0_1px_color-mix(in_oklab,var(--fig-tone)_22%,transparent)] dark:text-[var(--fig-tone)] sm:h-9 sm:w-9"
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="relative w-full min-w-0 [overflow-wrap:break-word] hyphens-auto">
        <span className="block text-xl font-bold leading-none tracking-[-0.03em] tabular-nums text-ink sm:text-2xl">{value}</span>
        <span className="mt-1 block text-xs font-semibold leading-tight text-ink sm:text-sm">{label}</span>
        {hint ? <span className="mt-0.5 line-clamp-2 block text-2xs leading-snug text-ink-muted sm:text-xs">{hint}</span> : null}
      </span>
    </>
  )
}
