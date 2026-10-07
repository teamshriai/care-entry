import { useState } from 'react'
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
import { BookingDialog } from '../components/appointment/BookingDialog'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useCountPatientOpen } from '../hooks/useCountPatientOpen'
import { useFlow } from '../flows/useFlow'
import { getPatientById, getToday } from '../domain/selectors'
import { getPatientHeader, getPatientTimeline } from '../domain/patientSelectors'

/**
 * The patient's hub. Everything the front desk does for a patient starts
 * here — Schedule, Admit or Discharge, Billing — and runs
 * over this page, which is back the moment the task is done. Deliberately
 * non-clinical: identity, contact, money, where they are admitted, and what
 * has happened at the desk.
 */
export function PatientProfilePage() {
  const { uhid } = useParams<{ uhid: string }>()
  const navigate = useNavigate()
  const { openFlow } = useFlow()
  const now = useNow(60000)
  const today = useStoreValue(getToday)

  const patient = useStoreValue(getPatientById, uhid ?? '')
  useCountPatientOpen(patient?.patientId)
  const header = useStoreValue(getPatientHeader, uhid ?? '', now)
  const timeline = useStoreValue(getPatientTimeline, uhid ?? '')
  // The booking whose reschedule-or-cancel dialog is open.
  const [changingBooking, setChangingBooking] = useState<string | null>(null)

  if (!patient) {
    return (
      <div>
        <PageHeader title="Patient not found" />
        <div className="mt-5 sm:mt-6">
          <Card accentTone="teal" className="max-w-xl">
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


  return (
    <div>
      <PatientHeader
        patient={patient}
        summary={header}
        actions={{
          schedule: () => openFlow('schedule', { uhid: patient.uhid }),
          admit: () => openFlow('admit', { uhid: patient.uhid }),
          discharge: () => openFlow('discharge', { uhid: patient.uhid }),
        }}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] mt-4 sm:mt-5">
        <div className="flex min-w-0 flex-col gap-6">
          {header.admission ? <CurrentAdmissionCard admission={header.admission} now={now} /> : null}
          <PatientTimeline
            timeline={timeline}
            today={today}
            onChangeBooking={setChangingBooking}
          />
        </div>
        <div className="min-w-0">
          <PatientDetailsCard patient={patient} />
        </div>
      </div>

      {changingBooking ? (
        <BookingDialog
          key={changingBooking}
          appointmentId={changingBooking}
          onClose={() => setChangingBooking(null)}
          onReschedule={(appointmentId) => {
            // The dialog closes before the flow opens over the profile.
            setChangingBooking(null)
            openFlow('reschedule', { appointment: appointmentId })
          }}
        />
      ) : null}
    </div>
  )
}
