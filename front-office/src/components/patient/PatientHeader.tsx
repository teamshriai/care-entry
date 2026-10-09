import type { ElementType } from 'react'
import { BedDouble, CalendarPlus, Copy, LogOut } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToast } from '../../hooks/useToast'
import { usePatientCareStatus } from '../../hooks/useCareStatus'
import { PatientStatusIcons } from './PatientStatusIcons'
import { PatientDetailsStrip } from './PatientDetailsCard'
import { initialsOf } from '../../utils/format'
import type { PatientHeaderSummary } from '../../domain/patientSelectors'
import type { Patient } from '../../types/patient'
import type { Tone } from '../../utils/tone'

const RISK_LABEL = { High: 'High risk', Watch: 'Watch', Normal: 'Normal' } as const
const RISK_TONE: Record<keyof typeof RISK_LABEL, Tone> = { High: 'critical', Watch: 'warning', Normal: 'info' }
export interface PatientActions {
  schedule: () => void
  admit: () => void
  discharge: () => void
}

/**
 * The top of the patient profile — who this is, how to reach them, whether
 * money is owed, whether they are admitted, and the things the desk does
 * for a patient. It stays in view while the timeline scrolls underneath.
 */
export function PatientHeader({
  patient,
  summary,
  actions,
}: {
  patient: Patient
  summary: PatientHeaderSummary
  actions: PatientActions
}) {
  const { notify } = useToast()
  const care = usePatientCareStatus()
  const { risk, inpatient } = summary

  function copyUhid() {
    void navigator.clipboard?.writeText(patient.uhid).then(
      () => notify('UHID copied', { detail: patient.uhid }),
      () => notify('Could not copy the UHID', { tone: 'error' }),
    )
  }

  return (
    <header className="-mx-4 -mt-4 border-b border-border-soft bg-bg/95 px-4 py-3.5 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-4 xl:-mx-6 xl:px-6 sm:px-6">
      {/* Who the patient is, with the actions level with the name at the top right. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar name={patient.name} initials={initialsOf(patient.name)} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{patient.name}</h1>
              <PatientStatusIcons status={care[patient.patientId]} />
              <span title={risk.reason}>
                <Badge tone={RISK_TONE[risk.level]}>{RISK_LABEL[risk.level]}</Badge>
              </span>
              <span className="sr-only">Risk: {risk.reason}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
              <button
                type="button"
                onClick={copyUhid}
                className="focus-ring -my-2 inline-flex min-h-11 items-center gap-1 rounded-lg font-semibold tabular-nums text-ink hover:text-primary-text"
                title="Copy UHID"
                aria-label={`Copy UHID ${patient.uhid}`}
              >
                {patient.uhid}
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <span>
                {patient.age ? `${patient.age} yrs` : 'Age —'} · {patient.sex}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Action icon={CalendarPlus} label="Schedule Appointment" onClick={actions.schedule} />
          {inpatient ? (
            <Action icon={LogOut} label="Discharge" onClick={actions.discharge} />
          ) : (
            <Action icon={BedDouble} label="Admit" onClick={actions.admit} />
          )}
        </div>
      </div>
      {/* Contact and ABHA across the full width, lined up under the name. */}
      <div className="sm:pl-[3.875rem]">
        <PatientDetailsStrip patient={patient} />
      </div>
    </header>
  )
}

function Action({ icon: Icon, label, onClick }: { icon: ElementType; label: string; onClick: () => void }) {
  return (
    <Button size="md" variant="secondary" onClick={onClick} aria-label={label} title={label}>
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
