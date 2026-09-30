import { useEffect, useState } from 'react'

// A real, ticking clock — NOT a random-number generator. Screens use this to
// recompute genuine elapsed time ("waiting 6 min", derived from
// currentTime - createdAt) so those numbers advance naturally without ever
// touching the underlying data. This is the only thing that changes on a
// timer in this app; nothing here mutates the operational store.
export function useNow(intervalMs: number = 15000): number {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
