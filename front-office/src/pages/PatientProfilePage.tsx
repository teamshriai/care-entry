import { useNavigate, useParams } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PatientHeader } from '../components/patient/PatientHeader'
import { PatientTimeline } from '../components/patient/PatientTimeline'
import { PatientDetailsCard } from '../components/patient/PatientDetailsCard'
import { CurrentAdmissionCard } from '../components/patient/CurrentAdmissionCard'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { useCountPatientOpen } from '../hooks/useCountPatientOpen'
import { useFlow } from '../flows/useFlow'
import { getPatientById, getToday } from '../domain/selectors'
import { getPatientHeader, getPatientTimeline } from '../domain/patientSelectors'
import { checkInAppointment } from '../domain/actions'

/**
 * The patient's hub. Everything the front desk does for a patient starts
 * here — Schedule, Start Consultation, Admit or Discharge, Billing — and runs
 * over this page, which is back the moment the task is done. Deliberately
 * non-clinical: identity, contact, money, where they are admitted, and what
 * has happened at the desk.
 */
export function PatientProfilePage() {
  const { uhid } = useParams<{ uhid: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { openFlow } = useFlow()
  const now = useNow(60000)
  const today = useStoreValue(getToday)

  const patient = useStoreValue(getPatientById, uhid ?? '')
  useCountPatientOpen(patient?.patientId)
  const header = useStoreValue(getPatientHeader, uhid ?? '', now)
  const timeline = useStoreValue(getPatientTimeline, uhid ?? '')

  if (!patient) {
    return (
      <div>
        <PageHeader title="Patient not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-xl">
            <CardBody>
              <EmptyState
                icon={UserRound}
                title="No such patient"
                description="This record may have been merged or removed. The search at the top finds any patient."
                action={<Button size="sm" onClick={() => navigate('/patients')}>Patients</Button>}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  function checkIn(appointmentId: string) {
    try {
      const result = checkInAppointment(appointmentId)
      notify('Checked in', { detail: `Token ${result.tokenNumber} · ${patient!.name}` })
    } catch (err) {
      notify('Could not check in', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div>
      <PatientHeader
        patient={patient}
        summary={header}
        actions={{
          schedule: () => openFlow('schedule', { uhid: patient.uhid }),
          consult: () => openFlow('consult', { uhid: patient.uhid }),
          admit: () => openFlow('admit', { uhid: patient.uhid }),
          discharge: () => openFlow('discharge', { uhid: patient.uhid }),
          billing: () => openFlow('billing', { uhid: patient.uhid }),
        }}
      />

      <div className="grid grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {header.admission ? <CurrentAdmissionCard admission={header.admission} now={now} /> : null}
          <PatientTimeline
            timeline={timeline}
            today={today}
            onCheckIn={checkIn}
            onCollect={(paymentId) => openFlow('billing', { uhid: patient.uhid, bill: paymentId })}
          />
        </div>
        <div className="min-w-0">
          <PatientDetailsCard patient={patient} />
        </div>
      </div>
    </div>
  )
}
