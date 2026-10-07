import type { CSSProperties } from 'react'
import { cn } from './cn'
import { TONE_HEX, toneTint } from './toneHex'
import type { IconTone } from './toneHex'

/** The outer element of a dashboard figure — see components/ui/Figure.tsx. */
export function figureClasses({ interactive, selected }: { interactive: boolean; selected?: boolean }) {
  return cn(
    // The icon sits over the figure (§9.4 KPI tile), so a figure in a six-up
    // row or on a phone keeps whole words.
    'surface-raised relative flex min-w-0 flex-col items-start justify-start gap-2 overflow-hidden rounded-xl border bg-surface-1 p-3 text-left sm:gap-2.5 sm:p-3.5',
    interactive && 'focus-ring surface-raised-hover',
    // The chosen figure is ringed in its own hue (--fig-tone, set by figureStyle).
    selected && 'ring-2 ring-[var(--fig-tone)] ring-offset-2 ring-offset-bg',
  )
}

/**
 * The figure card's surface: a soft glow of its hue in the top-left corner
 * and a faint diagonal sheen, over the card's own white (or dark) surface —
 * premium and calm, never a saturated fill. The hue also tints the edge and
 * is exposed as --fig-tone for the icon tile, the watermark and the
 * selected ring.
 */
export function figureStyle(hue: IconTone, selected?: boolean): CSSProperties {
  const strong = selected ? 0.24 : 0.16
  return {
    '--fig-tone': TONE_HEX[hue],
    borderColor: toneTint(hue, selected ? 0.5 : 0.26),
    backgroundImage: [
      `radial-gradient(130% 110% at 0% 0%, ${toneTint(hue, strong)} 0%, transparent 58%)`,
      `linear-gradient(155deg, ${toneTint(hue, selected ? 0.1 : 0.06)} 0%, transparent 55%)`,
    ].join(', '),
  } as CSSProperties
}

/**
 * A row of figures: a grid from 640px; on a phone a horizontal scroll row
 * (a little over two cards in view, so the next one shows there is more),
 * snapping card by card. `columns` are the grid's column classes.
 */
export function figureRowClass(columns: string) {
  return cn(
    'scrollbar-hide -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-1',
    '[&>*]:w-[44%] [&>*]:min-w-[8.5rem] [&>*]:shrink-0 [&>*]:snap-start',
    'sm:mx-0 sm:grid sm:gap-3 sm:overflow-visible sm:p-0 sm:[&>*]:w-auto sm:[&>*]:min-w-0',
    columns,
  )
}
