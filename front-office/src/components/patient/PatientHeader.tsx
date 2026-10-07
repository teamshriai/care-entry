import type { ElementType } from 'react'
import { BedDouble, CalendarPlus, Copy, IndianRupee, LogOut, Phone, ShieldCheck } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToast } from '../../hooks/useToast'
import { usePatientCareStatus } from '../../hooks/useCareStatus'
import { PatientStatusIcons } from './PatientStatusIcons'
import { formatRupees } from '../../utils/billing'
import { initialsOf } from '../../utils/format'
import type { PatientHeaderSummary } from '../../domain/patientSelectors'
import type { Patient } from '../../types/patient'
import type { Tone } from '../../utils/tone'

const RISK_LABEL = { High: 'High risk', Watch: 'Watch', Normal: 'Normal' } as const
const RISK_TONE: Record<keyof typeof RISK_LABEL, Tone> = { High: 'critical', Watch: 'warning', Normal: 'info' }
const PAYMENT_TONE: Record<PatientHeaderSummary['payment']['status'], Tone> = {
  Failed: 'critical',
  Pending: 'warning',
  Partial: 'warning',
  Paid: 'stable',
  'No bills': 'neutral',
}

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
  const { risk, payment, inpatient, admission } = summary

  function copyAbha() {
    if (!patient.abhaId) return
    void navigator.clipboard?.writeText(patient.abhaId).then(
      () => notify('ABHA copied', { detail: patient.abhaId ?? '' }),
      () => notify('Could not copy the ABHA', { tone: 'error' }),
    )
  }

  function copyUhid() {
    void navigator.clipboard?.writeText(patient.uhid).then(
      () => notify('UHID copied', { detail: patient.uhid }),
      () => notify('Could not copy the UHID', { tone: 'error' }),
    )
  }

  return (
    <header className="-mx-4 -mt-4 border-b border-border-soft bg-bg/95 px-4 py-3.5 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-4 xl:-mx-6 xl:px-6 sm:px-6 lg:sticky lg:top-0 lg:z-20">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
            {patient.nameNative ? <p className="truncate text-sm text-ink-muted">{patient.nameNative}</p> : null}
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
              <a href={`tel:${patient.mobile.replace(/\s/g, '')}`} className="focus-ring -my-3 inline-flex items-center gap-1 rounded py-3 hover:text-primary-text">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {patient.mobile}
              </a>
              {patient.abhaId ? (
                <button
                  type="button"
                  onClick={copyAbha}
                  className="focus-ring -my-3 inline-flex min-w-0 items-center gap-1 rounded py-3 text-success-fg hover:text-primary-text"
                  title="Copy ABHA"
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="truncate">ABHA {patient.abhaId}</span>
                  <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-ink-subtle">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  ABHA not linked
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge tone={PAYMENT_TONE[payment.status]}>
                <IndianRupee className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                {payment.status === 'Paid'
                  ? 'Payment received'
                  : payment.status === 'No bills'
                    ? 'No bills'
                    : `${payment.status === 'Failed' ? 'Payment failed' : 'Payment pending'} · ${formatRupees(payment.due)}`}
              </Badge>
              {inpatient ? (
                <span title={`Inpatient · ${inpatient.ward} · ${inpatient.bed} · Day ${inpatient.day}`} className="flex min-w-0 max-w-full">
                  <Badge tone={inpatient.critical ? 'critical' : 'info'} className="max-w-full">
                    <BedDouble className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span className="min-w-0 truncate">
                      <span className="hidden sm:inline">Inpatient · </span>
                      {inpatient.ward} · {inpatient.bed} · Day {inpatient.day}
                    </span>
                  </Badge>
                </span>
              ) : admission ? (
                <Badge tone="warning">
                  <BedDouble className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  Admission waiting for a bed
                </Badge>
              ) : null}
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
