// Small formatting helpers — no date library added, per the plan's
// "no new dependencies unless genuinely required" constraint.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// UI_ATLAS §5.4: dates are DD-MMM-YYYY, times are 24-hour. MM/DD is forbidden.
export function formatHeaderDateTime(date: Date = new Date()): string {
  const weekday = WEEKDAYS[date.getDay()]
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${weekday} ${day}-${month}-${year} · ${hours}:${minutes}`
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

/** 24-hour clock label for a timestamp (UI_ATLAS §5.4 — always 24-hour). */
export function formatClock(timestamp: number): string {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
