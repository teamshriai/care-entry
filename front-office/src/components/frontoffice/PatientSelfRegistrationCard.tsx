import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { PATIENT_SELF_REGISTRATION_URL } from '../../config'
import { IconBadge } from '../ui/IconBadge'
import { Button } from '../ui/Button'

const FEEDBACK_MS = 2500

type CopyState = 'idle' | 'copied' | 'failed'

// Front Office only LINKS to the separate Patient Self-Registration portal:
// "Open Portal" opens it in a new tab, "Copy Link" puts the same configured
// URL on the clipboard so staff can send it to a patient. Nothing about the
// portal is embedded or copied here.
export function PatientSelfRegistrationCard() {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<number | undefined>(undefined)
  const url = PATIENT_SELF_REGISTRATION_URL

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function handleCopy() {
    window.clearTimeout(resetTimer.current)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      // Clipboard API unavailable (insecure context) or permission denied —
      // say so rather than pretending it worked.
      setCopyState('failed')
    }
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), FEEDBACK_MS)
  }

  const heading = (
    <>
      <IconBadge icon={Link2} tone="brand" size="sm" interactive />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">Patient Self-Registration</h3>
        <p className="mt-0.5 text-xs text-ink-muted">Share a link for patients to complete their registration</p>
      </div>
    </>
  )

  return (
    <section
      aria-label="Patient self-registration"
      className="col-span-2 flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-card xl:col-span-2"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring group flex items-start gap-3 rounded-lg"
      >
        {heading}
      </a>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary-600 px-3 py-1.5 text-xs font-semibold text-on-primary shadow-[0_1px_3px_0_rgba(37,99,235,0.3)] transition-all duration-200 hover:bg-primary-700 hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]"
        >
          <ExternalLink size={14} aria-hidden="true" />
          Open Portal
        </a>

        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copyState === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copyState === 'copied' ? 'Link copied' : 'Copy Link'}
        </Button>

        <p
          role="status"
          aria-live="polite"
          className={
            copyState === 'failed' ? 'text-xs font-medium text-critical-fg' : 'text-xs font-medium text-success-fg'
          }
        >
          {copyState === 'copied' ? 'Portal link copied' : null}
          {copyState === 'failed' ? 'Could not copy — copy the link manually' : null}
        </p>
      </div>
    </section>
  )
}
