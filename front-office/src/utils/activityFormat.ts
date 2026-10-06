export const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function timeLabel(timestamp: number, withDate: boolean): string {
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return withDate ? `${date.getDate()} ${MONTH[date.getMonth()]} · ${time}` : time
}
