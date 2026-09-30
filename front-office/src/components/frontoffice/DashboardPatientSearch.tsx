import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { searchPatients } from '../../domain/selectors'
import { useStoreValue } from '../../hooks/useStore'
import { usePatientContext } from '../../hooks/usePatientContext'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { initialsOf } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { Patient } from '../../types/patient'

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 6

// The dashboard's own patient search — the same client-side search the rest
// of the portal uses (domain/selectors.searchPatients: name, UHID, phone,
// ABHA, aliases), shown in place as a results panel. Choosing a patient does
// exactly what Find Patient's "open profile" does: put them in patient
// context and open their existing profile (/patients/:uhid).
export function DashboardPatientSearch() {
  const navigate = useNavigate()
  const { setPatient } = usePatientContext()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const matches = useStoreValue(searchPatients, query)
  const results = matches.slice(0, MAX_RESULTS)
  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (!open) return undefined
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function choose(patient: Patient) {
    setPatient(patient)
    notify('Patient selected', { detail: `${patient.name} · ${patient.uhid}` })
    setOpen(false)
    setQuery('')
    navigate(`/patients/${patient.uhid}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault()
      setActive((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && open && results.length > 0) {
      event.preventDefault()
      choose(results[Math.min(active, results.length - 1)].patient)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'group flex h-14 items-center gap-3 rounded-xl border border-border bg-surface-1 px-4 shadow-card transition-all duration-200',
          'hover:border-border-strong focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/10',
        )}
      >
        <Search className="h-5 w-5 shrink-0 text-primary-text" strokeWidth={2} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open && hasQuery}
          aria-controls="dashboard-patient-results"
          aria-label="Search patient"
          placeholder="Search patient by name, UHID or phone number"
          autoComplete="off"
          className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>

      {open && hasQuery ? (
        <div
          id="dashboard-patient-results"
          role="listbox"
          className="menu-surface absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-xl"
        >
          {results.length > 0 ? (
            <>
              <div className="max-h-96 divide-y divide-border-soft overflow-y-auto">
                {results.map(({ patient, matchedOn }, index) => (
                  <button
                    key={patient.patientId}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(patient)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted',
                      index === active && 'bg-surface-muted',
                    )}
                  >
                    <Avatar initials={initialsOf(patient.name)} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{patient.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {patient.uhid} · {patient.age} {patient.sex} · {patient.mobile}
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <Badge status={patient.abhaId ? 'Linked' : 'Not linked'} className="text-2xs" />
                      <span className="text-2xs font-medium uppercase tracking-wide text-primary-text">
                        Matched: {matchedOn}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {matches.length > MAX_RESULTS ? (
                <p className="border-t border-border-soft px-4 py-2 text-xs text-ink-muted">
                  Showing {MAX_RESULTS} of {matches.length} matches — keep typing to narrow the list.
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <p className="text-sm font-medium text-ink">No patients found</p>
              <p className="text-xs text-ink-muted">Check the spelling, UHID or phone number, or register a new patient.</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/register/new', { state: { prefillName: query } })}
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                Register patient
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
