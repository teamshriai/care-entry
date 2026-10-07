import type { CSSProperties } from 'react'
import type { Tone } from './tone'

// Destination hues (DESIGN_SYSTEM §4.4, tier 2). Every navigation
// destination owns one; it appears on the nav glyph, the drawer tile, the
// dashboard section heading and the "Go to" tile, so a place is recognisable
// by colour AND shape. Used as SOFT TINTS — solid fills only on IconTile.

export type IconTone = 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'pink' | 'violet' | 'indigo' | 'gray'

export const TONE_HEX: Record<IconTone, string> = {
  blue: '#0A84FF',
  teal: '#30B0C7',
  green: '#34C759',
  amber: '#FF9F0A',
  orange: '#FF6B2C',
  red: '#FF3B30',
  pink: '#FF2D55',
  violet: '#AF52DE',
  indigo: '#5856D6',
  gray: '#8E8E93',
}

export function toneTint(tone: IconTone, alpha: number): string {
  const hex = TONE_HEX[tone]
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** A card tinted in a tone. The tint is LAYERED over the element's own
 *  surface (keep a bg-surface-* class on it), so it stays opaque and
 *  theme-aware. 0.045 is the card-wash amount; ≤0.10 for buttons. */
export function tintedSurface(tone: IconTone, alpha = 0.08): CSSProperties {
  const tint = toneTint(tone, alpha)
  return {
    backgroundImage: `linear-gradient(${tint}, ${tint})`,
    borderColor: toneTint(tone, Math.min(alpha * 3.5, 0.45)),
  }
}

/** The destination hue for each semantic tone of the app's colour language. */
export const TONE_ICON: Record<Tone, IconTone> = {
  critical: 'red',
  warning: 'amber',
  stable: 'green',
  info: 'blue',
  brand: 'blue',
  neutral: 'gray',
  teal: 'teal',
  cyan: 'teal',
  indigo: 'indigo',
  purple: 'violet',
  rose: 'pink',
}
