import type { Tone } from './tone'

/** The figure-card palette (index.css --color-stat-*): a tinted card, a solid
 *  icon square, the figure in the hue's ink, and a ring for the chosen one.
 *  Class names are written out whole so Tailwind can see them. */
export const STAT_HUE = {
  blue: { card: 'bg-stat-blue-bg', icon: 'bg-stat-blue', ink: 'text-stat-blue-ink', ring: 'ring-stat-blue' },
  orange: { card: 'bg-stat-orange-bg', icon: 'bg-stat-orange', ink: 'text-stat-orange-ink', ring: 'ring-stat-orange' },
  purple: { card: 'bg-stat-purple-bg', icon: 'bg-stat-purple', ink: 'text-stat-purple-ink', ring: 'ring-stat-purple' },
  red: { card: 'bg-stat-red-bg', icon: 'bg-stat-red', ink: 'text-stat-red-ink', ring: 'ring-stat-red' },
  teal: { card: 'bg-stat-teal-bg', icon: 'bg-stat-teal', ink: 'text-stat-teal-ink', ring: 'ring-stat-teal' },
  green: { card: 'bg-stat-green-bg', icon: 'bg-stat-green', ink: 'text-stat-green-ink', ring: 'ring-stat-green' },
  indigo: { card: 'bg-stat-indigo-bg', icon: 'bg-stat-indigo', ink: 'text-stat-indigo-ink', ring: 'ring-stat-indigo' },
  pink: { card: 'bg-stat-pink-bg', icon: 'bg-stat-pink', ink: 'text-stat-pink-ink', ring: 'ring-stat-pink' },
  slate: { card: 'bg-stat-slate-bg', icon: 'bg-stat-slate', ink: 'text-stat-slate-ink', ring: 'ring-stat-slate' },
} as const

export type StatHue = keyof typeof STAT_HUE

/** The figure hue for each tone of the app's colour language. */
export const TONE_HUE: Record<Tone, StatHue> = {
  info: 'blue',
  brand: 'blue',
  warning: 'orange',
  critical: 'red',
  stable: 'green',
  teal: 'teal',
  cyan: 'teal',
  indigo: 'indigo',
  purple: 'purple',
  rose: 'pink',
  neutral: 'slate',
}
