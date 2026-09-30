import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, IndianRupee, Receipt } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { getAdmissionById } from '../domain/admissionSelectors'
import { getPatientById, getPaymentById, getProviderById } from '../domain/selectors'
import { cancelAdmission, createBillForAdmission, dischargeAdmission } from '../domain/admissionActions'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function timestampLabel(ts: number): string {
  return `${formatDateKey(todayKey(new Date(ts)))} · ${formatClock(ts)}`
}

const ROOM_DEPOSIT: Record<string, number> = {
  General: 2000,
  'Semi-Private': 5000,
  Private: 10000,
  ICU: 15000,
}

/** One admission's full picture — patient, doctor, bed, attendant and the
 *  linked bill (the EXISTING Payment record, never an admission-owned one). */
export function AdmissionDetailPage() {
  const { admissionId } = useParams<{ admissionId: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const id = admissionId ?? ''

  const admission = useStoreValue(getAdmissionById, id)
  const patient = useStoreValue(getPatientById, admission?.patientId ?? '')
  const doctor = useStoreValue(getProviderById, admission?.doctorId ?? '')
  const payment = useStoreValue(getPaymentById, admission?.paymentId ?? '')

  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!admission) {
    return (
      <div>
        <PageHeader title="Admission not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-xl">
            <CardBody>
              <EmptyState title="No such admission" description="Return to Admissions to find another." action={<Button size="sm" onClick={() => navigate('/admissions/list')}>Admissions</Button>} />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  function act(fn: () => void) {
    setError(null)
    try {
      fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Action failed', { tone: 'error', detail: message })
    }
  }

  function handleCreateBill() {
    act(() => {
      const deposit = admission!.roomType ? ROOM_DEPOSIT[admission!.roomType] ?? 2000 : 2000
      const updated = createBillForAdmission(admission!.admissionId, [
        { code: 'ADM-CHG', description: 'Admission Charge', amount: 500 },
        { code: 'ADM-DEP', description: `Room/Bed Deposit (${admission!.roomType ?? 'General'})`, amount: deposit },
      ])
      notify('Bill created', { detail: updated.admissionNumber })
    })
  }

  function handleDischarge() {
    act(() => {
      dischargeAdmission(admission!.admissionId)
      notify('Patient discharged', { detail: admission!.admissionNumber })
    })
  }

  function handleCancel() {
    act(() => {
      cancelAdmission(admission!.admissionId, cancelReason)
      notify('Admission cancelled', { detail: admission!.admissionNumber })
      setCancelling(false)
      setCancelReason('')
    })
  }

  const canDischarge = admission.status === 'Admitted'
  const canCancel = admission.status === 'Pending' || admission.status === 'Bed Reserved' || admission.status === 'Admitted'

  return (
    <div>
      <PageHeader
        eyebrow="Admission"
        title={admission.admissionNumber}
        subtitle={`${admission.patientName} · ${admission.patientId}`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => navigate('/admissions/list')}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Admissions
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader title="Admission Information" action={<Badge status={admission.status} />} />
              <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Admission Number" value={admission.admissionNumber} />
                <Row label="Admission Type" value={admission.admissionType} />
                <Row label="Admitted" value={admission.admittedAt ? timestampLabel(admission.admittedAt) : timestampLabel(admission.createdAt)} />
                <Row label="Referral Source" value={admission.referralSource} />
                <Row label="Reason" value={admission.reason} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Patient" />
              <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {patient ? (
                  <>
                    <Row label="Name" value={patient.name} />
                    <Row label="UHID" value={patient.uhid} />
                    <Row label="Age / Gender" value={`${patient.age ?? '—'} · ${patient.sex}`} />
                    <Row label="Phone" value={patient.mobile} />
                  </>
                ) : (
                  <p className="text-ink-muted">Patient record no longer available.</p>
                )}
                <div className="col-span-2">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/patients/${admission.patientId}`)}>
                    View Patient Profile
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Doctor" />
              <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Doctor" value={admission.doctorName} />
                <Row label="Department" value={admission.department} />
                <Row label="Specialty" value={doctor?.specialty ?? '—'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Bed" />
              <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Ward" value={admission.wardLabel ?? 'Not yet allocated'} />
                <Row label="Room" value={admission.roomNumber ?? '—'} />
                <Row label="Bed" value={admission.bedNumber ?? '—'} />
                <Row label="Room Type" value={admission.roomType ?? '—'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Attendant" />
              <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Name" value={admission.attendant.name} />
                <Row label="Relationship" value={admission.attendant.relationship} />
                <Row label="Phone" value={admission.attendant.phone} />
                {admission.attendant.address ? <Row label="Address" value={admission.attendant.address} /> : null}
              </CardBody>
            </Card>
          </div>

          <div className="min-w-0 flex flex-col gap-6">
            <Card>
              <CardHeader icon={Receipt} iconTone="stable" title="Billing" />
              <CardBody className="flex flex-col gap-3 text-sm">
                <Row label="Payment Type" value={admission.paymentType} />
                {admission.insuranceProvider ? <Row label="Provider" value={admission.insuranceProvider} /> : null}
                {admission.policyNumber ? <Row label="Policy / Member ID" value={admission.policyNumber} /> : null}
                {payment ? (
                  <>
                    <div className="border-t border-border-soft pt-3">
                      <Row label="Bill" value={payment.receiptNo} />
                      <Row label="Total" value={rupees(payment.totalAmount)} />
                      <Row label="Paid" value={rupees(payment.paidAmount)} />
                      <Row label="Balance" value={rupees(payment.balance)} />
                    </div>
                    <div className="flex items-center justify-between border-t border-border-soft pt-3">
                      <span className="text-xs text-ink-muted">Payment Status</span>
                      <Badge status={payment.status} />
                    </div>
                    <Button size="sm" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                      <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {payment.balance > 0 ? 'Collect Payment' : 'View Bill'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-ink-muted border-t border-border-soft pt-3">No bill has been raised for this admission yet.</p>
                    <Button size="sm" onClick={handleCreateBill}>
                      Create Bill
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Actions" />
              <CardBody className="flex flex-col gap-2">
                {canDischarge ? (
                  <Button size="sm" onClick={handleDischarge}>
                    Discharge Patient
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(true)}>
                    Cancel Admission
                  </Button>
                ) : null}
                {!canDischarge && !canCancel ? <p className="text-xs text-ink-faint">No further action is possible on this admission.</p> : null}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this admission"
        description="The allocated bed (if any) will be released back to Available."
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="cancel-reason">
            Reason
          </label>
          <input
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="e.g. Admitted in error"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              Back
            </Button>
            <Button variant="danger" disabled={!cancelReason.trim()} onClick={handleCancel}>
              Cancel Admission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="truncate text-sm font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  )
}
