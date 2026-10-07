import type { CSSProperties } from 'react';
import type { IconName } from '../components/Icon';

// Destination hues (DESIGN_SYSTEM §4.4, tier 2) — the same set Front Office
// uses. Used as SOFT TINTS; a solid fill only on the small icon tiles.
export type IconTone = 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'pink' | 'violet' | 'indigo' | 'gray';

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
};

export function toneTint(tone: IconTone, alpha: number): string {
  const hex = TONE_HEX[tone];
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A card washed in a tone, layered over its own surface (keep a bg-surface-*
 *  class on it) so it stays opaque and theme-aware. */
export function tintedSurface(tone: IconTone, alpha = 0.045): CSSProperties {
  const tint = toneTint(tone, alpha);
  return { backgroundImage: `linear-gradient(${tint}, ${tint})`, borderColor: toneTint(tone, Math.min(alpha * 3.5, 0.45)) };
}

/**
 * Each subject keeps one hue everywhere it appears — identity is violet,
 * health is pink, place is teal, dates are indigo, time is orange, documents
 * are amber, verification is green — so a patient can tell sections apart by
 * colour as well as by title. Anything not listed is blue.
 */
const SUBJECT_TONE: Partial<Record<IconName, IconTone>> = {
  idCard: 'violet',
  brainPulse: 'violet',
  message: 'violet',
  heartPulse: 'pink',
  pill: 'pink',
  activity: 'pink',
  mapPin: 'teal',
  hospital: 'teal',
  calendar: 'indigo',
  clock: 'orange',
  file: 'amber',
  shieldCheck: 'green',
  checkCircle: 'green',
  lock: 'green',
};

export function toneOf(name: IconName): IconTone {
  return SUBJECT_TONE[name] ?? 'blue';
}
