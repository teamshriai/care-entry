import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { searchPatients } from '../../domain/selectors'
import { useStoreValue } from '../../hooks/useStore'
import { PatientSearchResultRow } from './PatientSearchResultRow'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { usePatientContext } from '../../hooks/usePatientContext'
import type { Patient } from '../../types/patient'

const MIN_QUERY_LENGTH = 3

function isTypingInField(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  const tag = element?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(element?.isContentEditable)
}

// GP-03 — global patient search. Supports name (incl. transliteration
// aliases), UHID, phone and ABHA, per the approved plan §7. Reads live from
// the operational store (domain/selectors.searchPatients) — there is no
// backend search API here, and none is invented.
export function PatientSearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setPatient } = usePatientContext()

  const results = useStoreValue(searchPatients, query)
  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH

  // "/" focuses search from anywhere on any Front Office screen.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === '/' && !isTypingInField(event.target)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function selectPatient(patient: Patient) {
    setOpen(false)
    setQuery('')
    // Selecting a patient anywhere puts them in PatientContext — Book
    // Appointment, Find Doctor and MLC all read from it, so staff never
    // re-search the same patient at every step (approved plan §8/§10).
    // This does NOT navigate anywhere — the patient is simply "in hand"
    // until the staff member picks the next real action themselves.
    setPatient(patient)
  }

  function goToFullSearch() {
    setOpen(false)
    navigate('/patients/search', { state: { query } })
  }

  function goToRegisterNew() {
    setOpen(false)
    navigate('/register/new', { state: { prefillName: query } })
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
    if (event.key === 'Enter') {
      if (results.length === 1) selectPatient(results[0].patient)
      else if (results.length > 1) goToFullSearch()
      else if (hasQuery) goToRegisterNew()
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div
        className={cn(
          'glass flex h-9 items-center gap-2 rounded-full px-3',
          'focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, UHID, phone or ABHA"
          className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
        />
        <kbd className="hidden shrink-0 rounded-full border border-border px-1.5 py-0.5 text-2xs font-medium text-ink-faint sm:inline">
          /
        </kbd>
      </div>

      {open && hasQuery ? (
        <div className="menu-surface absolute left-0 top-[calc(100%+6px)] z-30 w-full min-w-[22rem] overflow-hidden rounded-xl">
          {results.length > 0 ? (
            <>
              <div className="max-h-72 divide-y divide-border-soft overflow-y-auto">
                {results.slice(0, 5).map(({ patient, matchedOn }) => (
                  <PatientSearchResultRow
                    key={patient.uhid}
                    patient={patient}
                    matchedOn={matchedOn}
                    onSelect={selectPatient}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goToFullSearch}
                className="block w-full border-t border-border-soft px-4 py-2.5 text-left text-xs font-medium text-primary-text hover:bg-surface-muted"
              >
                View all matches in Patient Search →
              </button>
            </>
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-ink">No matching patients</p>
              <p className="mt-1 text-xs text-ink-muted">
                Try a different name, UHID, phone or ABHA — or register a new patient.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={goToRegisterNew}>
                <UserPlus className="h-3.5 w-3.5 text-primary-text" strokeWidth={1.75} />
                Register new patient
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
