import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { initialsOf } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { Patient } from '../../types/patient'

// One row of the app-bar quick-search dropdown. Disambiguation fields only —
// no clinical content — per UI_ATLAS S-04-04's own drawing note.
export function PatientSearchResultRow({
  patient,
  matchedOn,
  onSelect,
  highlighted = false,
}: {
  patient: Patient
  matchedOn: string
  onSelect: (patient: Patient) => void
  highlighted?: boolean
}) {
  const phoneLast4 = patient.mobile.replace(/[^0-9]/g, '').slice(-4)

  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted',
        highlighted && 'bg-surface-muted',
      )}
    >
      <Avatar initials={initialsOf(patient.name)} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium text-ink">{patient.name}</p>
          {patient.nameNative ? (
            <span className="truncate text-xs text-ink-faint">{patient.nameNative}</span>
          ) : null}
        </div>
        <p className="truncate text-xs text-ink-muted">
          {patient.uhid} · {patient.age} {patient.sex} · ···{phoneLast4}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge status={patient.abhaId ? 'Linked' : 'Not linked'} className="text-2xs" />
        <span className="text-2xs font-medium uppercase tracking-wide text-primary-text">
          Matched: {matchedOn}
        </span>
      </div>
    </button>
  )
}
