import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { Check, ChevronDown, Coffee, Moon, Sparkles, Sun, Sunrise } from 'lucide-react'
import { cn } from '../../utils/cn'
import { BREAK_CHIP, MUTED_CHIP, SELECTED_CHIP, tintedChip } from '../../utils/chipTone'
import type { SlotBoardEntry } from '../../types/appointment'
import { formatTime } from '../../domain/time'

type ChipKind = 'free' | 'earliest' | 'selected' | 'booked' | 'held' | 'over' | 'break' | 'current'

const KIND_LABEL: Record<ChipKind, string> = {
  free: 'Free',
  earliest: 'Earliest',
  selected: 'Selected',
  booked: 'Booked',
  held: 'Pay pending',
  over: 'Over',
  break: 'Break',
  current: 'Current',
}

/** What a screen-reader hears for each state (the chip shows the short word). */
const KIND_SPOKEN: Record<ChipKind, string> = {
  free: 'free',
  earliest: 'free — the earliest open time',
  selected: 'selected',
  booked: 'already booked',
  held: 'held — booked, payment pending at the counter',
  over: 'over',
  break: "the doctor's break",
  current: 'the booking being moved',
}

const PERIODS: { key: string; label: string; icon: typeof Sun; from: number; to: number }[] = [
  { key: 'morning', label: 'Morning', icon: Sunrise, from: 0, to: 12 },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, from: 12, to: 17 },
  { key: 'evening', label: 'Evening', icon: Moon, from: 17, to: 24 },
]

function chipLook(kind: ChipKind): { className: string; style?: CSSProperties } {
  switch (kind) {
    case 'free':
      return tintedChip('blue')
    case 'earliest':
      return tintedChip('green')
    case 'selected':
      return { className: SELECTED_CHIP }
    case 'booked':
      return { ...tintedChip('pink'), className: cn(tintedChip('pink').className, 'opacity-80') }
    case 'held':
      return tintedChip('amber')
    case 'break':
      return { className: BREAK_CHIP }
    case 'current':
      return { className: 'border-dashed border-info-fg/50 bg-info-bg text-info-fg' }
    default:
      return { className: cn(MUTED_CHIP, 'opacity-75') }
  }
}

/** The legend over the board — a swatch and a word for each state. */
function Legend() {
  const items: ChipKind[] = ['free', 'earliest', 'selected', 'booked', 'over']
  return (
    <ul className="scrollbar-hide flex items-center gap-x-3.5 overflow-x-auto overflow-y-hidden pb-0.5" aria-label="Legend">
      {items.map((kind) => {
        const look = chipLook(kind)
        return (
          <li key={kind} className="flex shrink-0 items-center gap-1.5">
            <span aria-hidden="true" style={look.style} className={cn('h-3 w-5 rounded-full border', look.className, kind === 'selected' && 'ring-0 ring-offset-0')} />
            <span className="whitespace-nowrap text-2xs font-semibold uppercase tracking-wide text-ink-muted">{KIND_LABEL[kind]}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A doctor's times for one day (DESIGN_SYSTEM tinted chips, the same visual
 * language as Doctor Availability): free in blue, the earliest open time in
 * green with a tag, the chosen one in the primary gradient, booked in rose
 * and struck through. Only free times can be chosen — everything else is
 * shown for context and is disabled. Times are grouped Morning / Afternoon /
 * Evening; times already over fold away behind "Show earlier times". Arrow
 * keys move between the times that can be chosen.
 *
 * Entries come from domain/selectors.getSlotBoard, so every state here is
 * derived from real appointment records.
 */
export function SlotBoard({
  entries,
  selectedSlot,
  onSelect,
  emptyMessage = 'No slots in this session.',
  currentAppointmentId,
}: {
  entries: SlotBoardEntry[]
  selectedSlot?: string | null
  onSelect?: (slot: string) => void
  emptyMessage?: string
  /** A booking being moved: its own slot reads "Current", not "Booked". */
  currentAppointmentId?: string
}) {
  const [showOver, setShowOver] = useState(false)
  const board = useRef<HTMLDivElement>(null)

  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed border-border-soft px-4 py-6 text-center text-sm text-ink-subtle">{emptyMessage}</p>
  }

  const earliest = entries.find((e) => e.status === 'available')?.slot ?? null
  const kindOf = (entry: SlotBoardEntry): ChipKind => {
    const current = Boolean(currentAppointmentId) && entry.appointment?.appointmentId === currentAppointmentId
    if (current) return 'current'
    if (entry.status === 'available') return entry.slot === selectedSlot ? 'selected' : entry.slot === earliest ? 'earliest' : 'free'
    if (entry.status === 'booked') return entry.appointment?.status === 'Payment Pending' ? 'held' : 'booked'
    if (entry.status === 'break') return 'break'
    return 'over'
  }

  const overCount = entries.filter((e) => e.status === 'past').length
  const freeCount = entries.filter((e) => e.status === 'available').length
  const visible = showOver ? entries : entries.filter((e) => e.status !== 'past')

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const buttons = [...(board.current?.querySelectorAll<HTMLButtonElement>('button[data-slot]:not([disabled])') ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at === -1) return
    event.preventDefault()
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? at + 1 : at - 1
    buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {freeCount ? `${freeCount} free ${freeCount === 1 ? 'time' : 'times'}` : 'No free times on this day'}
        </p>
        <Legend />
      </div>

      {overCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowOver((v) => !v)}
          aria-expanded={showOver}
          className="focus-ring inline-flex min-h-9 items-center gap-1 self-start rounded-lg px-1 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', showOver && 'rotate-180')} />
          {showOver ? 'Hide earlier times' : `Show ${overCount} earlier ${overCount === 1 ? 'time' : 'times'}`}
        </button>
      ) : null}

      <div ref={board} onKeyDown={handleKeyDown} className="flex flex-col gap-3.5">
        {PERIODS.map((period) => {
          const group = visible.filter((e) => {
            const hour = new Date(e.timestamp).getHours()
            return hour >= period.from && hour < period.to
          })
          if (group.length === 0) return null
          const free = group.filter((e) => e.status === 'available').length
          const Icon = period.icon
          return (
            <section key={period.key} aria-label={`${period.label} — ${free} free`}>
              <h4 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                <Icon size={13} aria-hidden="true" />
                {period.label}
                <span className="font-medium normal-case tracking-normal text-ink-subtle/80">· {free} free</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {group.map((entry) => (
                  <SlotChip
                    key={entry.slot}
                    entry={entry}
                    kind={kindOf(entry)}
                    selectable={entry.status === 'available' && Boolean(onSelect)}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          )
        })}
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-soft px-4 py-5 text-center text-sm text-ink-subtle">Every time on this day is over.</p>
        ) : null}
      </div>
    </div>
  )
}

function SlotChip({
  entry,
  kind,
  selectable,
  onSelect,
}: {
  entry: SlotBoardEntry
  kind: ChipKind
  selectable: boolean
  onSelect?: (slot: string) => void
}) {
  const look = chipLook(kind)
  const time = formatTime(entry.slot)
  const [clock, meridiem] = time.split(' ')
  let tag: ReactNode = KIND_LABEL[kind]
  if (kind === 'selected') tag = (
    <>
      <Check size={11} strokeWidth={3} aria-hidden="true" /> Selected
    </>
  )
  if (kind === 'earliest') tag = (
    <>
      <Sparkles size={11} aria-hidden="true" /> Earliest
    </>
  )
  if (kind === 'break') tag = (
    <>
      <Coffee size={11} aria-hidden="true" /> Break
    </>
  )

  return (
    <button
      type="button"
      data-slot={entry.slot}
      disabled={!selectable}
      aria-pressed={selectable ? kind === 'selected' : undefined}
      aria-label={`${time}, ${KIND_SPOKEN[kind]}`}
      title={`${time} · ${KIND_SPOKEN[kind]}`}
      onClick={() => selectable && onSelect?.(entry.slot)}
      style={look.style}
      className={cn(
        'focus-ring relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-all duration-200',
        look.className,
        selectable && kind !== 'selected' && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-md active:scale-[0.97]',
        !selectable && 'cursor-not-allowed',
      )}
    >
      <span className={cn('text-sm font-semibold leading-none tabular-nums', kind === 'booked' && 'line-through decoration-1')}>
        {clock}
        <span className="ml-0.5 text-2xs font-semibold">{meridiem}</span>
      </span>
      <span className="inline-flex items-center gap-0.5 text-2xs font-semibold leading-none opacity-90">{tag}</span>
    </button>
  )
}
