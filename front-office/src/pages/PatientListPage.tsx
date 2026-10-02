import { useLocation, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { PatientIllustration } from '../components/ui/illustrations/PatientIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { getPatientList, getPossibleDuplicates } from '../domain/selectors'
import { initialsOf } from '../utils/format'
import type { Patient } from '../types/patient'

interface PatientListLocationState {
  /** Set by registration: UHID of the patient just created. */
  justRegistered?: string
}

// The registered patients, newest first — where registration lands. It reads the
// same store registration writes to, so a new patient is here the moment the page
// opens. The patient's name opens their profile; Scheduling reuses the existing appointment booking flow: the patient is
// put in context (as Find Patient does) and /appointments/new takes over.
export function PatientListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { setPatient } = usePatientContext()
  const justRegistered = (location.state as PatientListLocationState | null)?.justRegistered

  const patients = useStoreValue(getPatientList)
  const duplicates = useStoreValue(getPossibleDuplicates)
  const duplicateIds = new Set(duplicates.flat().map((patient) => patient.patientId))

  function select(patient: Patient, then: string, state?: unknown) {
    setPatient(patient)
    notify('Patient selected', { detail: `${patient.name} · ${patient.uhid}` })
    navigate(then, state ? { state } : undefined)
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Registered patients, most recently registered first."
        illustration={<PatientIllustration className="h-8 w-8" />}
        illustrationTone="teal"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/register/new')}>
            <UserPlus className="h-3.5 w-3.5 text-primary-text" strokeWidth={1.75} />
            Register patient
          </Button>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          {patients.length === 0 ? (
            <EmptyState
              illustration={<PatientIllustration className="h-12 w-12" />}
              title="No patients yet"
              description="Registered patients appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
                    <th className="px-5 py-2 font-semibold">Patient</th>
                    <th className="px-5 py-2 font-semibold">UHID</th>
                    <th className="px-5 py-2 font-semibold">Age / Sex</th>
                    <th className="px-5 py-2 font-semibold">Mobile</th>
                    <th className="px-5 py-2 font-semibold">Schedule Appointment</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(({ patient }) => (
                    <tr
                      key={patient.patientId}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={initialsOf(patient.name)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink" title={patient.name}>
                              <button
                                type="button"
                                className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
                                onClick={() => select(patient, `/patients/${patient.uhid}`)}
                              >
                                {patient.name}
                              </button>
                              {patient.nameNative ? (
                                <span className="ml-1.5 text-xs font-normal text-ink-faint">{patient.nameNative}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {patient.uhid}
                        {patient.uhid === justRegistered ? (
                          <Badge tone="stable" className="ml-2 text-2xs">
                            Newly registered
                          </Badge>
                        ) : null}
                        {duplicateIds.has(patient.patientId) ? (
                          <Badge tone="warning" className="ml-2 text-2xs">
                            Possible duplicate
                          </Badge>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {patient.age ?? '—'} · {patient.sex}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{patient.mobile}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Button size="sm" onClick={() => select(patient, '/appointments/new', { source: 'find-patient' })}>
                          Schedule Appointment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
