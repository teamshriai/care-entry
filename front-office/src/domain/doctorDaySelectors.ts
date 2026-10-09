// One doctor's day as the day chart (components/dayTimeline) draws it, built
// from the same slot board every booking screen reads — so the chart, the
// day tabs and the next free time always agree.
import type { AppState } from '../types/store'
import type { SlotBoardEntry } from '../types/appointment'
import { minus, minutesFrom } from '../components/dayTimeline/dayModel'
import type { DayActivity, DayBlock, DayInput, Span } from '../components/dayTimeline/dayModel'
import { addDaysToKey, getAvailableSlots, getDoctorSchedule, getPatientById, getQueueView, getSlotBoard } from './selectors'
import type { FreeSlot } from './selectors'
import { dayStartTimestamp } from './time'

/** How far ahead "the next free time" is looked for: the day tabs' fortnight. */
const HORIZON_DAYS = 14

export interface DoctorDay {
  /** `dayModel()`'s input. */
  input: DayInput
  /** The slot board the chart is drawn from: a tap on free time books one of its slots. */
  board: SlotBoardEntry[]
  slotMinutes: number
  /** Working hours as drawn, less breaks. Empty on a day off or on leave. */
  work: Span[]
  /** The doctor's leave on the day. */
  leave: { leaveId: string; reason: string } | null
  /** Each booking bar's patient UHID, by appointment id. */
  uhids: Record<string, string>
}

/**
 * The chart's input for one doctor on one date:
 *   · work: the session, from its start to the end of its last slot, less
 *     breaks (drawn as off hours). The slot grid includes a slot that starts
 *     at the session's end time, so the session is drawn to that slot's end.
 *     A day the doctor doesn't work, or is on leave, has none;
 *   · leave: one all-day block carrying the reason;
 *   · bookings: the slot board's booked slots, one bar each, titled with the
 *     patient's name — a teleconsult in the teleconsult colour.
 */
export function getDoctorDay(state: AppState, providerId: string, now: number, date: string): DoctorDay {
  const schedule = getDoctorSchedule(state, providerId, date)
  const board = getSlotBoard(state, providerId, now, date)
  const slotMinutes = schedule?.slotMinutes ?? 15
  const leave = schedule?.onLeave ? (state.leaves.find((l) => l.providerId === providerId && l.date === date) ?? null) : null

  let work: Span[] = []
  if (schedule && !schedule.onLeave) {
    const last = schedule.slots[schedule.slots.length - 1]
    const end = Math.max(minutesFrom(schedule.sessionEnd), last ? minutesFrom(last) + slotMinutes : 0)
    work = minus(
      [[minutesFrom(schedule.sessionStart), end]],
      schedule.breaks.map((b): Span => [minutesFrom(b.start), minutesFrom(b.end)]),
    )
  }

  const blocks: DayBlock[] = leave ? [{ id: leave.leaveId, start: 0, end: 24 * 60, reason: leave.reason, allDay: true }] : []

  const uhids: Record<string, string> = {}
  const bookings: DayActivity[] = []
  for (const entry of board) {
    if (entry.status !== 'booked' || !entry.appointment) continue
    const appointment = entry.appointment
    const patient = getPatientById(state, appointment.patientId)
    if (patient) uhids[appointment.appointmentId] = patient.uhid
    const start = minutesFrom(entry.slot)
    bookings.push({
      id: appointment.appointmentId,
      kind: appointment.mode === 'Teleconsult' ? 'tele' : 'patient',
      start,
      end: start + slotMinutes,
      title: patient?.name ?? 'Booked patient',
      detail: appointment.mode === 'Teleconsult' ? 'Teleconsult' : undefined,
    })
  }

  return {
    input: { date: new Date(dayStartTimestamp(date)), now: new Date(now), activities: [], bookings, blocks, work },
    board,
    slotMinutes,
    work,
    leave: leave ? { leaveId: leave.leaveId, reason: leave.reason } : null,
    uhids,
  }
}

/** The doctor's next waiting patient today — first in the order the
 *  Outpatients queue calls them (getQueueView). */
export function getDoctorNextPatient(state: AppState, providerId: string, now: number): { name: string; token: string } | null {
  const next = getQueueView(state, now).waiting.find((t) => t.providerId === providerId)
  return next ? { name: next.patient?.name ?? 'Patient', token: next.tokenNumber } : null
}

/** The doctor's first free slot at or after `fromMinute` on `date`, or else
 *  on the days after it, as far as the day tabs reach. */
export function getNextFreeSlotFrom(state: AppState, providerId: string, now: number, date: string, fromMinute: number): FreeSlot | null {
  const sameDay = getAvailableSlots(state, providerId, now, date).find((slot) => minutesFrom(slot) >= fromMinute)
  if (sameDay) return { date, slot: sameDay }
  const last = addDaysToKey(state.today, HORIZON_DAYS - 1)
  for (let day = addDaysToKey(date, 1); day <= last; day = addDaysToKey(day, 1)) {
    const first = getAvailableSlots(state, providerId, now, day)[0]
    if (first) return { date: day, slot: first }
  }
  return null
}
