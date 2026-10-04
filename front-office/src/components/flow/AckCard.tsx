import { useEffect, useRef } from 'react'
import type { ElementType, ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { IconBadge } from '../ui/IconBadge'
import type { Tone } from '../../utils/tone'

export const ACK_DURATION_MS = 2500

/**
 * The end of every flow: a short confirmation of what just happened, then
 * the flow closes by itself — nobody has to click "Done". Enter (or Escape,
 * via the sheet) closes it early.
 */
export function AckCard({
  title,
  children,
  icon = CheckCircle2,
  tone = 'stable',
  action,
  onDone,
  durationMs = ACK_DURATION_MS,
}: {
  title: ReactNode
  children?: ReactNode
  icon?: ElementType
  tone?: Tone
  /** An optional follow-up, e.g. printing the receipt. */
  action?: ReactNode
  onDone: () => void
  durationMs?: number
}) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, a')) return
      event.preventDefault()
      done.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center px-4 py-10 text-center">
      <IconBadge icon={icon} tone={tone} size="md" />
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">{title}</h3>
      {children ? <div className="mt-2 space-y-1 text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <div
          className="h-full origin-left rounded-full bg-stable"
          style={{ animation: `ackProgress ${durationMs}ms linear forwards` }}
        />
      </div>
    </div>
  )
}
