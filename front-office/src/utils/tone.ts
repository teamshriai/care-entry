// The app's tone system. Every tone resolves to a design token defined in
// index.css; STATUS_TONE below maps each status word to one of them.

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
 *  shared by IconBadge, Card, StatFilter and QuickActionTile so they can mix
 *  tints/gradients/glows with `color-mix()` from one place.
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

// One colour language for every status in the app:
//   red (critical)  — critical, failed, emergency
//   yellow (warning) — needs attention: pending, partial, running late, overdue
//   blue (info)     — normal, in progress: confirmed, checked in, admitted, in queue
//   green (stable)  — paid, available, linked
//   grey (neutral)  — closed or not applicable: completed, cancelled, discharged
const STATUS_TONE: Record<string, Tone> = {
  Emergency: 'critical',
  'Under Review': 'warning',
  New: 'info',
  Stable: 'stable',
  Active: 'stable',
  Connected: 'stable',
  Completed: 'neutral',
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
  // Front-office risk dot — see domain/patientSelectors.ts
  Watch: 'warning',
  Normal: 'info',

  // Front desk
  Waiting: 'info',
  Live: 'neutral',
  Forecast: 'brand',
  'Identity pending': 'warning',
  'Duplicate suspected': 'warning',
  'Checked-in': 'info',
  Linked: 'stable',
  'Not linked': 'neutral',
  'Consent pending': 'warning',
  Revoked: 'critical',

  // Appointment lifecycle
  'Payment Pending': 'warning',
  Confirmed: 'info',
  'In consultation': 'info',
  Cancelled: 'neutral',
  'No-show': 'warning',
  Booked: 'info',
  Called: 'info',

  // Derived doctor operational status — computed in domain/selectors.ts
  // (getDoctorStatus) from schedule + leave + breaks + queue state.
  Available: 'stable',
  'Running late': 'warning',
  'Fully booked': 'neutral',
  'On break': 'warning',
  'On leave': 'neutral',
  'Not scheduled': 'neutral',
  Inactive: 'neutral',
  Blocked: 'neutral',
  Issued: 'info',
  Returned: 'neutral',
  Overdue: 'warning',

  // Payment lifecycle — the display words from utils/billing.billDisplayStatus
  Paid: 'stable',
  Partial: 'warning',
  'Partially Paid': 'warning',
  Failed: 'critical',
  Refunded: 'info',

  // Estimate lifecycle — types/frontDesk.ts's EstimateStatus
  Draft: 'neutral',
  Saved: 'info',

  // Inpatients — types/admission.ts's BedStatus/AdmissionStatus
  Occupied: 'info',
  Reserved: 'warning',
  Maintenance: 'neutral',
  Admitted: 'info',
  'Bed Reserved': 'warning',
  Transferred: 'info',
  Discharged: 'neutral',
}

export function toneFor(status: string | null | undefined): Tone {
  if (!status) return 'neutral'
  return STATUS_TONE[status] ?? 'neutral'
}
