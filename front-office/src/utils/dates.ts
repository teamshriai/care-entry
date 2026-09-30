import { todayKey } from '../domain/time'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface DateOption {
  value: string
  label: string
  date: Date
}

/** The next `count` days starting today, as { value: 'YYYY-MM-DD', label }.
 *  Used by the booking and availability screens — the schedule engine can
 *  produce a slot grid for any of them. */
export function buildDateOptions(count: number = 7, from: Date = new Date()): DateOption[] {
  // Labels compare against the REAL today/tomorrow, not the loop index —
  // `from` can be paged away from today (see ScheduleAppointmentPage's
  // week navigator), and a paged-away window must never mislabel some
  // other day as "Today".
  const realToday = todayKey()
  const realTomorrow = todayKey(new Date(new Date().setDate(new Date().getDate() + 1)))

  const options: DateOption[] = []
  for (let i = 0; i < count; i += 1) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const value = todayKey(date)
    let label: string
    if (value === realToday) label = 'Today'
    else if (value === realTomorrow) label = 'Tomorrow'
    else label = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
    options.push({ value, label, date })
  }
  return options
}

export function formatDateKey(value: string | null | undefined): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `${WEEKDAYS[date.getDay()]} ${String(day).padStart(2, '0')}-${MONTHS[month - 1]}-${year}`
}
