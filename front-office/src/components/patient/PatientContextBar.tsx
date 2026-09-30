import { X } from 'lucide-react'
import { usePatientContext } from '../../hooks/usePatientContext'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { initialsOf } from '../../utils/format'

// A slim, always-visible strip once a patient is in context — so staff
// working Book Appointment / Visit Opening / MLC can see who they're acting
// for without reopening search. No clinical fields, ever.
export function PatientContextBar() {
  const { patient, clearPatient } = usePatientContext()

  if (!patient) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-4 py-2 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(patient.name)} size="sm" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold text-ink">{patient.name}</p>
            {patient.nameNative ? <span className="text-xs text-ink-faint">{patient.nameNative}</span> : null}
            <span className="text-xs text-ink-muted">{patient.uhid}</span>
          </div>
        </div>
        <Badge status={patient.abhaId ? 'Linked' : 'Not linked'} className="text-2xs" />
      </div>
      <button
        type="button"
        onClick={clearPatient}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        Clear patient
      </button>
    </div>
  )
}
