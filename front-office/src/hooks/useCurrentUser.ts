import { useSyncExternalStore } from 'react'
import { FRONT_OFFICE_STAFF, currentFrontOfficeUser } from '../data/currentUser'
import type { CurrentUser } from '../data/currentUser'

// Who is signed in at this desk. A stand-in for a real session: the choice
// is remembered in this browser only, and reading it never fails — a
// private window or blocked storage simply starts with the default user.
const STORAGE_KEY = 'care-entry.staff'

function readStored(): CurrentUser {
  try {
    const staffId = window.localStorage.getItem(STORAGE_KEY)
    return FRONT_OFFICE_STAFF.find((s) => s.staffId === staffId) ?? currentFrontOfficeUser
  } catch {
    return currentFrontOfficeUser
  }
}

let current: CurrentUser = readStored()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Signs this desk in as another member of staff. */
export function switchUser(staffId: string): CurrentUser {
  const next = FRONT_OFFICE_STAFF.find((s) => s.staffId === staffId)
  if (!next) throw new Error('No such member of staff.')
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, staffId)
  } catch {
    // Not remembered across reloads — the switch still holds for now.
  }
  for (const listener of listeners) listener()
  return next
}

export function useCurrentUser(): CurrentUser {
  return useSyncExternalStore(subscribe, () => current)
}
