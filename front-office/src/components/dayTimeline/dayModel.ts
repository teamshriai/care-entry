/**
 * One doctor's day, 7 AM to 7 PM — wider where something is booked earlier or
 * later (an operation at 6 AM, extra hours to 9 PM) — as `DayTimeline` draws it.
 * A port of the Shri Health doctors' Dashboard Today chart (doctors-portal
 * `src/shri/myday/dayModel.ts`), with no data of its own: the caller passes the day.
 *
 *   · activities: the doctor's sessions and activities, each of a kind that picks its colour;
 *   · bookings: patients booked, each for its own time — but not one inside an
 *     activity: the activity (an OPD session) covers it;
 *   · blocks: blocked time, the doctor's own;
 *   · free time: the working day (8 AM to 5 PM, Monday to Saturday, less lunch,
 *     12:30 to 2 PM, unless `work` says otherwise) and any extra hours opened on
 *     the day (`openings`), less all of the above;
 *   · off hours: the rest, lunch among them — bookable only once extra hours are
 *     opened. Something booked into off hours (an early operation) is busy there.
 *
 * Overlaps are merged for the totals, so no minute counts twice; on the one row
 * a bar ends where the next begins. Free time and off hours from now on can be
 * tapped — never time already gone. Every time is minutes after midnight.
 */

import type { LucideIcon } from 'lucide-react'

export const GRID_START = 7
export const GRID_HOURS = 12
export const START = GRID_START * 60
export const END = START + GRID_HOURS * 60

export type Span = [number, number]

/** Lunch: off hours like any other, which may be opened as extra hours. */
export const LUNCH: Span = [12 * 60 + 30, 14 * 60]
/** The working day, Monday to Saturday: 8 AM to 5 PM, less lunch. */
export const WORK: Span[] = [[8 * 60, LUNCH[0]], [LUNCH[1], 17 * 60]]
/** Free time shorter than this is not named "next free". */
const MIN_FREE = 15

export type ActivityKind = 'brief' | 'opd' | 'tele' | 'ward' | 'paper' | 'discharge' | 'stroke' | 'patient' | 'procedure' | 'other'
export type ItemKind = ActivityKind | 'blocked' | 'free' | 'off'

export const KIND_LABEL: Record<ItemKind, string> = {
  brief: 'Morning brief',
  opd: 'OPD',
  tele: 'Teleconsult',
  ward: 'Ward round',
  paper: 'Paperwork',
  discharge: 'Discharge',
  stroke: 'Stroke',
  patient: 'Booked patient',
  procedure: 'Procedure',
  other: 'Other',
  blocked: 'Blocked',
  free: 'Available',
  off: 'Off hours',
}

const ACTIVITY_KINDS = new Set<ItemKind>(['brief', 'opd', 'tele', 'ward', 'paper', 'discharge', 'stroke', 'patient', 'procedure', 'other'])
export const isActivity = (k: ItemKind): k is ActivityKind => ACTIVITY_KINDS.has(k)

/** A session, an activity or a booked patient. */
export interface DayActivity {
  id: string
  kind: ActivityKind
  start: number
  end: number
  title: string
  /** Read out after the title and time: "5 patients · 2 seen". */
  detail?: string
  /** The bar's icon; each kind has its own by default. */
  icon?: LucideIcon
}

/** Blocked time; an all-day block covers the whole row. */
export interface DayBlock {
  id: string
  start: number
  end: number
  reason: string
  allDay?: boolean
}

export interface DayInput {
  /** The day drawn (any time on it). */
  date: Date
  /** The time now; the day is "today" when it falls on `date`. Defaults to the clock. */
  now?: Date
  activities: DayActivity[]
  /** Booked patients. One inside an activity is covered by it and not drawn on its own. */
  bookings?: DayActivity[]
  blocks?: DayBlock[]
  /** Extra hours opened on the day, free to book. */
  openings?: Span[]
  /** Working hours. Defaults to WORK, or none on a Sunday; pass [] for a day on leave. */
  work?: Span[]
}

export interface TimelineItem {
  id: string
  kind: ItemKind
  start: number
  end: number
  /** Where its bar ends on the one row — at the next activity's start, where they overlap. */
  drawEnd: number
  title: string
  activity?: DayActivity
  block?: DayBlock
  /** Free time or off hours already gone: drawn, never offered. */
  past?: boolean
  /** Free time in extra hours. */
  extra?: boolean
}

export interface HourCell {
  start: number
  /** The hour's end — a half hour where the range ends on one. */
  end: number
  busyMin: number
  blockedMin: number
  offMin: number
  freeMin: number
  bookings: number
  titles: string[]
}

export interface DayModel {
  /** The hours drawn: 7 AM to 7 PM, wider where something falls outside them, on the half hour. */
  range: Span
  /** Every bar, in time order, covering the range end to end. */
  items: TimelineItem[]
  busyMin: number
  blockedMin: number
  freeMin: number
  offMin: number
  /** The first free stretch of 15 minutes or more still to come. */
  nextFree: number | null
  /** Hour by hour, for screen readers. */
  cells: HourCell[]
  /** Now, in minutes after midnight, on today; null on any other day. */
  now: number | null
  /** The day in one sentence: the chart's accessible name. */
  summary: string
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

function merge(spans: Span[]): Span[] {
  const out: Span[] = []
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

const total = (spans: Span[]) => spans.reduce((n, [a, b]) => n + b - a, 0)
const overlap = (spans: Span[], [a, b]: Span) => spans.reduce((n, [s, e]) => n + Math.max(0, Math.min(b, e) - Math.max(a, s)), 0)
/** The spans less the cuts: working hours less breaks, `minus([[540, 1020]], [[780, 840]])`. */
export const minus = (spans: Span[], cut: Span[]): Span[] =>
  cut.reduce<Span[]>(
    (acc, [cs, ce]) => acc.flatMap(([s, e]): Span[] => (ce <= s || cs >= e ? [[s, e]] : ([cs > s ? [s, cs] : null, ce < e ? [ce, e] : null].filter(Boolean) as Span[]))),
    spans,
  )

export function dayModel(day: DayInput): DayModel {
  const NOW = day.now ?? new Date()
  const date = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate())
  const isToday = date.getTime() === new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime()
  const now = isToday ? minutesOf(NOW) : null

  const sessions = day.activities.map((a) => ({ a, span: [a.start, a.end] as Span }))
  const inSessions = merge(sessions.map((s) => s.span))
  const bookings = day.bookings ?? []
  const outside = bookings.map((a) => ({ a, span: [a.start, a.end] as Span })).filter((b) => overlap(inSessions, b.span) === 0)
  const openings = day.openings ?? []
  const dayBlocks = day.blocks ?? []
  const partBlocks = dayBlocks.filter((b) => !b.allDay).map((b): Span => [b.start, b.end])

  // The hours drawn: 7 to 7, out to the half hour of anything earlier or later still to come — an
  // operation at 6 AM tomorrow widens the day; one at 3 AM that is over does not stretch today.
  // Working hours count too: a session to 9 PM is drawn to 9 PM, not cut at 7.
  const over = now ?? (date < NOW ? Infinity : -Infinity)
  const edges = [...sessions.map((o) => o.span), ...outside.map((o) => o.span), ...openings, ...(day.work ?? []), ...partBlocks].filter(([, b]) => b > over)
  const range: Span = [
    Math.max(0, Math.min(START, ...edges.map(([a]) => Math.floor(a / 30) * 30))),
    Math.min(24 * 60, Math.max(END, ...edges.map(([, b]) => Math.ceil(b / 30) * 30))),
  ]
  const clip = ([a, b]: Span): Span | null => {
    const s = Math.max(a, range[0])
    const e = Math.min(b, range[1])
    return e > s ? [s, e] : null
  }
  /** Everything before this has gone. */
  const gone = now ?? (date < NOW ? range[1] : range[0])

  const blocks = dayBlocks
    .map((b) => ({ b, span: clip(b.allDay ? range : [b.start, b.end]) }))
    .filter((x): x is { b: DayBlock; span: Span } => x.span !== null)
  const blocked = merge(blocks.map((x) => x.span))
  const occupied = [...sessions, ...outside]
    .map((o) => ({ a: o.a, span: clip(o.span) }))
    .filter((o): o is { a: DayActivity; span: Span } => o.span !== null)
  const doing = merge(occupied.map((o) => o.span))
  const busy = minus(doing, blocked)

  // Working time: the working day and the day's extra hours.
  const base: Span[] = day.work ?? (date.getDay() === 0 ? [] : WORK)
  const extra = minus(merge(openings), base)
  const taken = merge([...doing, ...blocked])
  // Free time outside the hours drawn (working hours that are over, before 7 or after 7) has no bar.
  const drawn = (spans: Span[]) => spans.map(clip).filter((s): s is Span => s !== null)
  const free = [...drawn(minus(base, taken)).map((f) => ({ f, extra: false })), ...drawn(minus(extra, taken)).map((f) => ({ f, extra: true }))]
  const off = minus(minus([range], merge([...base, ...extra])), taken)

  // The bars. Blocked time lies under everything; activities sit on one row, each ending where the next begins.
  const acts: TimelineItem[] = occupied
    .map(({ a, span }) => ({ id: a.id, kind: a.kind as ItemKind, start: span[0], end: span[1], drawEnd: span[1], title: a.title, activity: a }))
    .sort((x, y) => x.start - y.start || y.end - x.end)
  acts.forEach((a, i) => {
    const next = acts.slice(i + 1).find((n) => n.start > a.start)
    if (next && next.start < a.end) a.drawEnd = next.start
  })
  const items: TimelineItem[] = [
    ...blocks.map(({ b, span }) => ({ id: `block-${b.id}`, kind: 'blocked' as const, start: span[0], end: span[1], drawEnd: span[1], title: `Blocked · ${b.reason}`, block: b })),
    ...acts,
  ]
  // Free time and off hours, split at now: what has gone is drawn but never offered.
  const split = (kind: 'free' | 'off', [a, b]: Span, title: string, isExtra = false) => {
    if (a < gone) items.push({ id: `${kind}-gone-${a}`, kind, start: a, end: Math.min(b, gone), drawEnd: Math.min(b, gone), title, past: true, extra: isExtra })
    if (b > gone) items.push({ id: `${kind}-${Math.max(a, gone)}`, kind, start: Math.max(a, gone), end: b, drawEnd: b, title, extra: isExtra })
  }
  for (const { f, extra: x } of free) split('free', f, x ? 'Extra hours' : 'Available', x)
  for (const o of off) split('off', o, 'Off hours')
  items.sort((x, y) => x.start - y.start)

  const open = items.filter((i) => i.kind === 'free' && !i.past && i.end - i.start >= MIN_FREE)

  const hours = (range[1] - range[0]) / 60
  const cells: HourCell[] = Array.from({ length: Math.ceil(hours) }, (_, i) => {
    const span: Span = [range[0] + i * 60, Math.min(range[1], range[0] + (i + 1) * 60)]
    const busyMin = overlap(busy, span)
    const blockedMin = overlap(blocked, span)
    const offMin = overlap(off, span)
    const titles = [
      ...blocks.filter((x) => overlap([x.span], span) > 0).map((x) => `Blocked · ${x.b.reason}`),
      ...occupied.filter((o) => overlap([o.span], span) > 0).map((o) => o.a.title),
    ]
    return {
      start: span[0],
      end: span[1],
      busyMin,
      blockedMin,
      offMin,
      freeMin: span[1] - span[0] - busyMin - blockedMin - offMin,
      bookings: bookings.filter((b) => b.start >= span[0] && b.start < span[1]).length,
      titles: [...new Set(titles)],
    }
  })

  const busyMin = total(busy)
  const blockedMin = total(blocked)
  const offMin = total(off)
  const freeMin = range[1] - range[0] - busyMin - blockedMin - offMin
  const nextFree = open[0]?.start ?? null
  const booked = bookings.length
  const summary = [
    `${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: busy ${durationSpoken(busyMin)}, free ${durationSpoken(freeMin)}`,
    offMin ? `off hours ${durationSpoken(offMin)}` : '',
    blockedMin ? `blocked ${durationSpoken(blockedMin)}` : '',
    booked ? `${booked} patient${booked === 1 ? '' : 's'} booked` : '',
    nextFree !== null ? `next free ${clock12(nextFree)}` : '',
  ]
    .filter(Boolean)
    .join(', ')

  return { range, items, busyMin, blockedMin, freeMin, offMin, nextFree, cells, now, summary }
}

/** One hour, for the screen-reader list: "2–3 PM · busy · OPD · 2 patients". */
export function hourLine(c: HourCell) {
  const whole = c.end - c.start
  const parts = [
    c.busyMin === whole ? 'busy' : c.busyMin && `${c.busyMin} min busy`,
    c.blockedMin === whole ? 'blocked' : c.blockedMin && `${c.blockedMin} min blocked`,
    c.offMin === whole ? 'off hours' : c.offMin && `${c.offMin} min off hours`,
    c.freeMin === whole ? 'free' : c.freeMin && `${c.freeMin} min free`,
  ].filter(Boolean)
  const who = c.bookings ? ` · ${c.bookings} patient${c.bookings === 1 ? '' : 's'}` : ''
  return `${span12(c.start, c.end)} · ${parts.join(', ')}${c.titles.length ? ` · ${c.titles.join(', ')}` : ''}${who}`
}

/** 370 → "6h 10m", 60 → "1h", 45 → "45m". */
export function duration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

/** 370 → "6 hours 10 minutes", for screen readers. */
export function durationSpoken(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : ''
  const ms = m ? `${m} minute${m === 1 ? '' : 's'}` : ''
  return [hs, ms].filter(Boolean).join(' ') || '0 minutes'
}

/** "HH:MM" → minutes after midnight: "09:30" → 570. */
export const minutesFrom = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** The minute on a date, as a Date. */
export const atMinute = (date: Date, min: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(min / 60), min % 60)

/* ── 12-hour clock, as the day's views read ─────────────────────────── */

/** "8:40", and on the hour "8" — or "8:00" where `minutes` is asked for. */
const hour12 = (min: number, minutes = false) => {
  const h = Math.floor(min / 60) % 12 || 12
  const m = min % 60
  return m || minutes ? `${h}:${String(m).padStart(2, '0')}` : `${h}`
}
const period = (min: number) => (Math.floor(min / 60) % 24 < 12 ? 'AM' : 'PM')

/** 520 → "8:40 AM", 840 → "2 PM". */
export const clock12 = (min: number) => `${hour12(min)} ${period(min)}`
/** A stretch, the period said once where it can be: "8–9 AM", "11:30 AM–1 PM". */
export const span12 = (a: number, b: number) => (period(a) === period(b) ? `${hour12(a)}–${hour12(b)} ${period(b)}` : `${clock12(a)}–${clock12(b)}`)
/** 480 → "8:00 AM". */
export const time12 = (min: number) => `${hour12(min, true)} ${period(min)}`
/** A stretch with its minutes: "8:00 – 9:00 AM", "11:30 AM – 1:00 PM". */
export const range12 = (a: number, b: number) => (period(a) === period(b) ? `${hour12(a, true)} – ${hour12(b, true)} ${period(b)}` : `${time12(a)} – ${time12(b)}`)
