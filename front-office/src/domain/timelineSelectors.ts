import type { AppState } from '../types/store'
import type { DoctorRow } from '../types/doctor'
import { getDoctorRows, getSlotBoard } from './selectors'

/**
 * What one hour of a doctor's day looks like from the desk:
 *   free  — every slot in the hour is open
 *   some  — some slots still open (others booked or already past)
 *   full  — every bookable slot is booked
 *   break — the hour is the doctor's break
 *   past  — the hour is over
 */
export type HourState = 'free' | 'some' | 'full' | 'break' | 'past'

export interface HourCell {
  /** 0–23 */
  hour: number
  state: HourState
  booked: number
  /** Bookable slots in the hour (breaks excluded). */
  total: number
  /** Slots still open to book — not booked and not already past. */
  open: number
  /** The first slot still open in this hour — what a tap books. */
  firstOpen: string | null
  /** The hour the clock is in now. */
  current: boolean
}

export interface DoctorStrip {
  row: DoctorRow
  /** Hours of this doctor's session, in order. Empty when not working today. */
  hours: HourCell[]
}

export interface DoctorTimeline {
  strips: DoctorStrip[]
  /** The shared hour axis (first and last hour across every session), so
   *  rows line up hour under hour. */
  firstHour: number
  lastHour: number
}

/**
 * Today's sessions, hour by hour, for every doctor — derived from the same
 * slot board Schedule Appointment books from, so a colour here always agrees
 * with what booking offers.
 */
export function getDoctorTimeline(state: AppState, now: number): DoctorTimeline {
  const nowHour = new Date(now).getHours()
  const strips: DoctorStrip[] = getDoctorRows(state, now).map((row) => {
    const board = getSlotBoard(state, row.provider.providerId, now)
    const byHour = new Map<number, typeof board>()
    for (const entry of board) {
      const hour = new Date(entry.timestamp).getHours()
      byHour.set(hour, [...(byHour.get(hour) ?? []), entry])
    }
    const hours: HourCell[] = [...byHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, entries]) => {
        const bookable = entries.filter((e) => e.status !== 'break')
        const booked = bookable.filter((e) => e.status === 'booked').length
        const open = bookable.filter((e) => e.status === 'available')
        let cellState: HourState
        if (bookable.length === 0) cellState = 'break'
        else if (open.length === 0 && booked < bookable.length) cellState = 'past'
        else if (open.length === 0) cellState = 'full'
        else if (open.length === bookable.length) cellState = 'free'
        else cellState = 'some'
        // An hour that is entirely behind the clock reads as past, whatever it held.
        if (hour < nowHour && open.length === 0) cellState = cellState === 'break' ? 'break' : 'past'
        return { hour, state: cellState, booked, total: bookable.length, open: open.length, firstOpen: open[0]?.slot ?? null, current: hour === nowHour }
      })
    return { row, hours }
  })

  const all = strips.flatMap((s) => s.hours.map((h) => h.hour))
  return {
    strips,
    firstHour: all.length ? Math.min(...all) : 9,
    lastHour: all.length ? Math.max(...all) : 17,
  }
}
