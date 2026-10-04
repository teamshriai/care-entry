import { useId, useState } from 'react'
import { CheckCircle2, ExternalLink, HeartPulse } from 'lucide-react'

/** The government's ABHA registration (ABDM), for a patient who has none. */
const ABHA_REGISTER_URL = 'https://abha.abdm.gov.in/abha/v3/register'

/** What ABHA does for a patient — shown to explain why it is worth creating. */
const ABHA_BENEFITS = [
  'One patient. One complete health history.',
  'Skip repeat MRIs & tests unless needed',
  'Access all records digitally, anytime',
  'Move between hospitals seamlessly',
  'You control your data, always',
  'Doctors see your full medical journey',
]

/**
 * "Create ABHA" — opens ABDM's registration in a new tab, so the form here
 * stays as it is. Pointing at it (or tabbing to it) shows what ABHA means
 * for the patient, to share with them; it closes as the pointer moves away.
 */
export function CreateAbhaLink() {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <a
        href={ABHA_REGISTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={open ? tipId : undefined}
        className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary-100"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Create ABHA
      </a>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="menu-surface absolute right-0 top-[calc(100%+8px)] z-40 block w-[min(20rem,calc(100vw-2rem))] rounded-xl p-4 text-left"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stat-teal text-white">
              <HeartPulse className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-ink">Your Health, One Place</span>
          </span>
          <span className="mt-2 block text-xs font-medium text-ink-muted">No more repeating your story. No more carrying files.</span>
          <span className="mt-2.5 flex flex-col gap-1.5">
            {ABHA_BENEFITS.map((benefit) => (
              <span key={benefit} className="flex items-start gap-2 text-xs text-ink">
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-stable" strokeWidth={2} aria-hidden="true" />
                {benefit}
              </span>
            ))}
          </span>
          <span className="mt-3 block border-t border-border-soft pt-2 text-2xs text-ink-subtle">
            ABHA — Ayushman Bharat Health Account, under the Ayushman Bharat Digital Mission (ABDM).
          </span>
        </span>
      ) : null}
    </span>
  )
}
