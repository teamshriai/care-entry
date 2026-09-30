// Reused verbatim from clinician portal's tone system (src/utils/tone.js),
// extended with Front Office-specific statuses. No new colors were added —
// every tone still resolves to the same design tokens defined in index.css.

export type Tone = 'critical' | 'warning' | 'stable' | 'info' | 'brand' | 'neutral' | 'teal' | 'indigo' | 'purple' | 'cyan' | 'rose'

export interface ToneStyle {
  bg: string
  border: string
  text: string
  dot: string
  bar: string
}

export const TONE_STYLES: Record<Tone, ToneStyle> = {
  critical: {
    bg: 'bg-critical-bg',
    border: 'border-critical-border',
    text: 'text-critical',
    dot: 'bg-critical',
    bar: 'bg-critical',
  },
  warning: {
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    text: 'text-warning',
    dot: 'bg-warning',
    bar: 'bg-warning',
  },
  stable: {
    bg: 'bg-stable-bg',
    border: 'border-stable-border',
    text: 'text-stable',
    dot: 'bg-stable',
    bar: 'bg-stable',
  },
  info: {
    bg: 'bg-info-bg',
    border: 'border-info-border',
    text: 'text-info',
    dot: 'bg-info',
    bar: 'bg-info',
  },
  brand: {
    bg: 'bg-brand-50',
    border: 'border-brand-100',
    text: 'text-primary-text',
    dot: 'bg-brand-500',
    bar: 'bg-brand-500',
  },
  neutral: {
    bg: 'bg-surface-muted',
    border: 'border-border',
    text: 'text-ink-muted',
    dot: 'bg-ink-faint',
    bar: 'bg-ink-faint',
  },
  // Function-coded accents (patients/doctors/admissions) — see index.css's
  // own note on --color-teal/-indigo/-purple. Never used for STATUS, only
  // for coloring a section's own icon by what it's about.
  teal: {
    bg: 'bg-teal-bg',
    border: 'border-teal-border',
    text: 'text-teal',
    dot: 'bg-teal',
    bar: 'bg-teal',
  },
  indigo: {
    bg: 'bg-indigo-bg',
    border: 'border-indigo-border',
    text: 'text-indigo',
    dot: 'bg-indigo',
    bar: 'bg-indigo',
  },
  purple: {
    bg: 'bg-purple-bg',
    border: 'border-purple-border',
    text: 'text-purple',
    dot: 'bg-purple',
    bar: 'bg-purple',
  },
  cyan: {
    bg: 'bg-cyan-bg',
    border: 'border-cyan-border',
    text: 'text-cyan',
    dot: 'bg-cyan',
    bar: 'bg-cyan',
  },
  rose: {
    bg: 'bg-rose-bg',
    border: 'border-rose-border',
    text: 'text-rose',
    dot: 'bg-rose',
    bar: 'bg-rose',
  },
}

/** The raw CSS custom property behind each accent tone (see index.css) —
 *  shared by IconBadge, Card, MetricCard, QuickActionTile and the bar chart
 *  so they can mix tints/gradients/glows with `color-mix()` from one place.
 *  `neutral` has no accent by design. */
export const TONE_VAR: Partial<Record<Tone, string>> = {
  critical: 'critical',
  warning: 'warning',
  stable: 'stable',
  info: 'info',
  teal: 'teal',
  indigo: 'indigo',
  purple: 'purple',
  cyan: 'cyan',
  rose: 'rose',
  brand: 'primary-text',
}

const STATUS_TONE: Record<string, Tone> = {
  // Carried over from the clinician portal's convention
  Emergency: 'critical',
  'Under Review': 'warning',
  New: 'info',
  Stable: 'stable',
  Active: 'stable',
  Connected: 'stable',
  Completed: 'stable',
  Scheduled: 'info',
  Pending: 'warning',
  'Pending review': 'warning',
  Outstanding: 'warning',
  Unassigned: 'neutral',
  Eligible: 'stable',
  Indicated: 'stable',
  'Not eligible': 'neutral',
  'Not indicated': 'neutral',
  High: 'critical',
  Medium: 'warning',
  Low: 'neutral',

  // Front Office-specific statuses (M-04)
  Waiting: 'neutral',
  Live: 'neutral',
  Forecast: 'brand',
  'Identity pending': 'warning',
  'Duplicate suspected': 'warning',
  'Checked-in': 'stable',
  'Visit open': 'stable',
  'Visit pending': 'warning',
  Linked: 'stable',
  'Not linked': 'neutral',
  'Consent pending': 'warning',
  Revoked: 'critical',

  // Appointment lifecycle (M-05, extended — see data/appointments.js note)
  'Payment Pending': 'warning',
  Confirmed: 'stable',
  'In consultation': 'indigo',
  Cancelled: 'critical',
  'No-show': 'critical',
  Booked: 'info',
  Called: 'cyan',

  // Derived doctor operational status — computed in domain/selectors.ts
  // (getDoctorStatus) from schedule + leave + breaks + queue state.
  Available: 'stable',
  'Running late': 'warning',
  'Fully booked': 'purple',
  'On break': 'warning',
  'On leave': 'critical',
  'Not scheduled': 'neutral',
  Inactive: 'neutral',
  Blocked: 'neutral',
  Issued: 'info',
  Returned: 'stable',
  Overdue: 'critical',

  // Payment lifecycle — domain/selectors.ts's Payment.status
  Paid: 'stable',
  'Partially Paid': 'warning',
  Refunded: 'info',

  // Estimate lifecycle — types/frontDesk.ts's EstimateStatus
  Draft: 'neutral',
  Saved: 'info',

  // IP Admission — types/admission.ts's BedStatus/AdmissionStatus
  Occupied: 'critical',
  Reserved: 'warning',
  Maintenance: 'neutral',
  Admitted: 'stable',
  'Bed Reserved': 'warning',
  Transferred: 'info',
  Discharged: 'neutral',
}

export function toneFor(status: string | null | undefined): Tone {
  if (!status) return 'neutral'
  return STATUS_TONE[status] ?? 'neutral'
}
