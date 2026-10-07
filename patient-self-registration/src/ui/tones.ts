import type { CSSProperties } from 'react';
import type { IconName } from '../components/Icon';

// Destination hues (DESIGN_SYSTEM §4.4, tier 2) — the same set Front Office
// uses. Used as SOFT TINTS; a solid fill only on the small icon tiles.
export type IconTone = 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red' | 'pink' | 'violet' | 'indigo' | 'cyan' | 'gray';

/** Each hue as its theme-aware token (shared/design-system.css) — softened
 *  mid-saturation colours with their own dark-mode values. A CSS colour
 *  value, so use it in styles and color-mix(); never parse it. */
export const TONE_HEX: Record<IconTone, string> = {
  blue: 'var(--color-hue-blue)',
  teal: 'var(--color-hue-teal)',
  green: 'var(--color-hue-green)',
  amber: 'var(--color-hue-amber)',
  orange: 'var(--color-hue-orange)',
  red: 'var(--color-hue-red)',
  pink: 'var(--color-hue-pink)',
  violet: 'var(--color-hue-violet)',
  indigo: 'var(--color-hue-indigo)',
  cyan: 'var(--color-hue-cyan)',
  gray: 'var(--color-ink-subtle)',
};

export function toneTint(tone: IconTone, alpha: number): string {
  return `color-mix(in oklab, ${TONE_HEX[tone]} ${Math.round(alpha * 1000) / 10}%, transparent)`;
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

/** A solid gradient chip in a hue (icon tile, avatar, count): pair with the
 *  `chip-solid` class, which reads `--tone`. */
export function toneVar(tone: IconTone): CSSProperties {
  return { '--tone': TONE_HEX[tone] } as CSSProperties;
}

/**
 * The figure surface (the front office's KPI tile, utils/figure.ts there): a
 * pastel diagonal of the hue with a soft light in the top-right corner, and
 * the hue in the edge — colourful but calm, never a saturated fill. It layers
 * over the element's own surface (keep `bg-surface-1` and `border` on it), and
 * sets `--tone` so a `chip-solid` icon, `ink-tone` text and a watermark inside
 * pick up the same hue. `strength` scales the tint (1 = the figure tile).
 */
export function figureStyle(tone: IconTone, strength = 1): CSSProperties {
  const t = (alpha: number) => toneTint(tone, alpha * strength);
  return {
    '--tone': TONE_HEX[tone],
    borderColor: toneTint(tone, 0.3),
    backgroundImage: [
      `radial-gradient(90% 80% at 100% 0%, ${t(0.14)} 0%, transparent 60%)`,
      `linear-gradient(140deg, ${t(0.17)} 0%, ${t(0.06)} 55%, ${t(0.02)} 100%)`,
    ].join(', '),
  } as CSSProperties;
}

/**
 * A card's colour (the front office's `Card accentTone`): the hue mixed into
 * the edge and a faint wash of it across the top-left, where the heading sits.
 * The body stays plain so forms and lists read cleanly. Pair with the 2px
 * accent line the component draws along the top edge.
 */
export function washStyle(tone: IconTone): CSSProperties {
  return {
    '--tone': TONE_HEX[tone],
    borderColor: `color-mix(in oklab, ${TONE_HEX[tone]} 24%, var(--color-border-soft))`,
    backgroundImage: [
      `radial-gradient(44rem 12rem at 0% 0%, ${toneTint(tone, 0.12)} 0%, transparent 70%)`,
      `linear-gradient(180deg, ${toneTint(tone, 0.035)} 0, transparent 10rem)`,
    ].join(', '),
  } as CSSProperties;
}

// A person's colour: a hash of the full name (honorifics dropped), so the same
// person is always the same hue and two people who share initials still
// differ. Red is left out — it means "urgent".
const PERSON_TONES: IconTone[] = ['blue', 'teal', 'violet', 'pink', 'orange', 'green', 'indigo', 'cyan'];
const HONORIFIC = /^(dr|prof|shri|smt|sri|mr|mrs|ms|miss|kumari)\.?$/i;

/** "Dr. Asha Rao" → "Asha Rao". */
export function withoutHonorifics(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((part) => !HONORIFIC.test(part))
    .join(' ');
}

export function personTone(name: string): IconTone {
  const key = withoutHonorifics(name).toLowerCase() || '?';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PERSON_TONES[hash % PERSON_TONES.length];
}
