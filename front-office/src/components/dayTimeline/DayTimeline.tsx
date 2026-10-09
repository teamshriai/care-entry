/**
 * The day as one row of bars across the hours, 7 AM to 7 PM — wider where
 * something falls outside them (`DayModel.range`). A port of the Shri Health
 * doctors' Dashboard Today chart (doctors-portal `src/shri/myday/DayTimeline.tsx`),
 * drawn with plain CSS (`dayTimeline.css`) instead of Tailwind:
 *
 *   · the hours along the top, every half hour, 12-hour with AM and PM;
 *   · each activity a bar in its own colour, named on it with its time
 *     ("OPD · 8:00 – 9:00 AM"); a patient booked outside a session, the same;
 *   · free time a dashed green bar with a +, no words — from now on, tapping it
 *     schedules a patient at the minute tapped (the hover card's minute); free
 *     time already gone is drawn, never offered; extra hours carry a clock with a +;
 *   · off hours (lunch among them) hatched grey — from now on, tapping them asks
 *     whether to open extra hours there or to schedule there anyway; blocked
 *     time hatched red with ⊘;
 *   · the Now line, red, labelled with the time.
 *
 * One size on every screen: PX_PER_MIN, and every stretch of five minutes or
 * more at least MIN_BAR wide, so a 15-minute booking or gap is a bar the size
 * of a half hour. Where the screen is narrower the row scrolls sideways, opened
 * at Now; where it is wider the longer stretches stretch to fill it.
 *
 * Hovering anywhere on the row says what is at that minute, how long is left of
 * it, and what comes next. A bar says as much as fits (container queries): its
 * icon, name and time; a shorter time ("8–9 AM") where the full one does not
 * fit; its icon alone on a half hour. What a tap does is the caller's: the
 * dialogs (schedule, open extra hours, unblock) are Care Entry's own.
 *
 * Usage:
 *   const model = useMemo(() => dayModel({ date, activities, bookings, blocks }), [...])
 *   <DayTimeline model={model} onSchedule={…} onOffHours={…} onBlocked={…} onOpen={…} />
 *   <DayTimelineKey model={model} />
 */

import {
  Ban,
  BedDouble,
  Brain,
  Circle,
  ClockPlus,
  DoorOpen,
  PenLine,
  Plus,
  Stethoscope,
  Sunrise,
  Syringe,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

import { KIND_LABEL, duration, hourLine, isActivity, range12, span12, time12, type ActivityKind, type DayModel, type Span, type TimelineItem } from './dayModel'
import './dayTimeline.css'

/** The row's scale on every screen: twelve hours are about 1,330px, before the short stretches widen. */
const PX_PER_MIN = 1.85
/** The narrowest a stretch of five minutes or more is drawn: a 15-minute booking or gap as wide as a half hour. */
const MIN_BAR = 72

/** Each kind's icon, where an activity names none. */
const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  brief: Sunrise,
  opd: Stethoscope,
  tele: Video,
  ward: BedDouble,
  paper: PenLine,
  discharge: DoorOpen,
  stroke: Brain,
  patient: Stethoscope,
  procedure: Syringe,
  other: Circle,
}
const iconOf = (item: TimelineItem) => item.activity?.icon ?? KIND_ICON[item.kind as ActivityKind] ?? Circle

function Icon({ icon: I, size, strokeWidth = 1.8 }: { icon: LucideIcon; size: number; strokeWidth?: number }) {
  return <I size={size} strokeWidth={strokeWidth} className="dtl-icon" aria-hidden="true" />
}

/** The hours drawn, as minutes (`mins`) and where each falls on the row, as a fraction of its width (`fracs`) — straight lines between. */
type Scale = { mins: number[]; fracs: number[] }

/** Every bar edge cuts the row; each piece of five minutes or more gets MIN_BAR at least, the rest share what is left by their minutes. */
function scaleFor(model: DayModel, width: number): Scale {
  const [r0, r1] = model.range
  const mins = [...new Set([r0, r1, ...model.items.flatMap((i) => [i.start, i.drawEnd])])].filter((m) => m >= r0 && m <= r1).sort((a, b) => a - b)
  const len = mins.slice(1).map((b, i) => b - mins[i])
  const least = len.map((m) => (m >= 5 ? MIN_BAR : 0))
  const held = new Set<number>()
  let k = width / (r1 - r0)
  for (;;) {
    const heldW = [...held].reduce((n, i) => n + least[i], 0)
    const rest = len.reduce((n, m, i) => (held.has(i) ? n : n + m), 0)
    k = rest ? Math.max(0, width - heldW) / rest : 0
    const more = len.flatMap((m, i) => (!held.has(i) && m * k < least[i] ? [i] : []))
    if (!more.length) break
    for (const i of more) held.add(i)
  }
  const fracs = [0]
  len.forEach((m, i) => fracs.push(fracs[i] + (held.has(i) ? least[i] : m * k) / width))
  return { mins, fracs }
}

/** The row's own width, the same on every screen: PX_PER_MIN, and MIN_BAR for each short stretch. */
function widthFor(model: DayModel): number {
  const [r0, r1] = model.range
  const mins = [...new Set([r0, r1, ...model.items.flatMap((i) => [i.start, i.drawEnd])])].filter((m) => m >= r0 && m <= r1).sort((a, b) => a - b)
  return mins.slice(1).reduce((n, b, i) => n + Math.max(b - mins[i] >= 5 ? MIN_BAR : 0, (b - mins[i]) * PX_PER_MIN), 0)
}

/** The piece of the row a value falls in: the last piece whose start is at or before it. */
function pieceOf(edges: number[], v: number): number {
  let i = 0
  while (i < edges.length - 2 && edges[i + 1] <= v) i += 1
  return i
}

/** Where a minute falls on the row, as a fraction of its width. */
function fracOf(s: Scale, min: number): number {
  const i = pieceOf(s.mins, min)
  const [a, b] = [s.mins[i], s.mins[i + 1]]
  return s.fracs[i] + ((Math.min(Math.max(min, a), b) - a) / (b - a)) * (s.fracs[i + 1] - s.fracs[i])
}

/** The minute at a fraction of the row's width. */
function minOf(s: Scale, f: number): number {
  const i = pieceOf(s.fracs, f)
  const [a, b] = [s.fracs[i], s.fracs[i + 1]]
  return s.mins[i] + (b > a ? ((Math.min(Math.max(f, a), b) - a) / (b - a)) * (s.mins[i + 1] - s.mins[i]) : 0)
}

const at = (s: Scale, min: number) => `${fracOf(s, min) * 100}%`
const between = (s: Scale, a: number, b: number) => `${(fracOf(s, b) - fracOf(s, a)) * 100}%`

export function DayTimeline({
  model,
  nextPatient,
  onOpen,
  onSchedule,
  onOffHours,
  onBlocked,
}: {
  model: DayModel
  /** The OPD queue's next patient, today — named when hovering the OPD on now. */
  nextPatient?: { name: string; token: string }
  /** An activity tapped. Without it, activities are drawn but not buttons. */
  onOpen?: (item: TimelineItem) => void
  /** Schedule a patient at a minute of free time; `until` is where that free time ends. */
  onSchedule: (at: number, until: number) => void
  /** Off hours tapped at a minute: open extra hours there, or schedule there anyway. */
  onOffHours: (at: number, off: Span) => void
  /** Blocked time tapped: offer to unblock it. */
  onBlocked: (blockId: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const minW = widthFor(model)
  const [w, setW] = useState(minW)
  const scale = scaleFor(model, Math.max(w, minW))
  const [hover, setHover] = useState<{ min: number; x: number; top: number; left: number } | null>(null)

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Where the row scrolls, open it at Now (or the day's first activity), a third of the way in.
  const focusMin = model.now ?? model.items.find((i) => isActivity(i.kind))?.start ?? 8 * 60
  const focus = fracOf(scale, focusMin)
  useEffect(() => {
    const s = scrollRef.current
    if (!s || s.scrollWidth <= s.clientWidth) return
    s.scrollLeft = Math.max(0, 26 + focus * (s.scrollWidth - 52) - s.clientWidth / 3)
  }, [focus])

  const minuteAt = (clientX: number) => {
    const r = rowRef.current!.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - r.left, 0), r.width)
    return Math.min(model.range[1] - 5, Math.round(minOf(scale, x / r.width) / 5) * 5)
  }
  /** The minute tapped — the same one the hover card names — kept inside the bar and at least 10 minutes before it ends; from the keyboard, its start.
   *  With a mouse it is the hover card's own minute: a click's clientX is whole pixels while the pointer's is not, so at a 5-minute edge they can round apart. */
  const tapped = (item: TimelineItem, clientX?: number) => {
    const first = Math.ceil(item.start / 5) * 5
    const at = clientX !== undefined && rowRef.current ? (hover?.min ?? minuteAt(clientX)) : first
    return Math.min(Math.max(at, first), item.end - Math.min(10, item.end - first))
  }
  const tap = (item: TimelineItem, clientX?: number) => {
    if (item.kind === 'blocked') return item.block && onBlocked(item.block.id)
    if (item.kind === 'off') return onOffHours(tapped(item, clientX), [item.start, item.end])
    onSchedule(tapped(item, clientX), item.end)
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || !rowRef.current || !wrapRef.current) return
    const r = rowRef.current.getBoundingClientRect()
    const wrap = wrapRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width)
    setHover({ min: minuteAt(e.clientX), x, top: r.bottom - wrap.top + 12, left: Math.min(Math.max(e.clientX - wrap.left - 140, 0), wrap.width - 280) })
  }

  const under = (min: number) =>
    model.items.find((i) => isActivity(i.kind) && i.start <= min && min < i.drawEnd) ??
    model.items.find((i) => i.kind === 'blocked' && i.start <= min && min < i.end) ??
    model.items.find((i) => i.start <= min && min < i.end)
  const nextAfter = (min: number) => model.items.find((i) => isActivity(i.kind) && i.start > min)

  const marks = Array.from({ length: (model.range[1] - model.range[0]) / 30 + 1 }, (_, i) => model.range[0] + i * 30)
  // A half hour is named only where there is room between its neighbours; the hours always are.
  const roomy = (m: number) =>
    m % 60 === 0 || [m - 30, m + 30].filter((n) => n >= model.range[0] && n <= model.range[1]).every((n) => Math.abs(fracOf(scale, n) - fracOf(scale, m)) * w >= 40)
  const nowSide = model.now !== null && model.now > model.range[1] - 90 ? 'left' : 'right'
  const hovered = hover ? under(hover.min) : undefined

  return (
    <div ref={wrapRef} className="dtl">
      <div ref={scrollRef} className="dtl-scroll">
        <div className="dtl-track" style={{ minWidth: minW + 52 }}>
          <div className="dtl-inner">
            {/* Now, named above the hours. */}
            <div className="dtl-now-head" aria-hidden="true">
              {model.now !== null && (
                <span className="dtl-now-label" data-side={nowSide} style={{ left: at(scale, model.now) }}>
                  <span>Now</span>
                  <span>{time12(model.now)}</span>
                </span>
              )}
            </div>

            {/* The hours, every half hour. */}
            <div className="dtl-hours" aria-hidden="true">
              {marks.filter(roomy).map((m) => {
                const t = time12(m)
                return (
                  <span key={m} className="dtl-hour" data-whole={m % 60 === 0 ? '' : undefined} style={{ left: at(scale, m) }}>
                    <span>{t.slice(0, -3)}</span>
                    <span className="dtl-hour-period">{t.slice(-2)}</span>
                  </span>
                )
              })}
            </div>
            <Ticks marks={marks} scale={scale} />

            {/* The row. */}
            <div ref={rowRef} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="dtl-row">
              {model.items.map((item) => (
                <Bar key={item.id} item={item} scale={scale} px={(fracOf(scale, item.drawEnd) - fracOf(scale, item.start)) * w - 4} onOpen={onOpen} onTap={tap} />
              ))}
              {hover && (
                <span aria-hidden="true" className="dtl-guide" style={{ left: hover.x }}>
                  <span className="dtl-guide-dot" />
                  <span className="dtl-guide-line" />
                  <span className="dtl-guide-dot" />
                </span>
              )}
            </div>
            <Ticks marks={marks} scale={scale} />

            {/* The Now line, from its label through the row. */}
            {model.now !== null && (
              <span aria-hidden="true" className="dtl-now-line" style={{ left: at(scale, model.now) }}>
                <span className="dtl-now-dot" />
                <span className="dtl-now-dash" />
                <span className="dtl-now-end" />
              </span>
            )}
          </div>
        </div>
      </div>

      {hover && (
        <HoverCard
          min={hover.min}
          item={hovered}
          next={nextAfter(hover.min)}
          nextPatient={nextPatient && model.now !== null && hovered?.kind === 'opd' && hovered.start <= model.now && model.now < hovered.end ? nextPatient : undefined}
          style={{ top: hover.top, left: hover.left }}
        />
      )}
    </div>
  )
}

function Ticks({ marks, scale }: { marks: number[]; scale: Scale }) {
  return (
    <div className="dtl-ticks" aria-hidden="true">
      {marks.map((m) => (
        <span key={m} className="dtl-tick" style={{ left: at(scale, m) }} />
      ))}
    </div>
  )
}

/** One bar: an activity, free time, off hours or blocked time — a button where it does something and is wide enough to tap. */
function Bar({ item, scale, px, onOpen, onTap }: { item: TimelineItem; scale: Scale; px: number; onOpen?: (item: TimelineItem) => void; onTap: (item: TimelineItem, clientX?: number) => void }) {
  const place: CSSProperties = { left: `calc(${at(scale, item.start)} + 2px)`, width: `calc(${between(scale, item.start, item.drawEnd)} - 4px)` }
  const when = range12(item.start, item.end)
  /** Anything drawn is tapped — a sliver too thin to see is not drawn as a control. */
  const tappable = px >= 2
  /** The time, full where it fits, short where it does not. */
  const time = (
    <>
      <span className="dtl-time dtl-time-short">{span12(item.start, item.end)}</span>
      <span className="dtl-time dtl-time-long">{when}</span>
    </>
  )

  if (item.kind === 'off') {
    if (item.past || !tappable) return <span aria-hidden="true" title={`${item.title} · ${when}`} className="dtl-bar dtl-off" style={place} />
    return (
      <button
        type="button"
        onClick={(e) => onTap(item, e.detail > 0 ? e.clientX : undefined)}
        aria-label={`${item.title} ${when} — open extra hours or schedule here`}
        title={`${item.title} ${when} — tap to open extra hours or schedule here`}
        className="dtl-bar dtl-off"
        style={place}
      />
    )
  }

  if (item.kind === 'blocked') {
    const inner = (
      <span className="dtl-bar-in">
        <Icon icon={Ban} size={15} />
        <span className="dtl-words">
          <span className="dtl-title">Blocked</span>
          <span className="dtl-time">{item.title.replace(/^Blocked · /, '')}</span>
        </span>
      </span>
    )
    return tappable && item.block ? (
      <button type="button" onClick={() => onTap(item)} aria-label={`${item.title} ${when} — unblock`} title={`${item.title} · ${when} — tap to unblock`} className="dtl-bar dtl-blocked" style={place}>
        {inner}
      </button>
    ) : (
      <span title={`${item.title} · ${when}`} className="dtl-bar dtl-blocked" style={place}>
        {inner}
      </span>
    )
  }

  if (item.kind === 'free') {
    if (item.past) return <span aria-hidden="true" title={`${item.title} · ${when} · gone`} className="dtl-bar dtl-free-gone" style={place} />
    // A picture, not words: + where a patient can be scheduled, a clock with + in extra hours.
    const words = <Icon icon={item.extra ? ClockPlus : Plus} size={18} strokeWidth={2.25} />
    return tappable ? (
      <button
        type="button"
        onClick={(e) => onTap(item, e.detail > 0 ? e.clientX : undefined)}
        aria-label={`${item.title} ${when} — schedule an appointment`}
        title={`${item.title} ${when} — tap a time to schedule`}
        className="dtl-bar dtl-free"
        style={place}
      >
        {words}
      </button>
    ) : (
      <span title={`${item.title} ${when}`} className="dtl-bar dtl-free" style={place}>
        {words}
      </span>
    )
  }

  // An activity, or a patient booked outside a session.
  const detail = item.activity?.detail
  const inner = (
    <span className="dtl-bar-in">
      <Icon icon={iconOf(item)} size={18} />
      <span className="dtl-words">
        <span className="dtl-title">{item.title}</span>
        {time}
      </span>
    </span>
  )
  const tight = px < 20 ? '' : undefined
  return tappable && onOpen ? (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`${item.title}, ${when}${detail ? `, ${detail}` : ''}`}
      title={`${item.title} · ${when}`}
      className="dtl-bar dtl-act"
      data-kind={item.kind}
      data-tight={tight}
      style={place}
    >
      {inner}
    </button>
  ) : (
    <span title={`${item.title} · ${when}`} className="dtl-bar dtl-act" data-kind={item.kind} data-tight={tight} style={place}>
      {inner}
    </span>
  )
}

/** What is at the minute under the pointer, how long is left of it, and what comes next — in the OPD on now, the queue's next patient. */
function HoverCard({ min, item, next, nextPatient, style }: { min: number; item?: TimelineItem; next?: TimelineItem; nextPatient?: { name: string; token: string }; style: CSSProperties }) {
  if (!item) return null
  const left = item.end - min
  const what =
    item.kind === 'free'
      ? item.past
        ? { dot: 'var(--dtl-line-strong)', name: 'Free', aside: 'gone' }
        : { dot: 'var(--avail-edge)', name: item.extra ? 'Available · extra hours' : 'Available', aside: `${left} min free` }
      : item.kind === 'off'
        ? { dot: 'var(--off-hatch)', name: 'Off hours', aside: item.past ? '' : 'Tap for options' }
        : item.kind === 'blocked'
          ? { dot: 'var(--dtl-crit)', name: item.title, aside: range12(item.start, item.end) }
          : { dot: `var(--act-${item.kind})`, name: item.title, aside: range12(item.start, item.end) }
  return (
    <div aria-hidden="true" className="dtl-card" style={style}>
      <p className="dtl-card-time">{time12(min)}</p>
      <p className="dtl-card-what">
        <span className="dtl-card-dot" style={{ background: what.dot }} />
        <span className="dtl-card-name" data-free={item.kind === 'free' && !item.past ? '' : undefined}>
          {what.name}
        </span>
        <span className="dtl-card-aside">{what.aside}</span>
      </p>
      <p className="dtl-card-next">
        {nextPatient ? (
          <>
            <span className="dtl-card-next-what">
              Next patient: <b>{nextPatient.name}</b>
            </span>
            <span className="dtl-card-next-when">{nextPatient.token}</span>
          </>
        ) : next ? (
          <>
            <span className="dtl-card-next-what">
              Next: <b>{next.title}</b>
            </span>
            <span className="dtl-card-next-when">{time12(next.start)}</span>
          </>
        ) : (
          <span>Nothing after this</span>
        )}
      </p>
    </div>
  )
}

/** The key under the row — and, for a screen reader, the day in one sentence and hour by hour — with the day's busy and free time. */
export function DayTimelineKey({ model }: { model: DayModel }) {
  const events = model.items.filter((i) => isActivity(i.kind))
  // A booked patient is an OPD visit, in the OPD's green: the key names it once, as OPD.
  const kinds = [...new Set(events.map((e) => (e.kind === 'patient' ? 'opd' : e.kind) as ActivityKind))]
  const has = (k: string) => model.items.some((i) => i.kind === k && !i.past)
  return (
    <div className="dtl dtl-legend">
      <div role="img" aria-label={model.summary} className="dtl-key">
        {kinds.map((k) => (
          <span key={k} className="dtl-key-item">
            <span className="dtl-swatch" data-kind={k} />
            {KIND_LABEL[k]}
          </span>
        ))}
        {model.items.some((i) => i.kind === 'free' && !i.past && !i.extra) && (
          <span className="dtl-key-item">
            <span className="dtl-swatch-free">
              <Plus size={11} strokeWidth={2.5} aria-hidden="true" />
            </span>
            Available
          </span>
        )}
        {model.items.some((i) => i.extra) && (
          <span className="dtl-key-item">
            <span className="dtl-swatch-free">
              <ClockPlus size={11} strokeWidth={2.5} aria-hidden="true" />
            </span>
            Extra hours
          </span>
        )}
        {has('blocked') && (
          <span className="dtl-key-item">
            <span className="dtl-swatch-blocked" />
            Blocked
          </span>
        )}
        {has('off') && (
          <span className="dtl-key-item">
            <span className="dtl-swatch-off" />
            Off hours
          </span>
        )}
      </div>
      <p className="dtl-totals">
        Busy <b>{duration(model.busyMin)}</b> · Free <b>{duration(model.freeMin)}</b>
        {model.nextFree !== null && (
          <>
            {' '}
            · Next free <b>{time12(model.nextFree)}</b>
          </>
        )}
      </p>
      <ul className="dtl-sr" aria-label="Hour by hour">
        {model.cells.map((c) => (
          <li key={c.start}>{hourLine(c)}</li>
        ))}
      </ul>
    </div>
  )
}
