import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserCog, ShieldPlus, CalendarDays, Receipt, Hospital } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { getPatientById, getAppointmentsForPatient, getConnectivity, getPaymentsForPatient } from '../domain/selectors'
import { getAdmissionsForPatient } from '../domain/admissionSelectors'
import { updatePatientDemographics, linkAbha } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'
import { billNumberFor, billServicesSummary, paymentStatusTone } from '../utils/billing'
import { appointmentStatusLabel } from '../utils/appointment'
import type { Sex } from '../types/patient'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-ink-faint'

interface DemographicsDraft {
  name: string
  age: string
  sex: Sex
  mobile: string
  email: string
  address: string
}

/** Front-office patient record: identity, contact, ABHA and appointment
 *  history. Deliberately contains no clinical information of any kind. */
export function PatientProfilePage() {
  const { uhid } = useParams<{ uhid: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { setPatient } = usePatientContext()

  const patient = useStoreValue(getPatientById, uhid ?? '')
  const appointments = useStoreValue(getAppointmentsForPatient, uhid ?? '')
  const bills = useStoreValue(getPaymentsForPatient, uhid ?? '')
  const admissionHistory = useStoreValue(getAdmissionsForPatient, uhid ?? '')
  const connectivity = useStoreValue(getConnectivity)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DemographicsDraft | null>(null)
  const [abhaDraft, setAbhaDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!patient) {
    return (
      <div>
        <PageHeader title="Patient not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-xl">
            <CardBody>
              <EmptyState
                title="No such patient"
                description="This record may have been merged or removed."
                action={<Button size="sm" onClick={() => navigate('/patients/search')}>Back to search</Button>}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  function startEditing() {
    setDraft({
      name: patient!.name,
      age: patient!.age != null ? String(patient!.age) : '',
      sex: patient!.sex,
      mobile: patient!.mobile,
      email: patient!.email ?? '',
      address: patient!.address ?? '',
    })
    setEditing(true)
    setError(null)
  }

  function saveDemographics(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    try {
      updatePatientDemographics(patient!.patientId, { ...draft, age: Number(draft.age) || null })
      notify('Demographics updated', { detail: patient!.uhid })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleLinkAbha(event: React.FormEvent) {
    event.preventDefault()
    try {
      linkAbha(patient!.patientId, abhaDraft)
      notify('ABHA linked', { detail: abhaDraft })
      setAbhaDraft('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not link ABHA', { tone: 'error', detail: message })
    }
  }

  function selectAnd(path: string, state?: unknown) {
    setPatient(patient)
    navigate(path, state ? { state } : undefined)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Patient record"
        title={patient.name}
        subtitle={`${patient.uhid} · ${patient.age ?? '—'} yrs · ${patient.sex} · ${patient.mobile}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => navigate('/patients/search')}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              Search
            </Button>
            <Button size="sm" variant="secondary" onClick={() => selectAnd('/doctors')}>
              Start visit
            </Button>
            <Button size="sm" onClick={() => selectAnd('/appointments/new', { source: 'find-patient' })}>
              Schedule appointment
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              icon={UserCog}
              iconTone="teal"
              title="Demographics"
              action={
                editing ? null : (
                  <Button size="sm" variant="ghost" onClick={startEditing}>
                    Edit
                  </Button>
                )
              }
            />
            <CardBody className="flex flex-col gap-4">
              {error ? <Alert tone="critical">{error}</Alert> : null}
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(patient.name)} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{patient.name}</p>
                  {patient.nameNative ? <p className="truncate text-xs text-ink-faint">{patient.nameNative}</p> : null}
                  <Badge status={patient.abhaId ? 'Linked' : 'Not linked'} className="mt-1 text-2xs" />
                </div>
              </div>

              {editing && draft ? (
                <form onSubmit={saveDemographics} className="flex flex-col gap-3">
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} placeholder="Full name" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="Age" inputMode="numeric" />
                    <select value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Sex })} className={inputClass}>
                      {(['Male', 'Female', 'Other'] as Sex[]).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <input value={draft.mobile} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} className={inputClass} placeholder="Mobile" />
                  <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputClass} placeholder="Email" />
                  <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className={inputClass} placeholder="Address" />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="space-y-2 border-t border-border-soft pt-3 text-sm">
                  <Row label="UHID" value={patient.uhid} />
                  <Row label="Age / Sex" value={`${patient.age ?? '—'} · ${patient.sex}`} />
                  <Row label="Mobile" value={patient.mobile} />
                  <Row label="Email" value={patient.email ?? '—'} />
                  <Row label="Address" value={patient.address ?? '—'} />
                  <Row label="Status" value={patient.registrationStatus} />
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={ShieldPlus} iconTone="teal" title="ABHA" subtitle="Ayushman Bharat Health Account" />
            <CardBody className="flex flex-col gap-3">
              {patient.abhaId ? (
                <div className="rounded-lg border border-stable-border bg-stable-bg px-3 py-2.5">
                  <p className="text-xs text-ink-muted">Linked ABHA</p>
                  <p className="text-sm font-medium text-ink">{patient.abhaId}</p>
                </div>
              ) : (
                <form onSubmit={handleLinkAbha} className="flex flex-col gap-2">
                  {connectivity.abha === 'unavailable' ? (
                    <Alert tone="warning">
                      ABHA service unavailable (simulated) — you can still record an existing ABHA manually. Care is
                      never blocked on ABHA.
                    </Alert>
                  ) : null}
                  <input
                    value={abhaDraft}
                    onChange={(event) => setAbhaDraft(event.target.value)}
                    placeholder="name@abdm or 14-digit number"
                    className={inputClass}
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!abhaDraft.trim()}>
                    Link ABHA
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader
            icon={CalendarDays}
            iconTone="info"
            title="Appointment history"
            subtitle="Operational history only — no clinical record is shown in Care Entry"
            action={<span className="text-xs tabular-nums text-ink-faint">{appointments.length}</span>}
          />
          {appointments.length === 0 ? (
            <EmptyState
              title="No appointments yet"
              description="Schedule an appointment or start a walk-in visit for this patient."
              action={
                <Button size="sm" onClick={() => selectAnd('/appointments/new', { source: 'find-patient' })}>
                  Schedule appointment
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Time</th>
                    <th className="px-5 py-2.5 font-medium">Doctor</th>
                    <th className="px-5 py-2.5 font-medium">Department</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.appointmentId} className="border-b border-border-soft last:border-b-0 hover:bg-surface-subtle">
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateKey(appointment.date)}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-ink">{appointment.slot}</td>
                      <td className="px-5 py-3 text-ink-muted">{appointment.provider?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{appointment.department}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Badge status={appointment.status}>{appointmentStatusLabel(appointment.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <CardHeader
            icon={Receipt}
            iconTone="stable"
            title="Billing history"
            subtitle="Bills, payments and receipts raised for this patient"
            action={<span className="text-xs tabular-nums text-ink-faint">{bills.length}</span>}
          />
          {bills.length === 0 ? (
            <EmptyState
              title="No bills yet"
              description="Bills raised from Enquiry & Estimate or Collect Payment appear here."
            />
          ) : (
            <div className="divide-y divide-border-soft">
              {bills.map((bill) => (
                <div key={bill.paymentId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/payments/${bill.paymentId}`} className="text-sm font-medium text-primary-text hover:underline">
                      {billNumberFor(bill)}
                    </Link>
                    <p className="truncate text-xs text-ink-muted" title={billServicesSummary(bill)}>
                      {billServicesSummary(bill)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-ink">{rupees(bill.totalAmount)}</span>
                    <Badge tone={paymentStatusTone(bill.status)} status={bill.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <CardHeader
            icon={Hospital}
            iconTone="purple"
            title="Admission history"
            subtitle="Inpatient admissions recorded for this patient"
            action={<span className="text-xs tabular-nums text-ink-faint">{admissionHistory.length}</span>}
          />
          {admissionHistory.length === 0 ? (
            <EmptyState title="No admissions yet" description="Admissions created for this patient appear here." />
          ) : (
            <div className="divide-y divide-border-soft">
              {admissionHistory.map((admission) => (
                <div key={admission.admissionId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/admissions/${admission.admissionId}`} className="text-sm font-medium text-primary-text hover:underline">
                      {admission.admissionNumber}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      {admission.doctorName} · {admission.department} · {admission.wardLabel ?? 'No ward'}
                      {admission.bedNumber ? ` · ${admission.bedNumber}` : ''} · {formatDateKey(todayKey(new Date(admission.createdAt)))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={admission.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink" title={String(value)}>
        {value}
      </dd>
    </div>
  )
}
