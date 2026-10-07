import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Coffee } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { DoctorIllustration } from '../ui/illustrations/DoctorIllustration'
import { cn } from '../../utils/cn'
import { initialsOf } from '../../utils/format'
import { doctorStatusLabel } from '../../utils/appointment'
import type { IconTone } from '../../utils/toneHex'
import { BREAK_CHIP, MUTED_CHIP, tintedChip } from '../../utils/chipTone'
import type { DoctorStrip, DoctorTimeline as Timeline, HourCell, HourState } from '../../domain/timelineSelectors'
import type { Provider } from '../../types/doctor'
import { formatTime } from '../../domain/time'

/** Width of one hour column, in rem — every row shares it, so hours line up. */
const CELL_REM = 4.5

/** Each hour's state and its hue (DESIGN_SYSTEM §4.4 — soft tints, words beside). */
const HOUR_LEGEND: { state: HourState; label: string; tone?: IconTone }[] = [
  { state: 'free', label: 'All free', tone: 'blue' },
  { state: 'some', label: 'Some free', tone: 'green' },
  { state: 'full', label: 'Full', tone: 'pink' },
  { state: 'break', label: 'Break' },
]

const STATE_WORDS: Record<HourState, string> = {
  free: 'every slot free',
  some: 'some slots free',
  full: 'fully booked',
  break: 'break',
  past: 'over',
}

function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`
}

function toneOf(state: HourState): IconTone | null {
  return HOUR_LEGEND.find((item) => item.state === state)?.tone ?? null
}

/** A tinted chip in its state's hue; break and past are quiet neutrals. */
function chipStyle(state: HourState): { className: string; style?: CSSProperties } {
  const tone = toneOf(state)
  if (tone) return tintedChip(tone)
  if (state === 'break') return { className: BREAK_CHIP }
  return { className: cn(MUTED_CHIP, 'opacity-70') }
}

/** How to read and use the strip: the legend, and what a tap does. */
export function HourLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-1.5', className)}>
      <p className="whitespace-nowrap text-xs text-ink-muted">
        <span className="font-semibold text-ink">Each box is an hour</span> · the number is how many slots are free · tap one to book its first free time
      </p>
      <LegendSwatches />
    </div>
  )
}

function LegendSwatches() {
  return (
    <ul className="flex items-center gap-x-4" aria-label="Legend">
      {HOUR_LEGEND.map((item) => {
        const chip = chipStyle(item.state)
        return (
          <li key={item.state} className="flex shrink-0 items-center gap-1.5">
            <span aria-hidden="true" style={chip.style} className={cn('h-3 w-5 rounded-full border', chip.className)} />
            <span className="whitespace-nowrap text-2xs font-semibold uppercase tracking-wide text-ink-muted">{item.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Doctor Availability — each doctor's day hour by hour, in a shared time axis:
 * free, some booked, full, break or over. Tapping an hour that still has a
 * free slot opens Schedule Appointment on that doctor and that slot. The
 * strip scrolls sideways (and starts at the current hour) wherever the day
 * is wider than the screen — on a phone it is a horizontal scroll row.
 */
export function DoctorTimeline({
  timeline,
  maxRows = 6,
  onOpenProfile,
  onBookSlot,
}: {
  timeline: Timeline
  maxRows?: number
  onOpenProfile: (provider: Provider) => void
  onBookSlot: (provider: Provider, slot: string | null) => void
}) {
  const strips = timeline.strips.slice(0, maxRows)
  if (strips.length === 0) {
    return (
      <EmptyState
        illustration={<DoctorIllustration className="h-11 w-11" />}
        title="No doctors yet"
        description="Doctors appear here, hour by hour, once they are registered."
      />
    )
  }

  const hours: number[] = []
  for (let h = timeline.firstHour; h <= timeline.lastHour; h += 1) hours.push(h)

  return (
    <ul className="divide-y divide-border-soft">
      {strips.map((strip) => (
        <DoctorLine key={strip.row.provider.providerId} strip={strip} axis={hours} onOpenProfile={onOpenProfile} onBookSlot={onBookSlot} />
      ))}
    </ul>
  )
}

function DoctorLine({
  strip,
  axis,
  onOpenProfile,
  onBookSlot,
}: {
  strip: DoctorStrip
  axis: number[]
  onOpenProfile: (provider: Provider) => void
  onBookSlot: (provider: Provider, slot: string | null) => void
}) {
  const { row, hours } = strip
  const { provider } = row
  const scroller = useRef<HTMLDivElement>(null)
  const byHour = new Map(hours.map((cell) => [cell.hour, cell]))
  const first = hours.length ? axis.indexOf(hours[0].hour) : -1
  const last = hours.length ? axis.indexOf(hours[hours.length - 1].hour) : -1

  // Start the row at the hour the clock is in (or the doctor's first hour).
  useEffect(() => {
    const box = scroller.current
    const target = box?.querySelector<HTMLElement>('[data-current="true"]')
    if (!box || !target || box.scrollWidth <= box.clientWidth) return
    box.scrollLeft = Math.max(0, target.offsetLeft - box.clientWidth / 2 + target.offsetWidth / 2)
  }, [])

  const offToday =
    provider.status !== 'Active' ? 'Account deactivated' : row.schedule?.onLeave ? `On leave${row.schedule.leaveReason ? ` · ${row.schedule.leaveReason}` : ''}` : hours.length === 0 ? 'Not scheduled today' : null

  return (
    <li className="grid min-w-0 grid-cols-1 gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-center lg:gap-5">
      {/* Who */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={provider.name} initials={initialsOf(provider.name)} size="sm" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenProfile(provider)}
            title={`${provider.name} · open profile`}
            className="focus-ring -my-3 block max-w-full truncate rounded py-3 text-left text-sm font-semibold text-ink transition-colors hover:text-primary-text"
          >
            {provider.name}
          </button>
          <p className="truncate text-xs text-ink-subtle">
            {provider.department}
            {row.nextSlot ? <span className="tabular-nums lg:hidden"> · next free {formatTime(row.nextSlot)}</span> : null}
          </p>
        </div>
        <Badge status={row.status} size="xs" className="shrink-0">
          {doctorStatusLabel(row.status)}
        </Badge>
      </div>

      {/* When */}
      {offToday ? (
        <p className="flex min-h-11 items-center rounded-xl border border-dashed border-border bg-surface-2 px-3.5 text-sm text-ink-muted">{offToday}</p>
      ) : (
        <div
          ref={scroller}
          className="scrollbar-hide -mx-4 min-w-0 snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain px-4 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] sm:-mx-5 sm:scroll-px-5 sm:px-5 lg:mx-0 lg:scroll-px-0 lg:px-0 lg:[mask-image:none]"
          role="group"
          aria-label={`${provider.name}, today hour by hour`}
        >
          <ol className="relative flex w-max items-start py-1">

            {/* The session line joining its hours. */}
            {first >= 0 && last > first ? (
              <span
                aria-hidden="true"
                className="absolute top-[1.625rem] h-px bg-border-strong/70"
                style={{ left: `${(first + 0.5) * CELL_REM}rem`, width: `${(last - first) * CELL_REM}rem` }}
              />
            ) : null}
            {axis.map((hour) => {
              const cell = byHour.get(hour)
              return (
                <li key={hour} data-current={cell?.current || undefined} className="relative flex shrink-0 snap-start flex-col items-center" style={{ width: `${CELL_REM}rem` }}>
                  {cell ? <HourChip cell={cell} provider={provider} onBook={onBookSlot} /> : <span aria-hidden="true" className="h-11 w-[3.25rem]" />}
                  <span
                    className={cn(
                      'mt-1 whitespace-nowrap text-2xs tabular-nums',
                      cell?.current ? 'font-semibold text-primary-text' : cell ? 'text-ink-subtle' : 'text-ink-subtle/50',
                    )}
                  >
                    {cell?.current ? 'Now' : hourLabel(hour)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </li>
  )
}

function HourChip({ cell, provider, onBook }: { cell: HourCell; provider: Provider; onBook: (provider: Provider, slot: string | null) => void }) {
  const chip = chipStyle(cell.state)
  const bookable = Boolean(cell.firstOpen)
  const free = cell.open
  const label = `${hourLabel(cell.hour)}${cell.current ? ' (now)' : ''}: ${STATE_WORDS[cell.state]}${
    cell.state === 'break' ? '' : ` — ${free} of ${cell.total} free`
  }${bookable ? `. Book ${formatTime(cell.firstOpen!)}` : ''}`
  const body =
    cell.state === 'break' ? (
      <>
        <Coffee size={14} aria-hidden="true" />
        <span className="text-2xs font-medium leading-none">break</span>
      </>
    ) : cell.state === 'full' || cell.state === 'past' ? (
      <span className="text-2xs font-semibold leading-none">{cell.state === 'full' ? 'Full' : 'Over'}</span>
    ) : (
      <>
        <span className="text-sm font-semibold leading-none tabular-nums">{free}</span>
        <span className="text-2xs font-medium leading-none opacity-80">free</span>
      </>
    )
  const className = cn(
    'relative z-10 flex h-11 w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-200',
    chip.className,
    cell.current && 'ring-2 ring-primary-600 ring-offset-2 ring-offset-surface-1',
  )

  if (!bookable) {
    return (
      <span role="img" aria-label={label} title={label} style={chip.style} className={className}>
        {body}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onBook(provider, cell.firstOpen)}
      aria-label={label}
      title={label}
      style={chip.style}
      className={cn(className, 'focus-ring tap-reach cursor-pointer hover:-translate-y-0.5 hover:shadow-card-md active:scale-95')}
    >
      {body}
    </button>
  )
}
