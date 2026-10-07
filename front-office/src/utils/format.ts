// Small formatting helpers — no date library added, per the plan's
// "no new dependencies unless genuinely required" constraint.
import { formatTimestampTime } from '../domain/time'

export { formatHour, formatTime, formatTimeRange } from '../domain/time'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Dates are DD-MMM-YYYY (MM/DD is forbidden); every time people read is
// 12-hour with AM/PM. (This supersedes UI_ATLAS §5.4's 24-hour rule.)
export function formatHeaderDateTime(date: Date = new Date()): string {
  const weekday = WEEKDAYS[date.getDay()]
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${weekday} ${day}-${month}-${year} · ${formatTimestampTime(date.getTime())}`
}

// UI_ATLAS §4.5 — three confidence bands, never a bare percentage.
export type ConfidenceBand = 'HIGH' | 'MED' | 'LOW'

const CONFIDENCE_LABELS: Record<ConfidenceBand, string> = {
  HIGH: 'High confidence',
  MED: 'Moderate confidence',
  LOW: 'Low confidence — verify',
}

export function confidenceLabel(band: ConfidenceBand): string {
  return CONFIDENCE_LABELS[band] ?? 'Confidence unavailable'
}

/** A timestamp's clock time for people to read — 12-hour, "10:45 AM". */
export function formatClock(timestamp: number): string {
  return formatTimestampTime(timestamp)
}

/** "just now" / "6 min ago" / "2 hr ago" — computed against a supplied
 *  `now` so callers control the clock (see hooks/useNow.ts). */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const minutes = Math.round((now - timestamp) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
