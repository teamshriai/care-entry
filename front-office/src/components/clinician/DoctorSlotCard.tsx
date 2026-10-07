import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ChevronDown, MapPin, Moon, Sparkles, Sun, Sunrise } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/cn'
import { tintedChip, SELECTED_CHIP } from '../../utils/chipTone'
import { formatRupees } from '../../utils/billing'
import { relativeDayLabel } from '../../utils/dates'
import { modesFor } from '../../utils/appointment'
import { initialsOf } from '../../utils/format'
import { useStoreValue } from '../../hooks/useStore'
import { addDaysToKey, getDoctorDateStrip, getSlotBoard } from '../../domain/selectors'
import type { DoctorSuggestion } from '../../domain/selectors'
import { dayStartTimestamp, formatTime } from '../../domain/time'
import type { SlotBoardEntry } from '../../types/appointment'

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PERIODS = [
  { key: 'morning', label: 'Morning', icon: Sunrise, from: 0, to: 12 },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, from: 12, to: 17 },
  { key: 'evening', label: 'Evening', icon: Moon, from: 17, to: 24 },
]

/** Times shown before "Show all" on a doctor that isn't chosen (a long
 *  row has room for more). */
const FOLDED = 10
const FOLDED_WIDE = 18

/**
 * One doctor and their times, in one card — Doctor Availability in the
 * booking page. The doctor (name, Soonest tag, specialty, department, fee,
 * room, next free time) sits on top; tapping it takes their earliest time.
 * Below, the doctor's own days as small tabs and that day's times as pills
 * by part of the day: free in blue, the doctor's earliest in green, the
 * chosen one in the primary gradient, booked struck through and disabled.
 * Times already over are left out. A doctor with no open time is greyed
 * with the reason.
 */
export function DoctorSlotCard({
  suggestion,
  today,
  now,
  soonest,
  selectedDate,
  selectedSlot,
  onPick,
  onOpen,
  wide = false,
  children,
}: {
  suggestion: DoctorSuggestion
  today: string
  now: number
  /** The department's soonest doctor — tagged. */
  soonest: boolean
  /** The booking's date and time when this doctor is the chosen one. */
  selectedDate: string | null
  selectedSlot: string | null
  onPick: (providerId: string, date: string, slot: string) => void
  /** The directory: the doctor opens their profile instead of taking the
   *  earliest time. */
  onOpen?: (providerId: string) => void
  /** A long row where there is room: the doctor on the left, their days
   *  and times on the right (stacked again when the row is narrow). */
  wide?: boolean
  /** Extra controls under the doctor, for the chosen one (how they're seen). */
  children?: ReactNode
}) {
  const { provider, bookable, nextSlots, reason } = suggestion
  const chosen = Boolean(selectedSlot)
  const next = nextSlots[0] ?? null
  const strip = useStoreValue(getDoctorDateStrip, provider.providerId, now)
  const firstOpen = strip.find((d) => d.state === 'open')?.date ?? null
  const [ownDay, setOwnDay] = useState<string | null>(null)
  const day = ownDay ?? (chosen ? selectedDate : null) ?? firstOpen
  const entries = useStoreValue(getSlotBoard, provider.providerId, now, day ?? today)
  const [expanded, setExpanded] = useState(false)

  const upcoming = day ? entries.filter((e) => e.status === 'available' || e.status === 'booked') : []
  const selectedIndex = chosen && selectedDate === day ? upcoming.findIndex((e) => e.slot === selectedSlot) : -1
  const fold = wide ? FOLDED_WIDE : FOLDED
  const open = expanded || chosen || selectedIndex >= fold
  const shown = open ? upcoming : upcoming.slice(0, fold)
  const hidden = upcoming.length - shown.length
  const modes = modesFor(provider)
  const tomorrow = addDaysToKey(today, 1)

  const kindOf = (entry: SlotBoardEntry) => {
    if (entry.status === 'booked') return 'booked'
    if (chosen && selectedDate === day && entry.slot === selectedSlot) return 'selected'
    if (next && next.date === day && next.slot === entry.slot) return 'earliest'
    return 'free'
  }

  return (
    <article
      aria-label={provider.name}
      className={cn(
        '@container h-full rounded-2xl border bg-surface-1 transition-[border-color,box-shadow] duration-200',
        chosen
          ? 'border-primary-600/70 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary-500)_14%,transparent)]'
          : 'border-border-soft shadow-card-sm',
        !bookable && 'opacity-60',
      )}
    >
      <div className={cn('flex h-full flex-col', wide && '@3xl:flex-row')}>
        <div className={cn('flex flex-col', wide && '@3xl:w-72 @3xl:shrink-0 @3xl:border-r @3xl:border-border-soft')}>
          {/* The doctor — tapping takes their earliest time (or, in the
              directory, opens their profile). */}
          <button
            type="button"
            disabled={onOpen ? false : !bookable || !next}
            onClick={() => (onOpen ? onOpen(provider.providerId) : next && onPick(provider.providerId, next.date, next.slot))}
            aria-label={
              onOpen
                ? `${provider.name}, ${provider.specialty}, ${formatRupees(provider.consultationFee)} — open profile`
                : `${provider.name}, ${provider.specialty}, ${formatRupees(provider.consultationFee)}${
                    next ? ` — take the earliest time, ${relativeDayLabel(next.date, today)} ${formatTime(next.slot)}` : ''
                  }`
            }
            className={cn(
              'focus-ring flex w-full items-start gap-3 rounded-t-2xl px-3.5 pb-3 pt-3.5 text-left sm:px-4',
              wide && '@3xl:rounded-tr-none',
              (onOpen || (bookable && !chosen)) && 'hover:bg-surface-2/60',
              !onOpen && !bookable && 'cursor-not-allowed',
            )}
          >
            <Avatar name={provider.name} initials={initialsOf(provider.name)} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-ink">{provider.name}</span>
                {soonest && bookable ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-success-bg px-1.5 py-0.5 text-2xs font-semibold text-success-fg">
                    <Sparkles size={11} aria-hidden="true" />
                    Soonest
                  </span>
                ) : null}
                {modes.includes('Teleconsult') ? (
                  <Badge tone="purple" size="xs">
                    {modes.length === 1 ? 'Teleconsult only' : 'Teleconsult'}
                  </Badge>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {provider.specialty} · <span className="font-semibold tabular-nums text-ink">{formatRupees(provider.consultationFee)}</span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-subtle">
                <span>{provider.department}</span>
                {provider.room ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} aria-hidden="true" className="shrink-0" />
                    {provider.room}
                  </span>
                ) : null}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {chosen ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-on-primary shadow-card-sm" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
              ) : null}
              <span
                className={cn(
                  'hidden rounded-md px-1.5 py-0.5 text-right text-xs font-semibold @md:inline-block',
                  wide && '@3xl:hidden',
                  bookable ? 'bg-info-bg text-info-fg' : 'bg-surface-2 text-ink-subtle',
                )}
              >
                {bookable && next ? `Next free · ${relativeDayLabel(next.date, today)}, ${formatTime(next.slot)}` : reason}
              </span>
            </span>
          </button>
          {/* Phones: the next free time on its own line. */}
          <p
            className={cn(
              'mx-3.5 -mt-1.5 mb-3 self-start rounded-md px-1.5 py-0.5 text-xs font-semibold @md:hidden',
              wide && '@3xl:ml-[4.25rem] @3xl:block sm:mx-4',
              bookable ? 'bg-info-bg text-info-fg' : 'bg-surface-2 text-ink-subtle',
            )}
          >
            {bookable && next ? `Next free · ${relativeDayLabel(next.date, today)}, ${formatTime(next.slot)}` : reason}
          </p>
        </div>

        {bookable ? (
          <div className={cn('flex flex-col gap-3 border-t border-border-soft px-3.5 pb-3.5 pt-3 sm:px-4', wide && '@3xl:min-w-0 @3xl:flex-1 @3xl:border-t-0 @3xl:pt-3.5')}>
            {children}
            {/* The doctor's days. */}
            <div className="scrollbar-hide scroll-fade-x -mx-1 -my-0.5 flex gap-1.5 overflow-x-auto overflow-y-hidden px-1 py-1" role="group" aria-label={`${provider.name} — day`}>
              {strip.map((d) => {
                const selectable = d.state === 'open'
                const active = d.date === day
                const date = new Date(dayStartTimestamp(d.date))
                const label = d.date === today ? 'Today' : d.date === tomorrow ? 'Tmrw' : `${WEEKDAY[date.getDay()]} ${date.getDate()}`
                const note = d.state === 'open' ? String(d.open) : d.state === 'full' ? 'Full' : d.state === 'leave' ? 'Leave' : 'Off'
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!selectable}
                    aria-pressed={selectable ? active : undefined}
                    aria-label={`${label === 'Tmrw' ? 'Tomorrow' : label} — ${selectable ? `${d.open} free` : note.toLowerCase()}`}
                    onClick={() => {
                      setOwnDay(d.date)
                      setExpanded(false)
                    }}
                    className={cn(
                      'focus-ring tap-reach inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors',
                      active
                        ? 'border-ink bg-ink text-surface-1'
                        : selectable
                          ? 'border-border-soft bg-surface-1 text-ink hover:border-border-strong'
                          : 'cursor-not-allowed border-transparent bg-surface-2 text-ink-subtle',
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-2xs font-semibold tabular-nums',
                        active ? 'bg-surface-1/20' : selectable ? 'bg-[color-mix(in_oklab,var(--color-hue-blue)_14%,var(--color-surface-1))] text-[color-mix(in_oklab,var(--color-hue-blue)_var(--tone-ink-amount),var(--tone-ink-mix))]' : '',
                      )}
                    >
                      {note}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* That day's times, by part of the day. */}
            {upcoming.length === 0 ? (
              <p className="text-xs text-ink-subtle">No times left on this day.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {PERIODS.map((period) => {
                  const group = shown.filter((e) => {
                    const hour = new Date(e.timestamp).getHours()
                    return hour >= period.from && hour < period.to
                  })
                  if (group.length === 0) return null
                  const Icon = period.icon
                  return (
                    <div key={period.key} className="flex flex-col gap-1.5 @md:flex-row @md:items-start @md:gap-3">
                      <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-subtle @md:mt-2 @md:w-[5.5rem]">
                        <Icon size={12} aria-hidden="true" />
                        {period.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.map((entry) => (
                          <TimePill
                            key={entry.slot}
                            kind={kindOf(entry)}
                            time={formatTime(entry.slot)}
                            slot={entry.slot}
                            dayLabel={day ? relativeDayLabel(day, today) : ''}
                            doctor={provider.name}
                            onPick={() => day && onPick(provider.providerId, day, entry.slot)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
                {hidden > 0 || (expanded && !chosen && upcoming.length > fold) ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={open}
                    className="focus-ring inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-1 text-xs font-semibold text-primary-text hover:underline"
                  >
                    <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
                    {open ? 'Show fewer times' : `Show all ${upcoming.length} times`}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function TimePill({
  kind,
  time,
  slot,
  dayLabel,
  doctor,
  onPick,
}: {
  kind: 'free' | 'earliest' | 'selected' | 'booked'
  time: string
  slot: string
  dayLabel: string
  doctor: string
  onPick: () => void
}) {
  const look = kind === 'earliest' ? tintedChip('green') : kind === 'booked' ? tintedChip('pink') : tintedChip('blue')
  const spoken =
    kind === 'booked' ? 'already booked' : kind === 'selected' ? 'selected' : kind === 'earliest' ? 'free — the earliest open time' : 'free'
  return (
    <button
      type="button"
      data-slot={slot}
      disabled={kind === 'booked'}
      aria-pressed={kind === 'booked' ? undefined : kind === 'selected'}
      aria-label={`${doctor}, ${dayLabel} ${time}, ${spoken}`}
      title={kind === 'booked' ? `${time} · already booked` : time}
      onClick={onPick}
      style={kind === 'selected' ? undefined : look.style}
      className={cn(
        'focus-ring tap-reach inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-xs font-semibold tabular-nums transition-all duration-200',
        kind === 'selected' ? SELECTED_CHIP : look.className,
        kind === 'booked' ? 'cursor-not-allowed line-through decoration-1 opacity-60' : kind !== 'selected' && 'hover:-translate-y-0.5 hover:shadow-card-md active:scale-[0.97]',
      )}
    >
      {kind === 'selected' ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : kind === 'earliest' ? <Sparkles size={12} aria-hidden="true" /> : null}
      {time}
    </button>
  )
}
