// Time helpers shared by the domain layer. Slots are stored as local
// "HH:MM" strings (what staff read on a schedule) and converted to real
// timestamps whenever anything needs to compare them against the clock —
// so "past", "upcoming", "running late" and "waiting N min" are all
// genuinely computed, never hardcoded.

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local-date key (YYYY-MM-DD). Deliberately local, not toISOString(), so
 *  a facility in IST doesn't flip to "tomorrow" at 05:30 local. */
export function todayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function dayStartTimestamp(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
}

export function slotLabel(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function slotToTimestamp(dateKey: string, slot: string): number {
  const [hours, minutes] = slot.split(':').map(Number)
  return dayStartTimestamp(dateKey) + (hours * 60 + minutes) * 60000
}

export function roundDownToStep(timestamp: number, stepMinutes: number): number {
  const date = new Date(timestamp)
  date.setSeconds(0, 0)
  date.setMinutes(Math.floor(date.getMinutes() / stepMinutes) * stepMinutes)
  return date.getTime()
}

export function buildSlotRange(startTimestamp: number, endTimestamp: number, stepMinutes: number): string[] {
  const slots: string[] = []
  for (let t = startTimestamp; t <= endTimestamp; t += stepMinutes * 60000) {
    slots.push(slotLabel(t))
  }
  return slots
}

export function minutesBetween(later: number, earlier: number): number {
  return Math.max(0, Math.round((later - earlier) / 60000))
}
