import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ExternalLink, FileHeart, HeartPulse, Hospital, ScanLine, ShieldCheck, Smartphone, Stethoscope } from 'lucide-react'
import { cn } from '../../utils/cn'

/** The government's ABHA registration (ABDM), for a patient who has none. */
const ABHA_REGISTER_URL = 'https://abha.abdm.gov.in/abha/v3/register'

/** What ABHA does for a patient — shown to explain why it is worth creating. */
const ABHA_BENEFITS: { text: string; icon: ElementType; tile: string }[] = [
  { text: 'One patient. One complete health history.', icon: FileHeart, tile: 'bg-stat-teal' },
  { text: 'Skip repeat MRIs & tests unless needed', icon: ScanLine, tile: 'bg-stat-orange' },
  { text: 'Access all records digitally, anytime', icon: Smartphone, tile: 'bg-stat-blue' },
  { text: 'Move between hospitals seamlessly', icon: Hospital, tile: 'bg-stat-purple' },
  { text: 'You control your data, always', icon: ShieldCheck, tile: 'bg-stat-green' },
  { text: 'Doctors see your full medical journey', icon: Stethoscope, tile: 'bg-stat-pink' },
]

const POPUP_WIDTH = 380
/** Space kept between the popup and the button, and from the window edge. */
const GAP = 12
const EDGE = 16

type Placement = { top: number; left: number; side: 'right' | 'left' | 'none'; arrowTop: number; onHeader: boolean }

/**
 * "Create ABHA" — opens ABDM's registration in a new tab, so the form here
 * stays as it is. Pointing at it (or tabbing to it) shows what ABHA means
 * for the patient, to share with them: beside the button (right, or left
 * when there is no room), held inside the window so nothing needs scrolling.
 * It closes as the pointer moves away.
 */
export function CreateAbhaLink() {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<Placement | null>(null)
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const tipId = useId()

  useLayoutEffect(() => {
    // Measured before paint, so the popup never shows in the wrong place.
    if (!open) return
    const anchor = anchorRef.current?.getBoundingClientRect()
    const el = popupRef.current
    if (!anchor || !el) return
    // offset sizes, not the rect: the pop-in animation starts slightly scaled down.
    const popup = { width: el.offsetWidth, height: el.offsetHeight }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const anchorMid = anchor.top + anchor.height / 2
    const top = Math.max(EDGE, Math.min(anchorMid - popup.height / 2, vh - popup.height - EDGE))
    let side: Placement['side'] = 'none'
    let left: number
    if (anchor.right + GAP + popup.width <= vw - EDGE) {
      side = 'right'
      left = anchor.right + GAP
    } else if (anchor.left - GAP - popup.width >= EDGE) {
      side = 'left'
      left = anchor.left - GAP - popup.width
    } else {
      // A phone: no room beside it, so centred in the window.
      left = Math.max(EDGE, (vw - popup.width) / 2)
    }
    const arrowTop = Math.max(20, Math.min(anchorMid - top, popup.height - 20))
    setPlace({ top, left, side, arrowTop, onHeader: arrowTop < (headerRef.current?.offsetHeight ?? 0) })
  }, [open])

  // Scrolling or resizing moves the button away from the popup: close it.
  useLayoutEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span
      className="inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <a
        ref={anchorRef}
        href={ABHA_REGISTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={open ? tipId : undefined}
        className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary-100"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Create ABHA
      </a>
      {open
        ? createPortal(
            <div
              ref={popupRef}
              id={tipId}
              role="tooltip"
              style={{
                width: `min(${POPUP_WIDTH}px, calc(100vw - ${EDGE * 2}px))`,
                top: place?.top ?? 0,
                left: place?.left ?? 0,
                visibility: place ? 'visible' : 'hidden',
              }}
              className="pointer-events-none fixed z-[60] rounded-2xl bg-surface-1 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-border-soft motion-safe:animate-[abha-pop_160ms_ease-out]"
            >
              {place && place.side !== 'none' ? (
                <span
                  aria-hidden="true"
                  style={{ top: place.arrowTop - 7 }}
                  className={cn(
                    'absolute h-3.5 w-3.5 rotate-45',
                    place.side === 'right' ? '-left-1.5' : '-right-1.5',
                    place.onHeader ? (place.side === 'right' ? 'bg-stat-teal' : 'bg-stat-blue') : 'bg-surface-1',
                  )}
                />
              ) : null}

              <div ref={headerRef} className="relative overflow-hidden rounded-t-2xl bg-linear-to-br from-stat-teal via-stat-teal to-stat-blue px-5 py-4 text-white">
                <span aria-hidden="true" className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                <span aria-hidden="true" className="absolute -bottom-10 right-16 h-20 w-20 rounded-full bg-white/10" />
                <span className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                    <HeartPulse className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xs font-semibold uppercase tracking-wider text-white/80">Ayushman Bharat Health Account</span>
                    <span className="block text-lg font-extrabold leading-tight">Your Health, One Place</span>
                  </span>
                </span>
                <span className="relative mt-2 block text-[13px] font-medium leading-snug text-white/90">
                  No more repeating your story. No more carrying files.
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-2 p-4 min-[360px]:grid-cols-2">
                {ABHA_BENEFITS.map(({ text, icon: Icon, tile }) => (
                  <li key={text} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-2">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', tile)}>
                      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold leading-snug text-ink">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border-soft px-4 py-3">
                <span className="text-2xs text-ink-subtle">Free, from the Ayushman Bharat Digital Mission (ABDM)</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary-text">
                  Click to create
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
