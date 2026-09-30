import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Stethoscope, ClipboardPlus, CheckCircle2, Receipt } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { getPatientSearchResults, getDoctorRows, getPaymentsForPatient } from '../domain/selectors'
import { createPaymentBill } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { REGISTRATION_FEE, billNumberFor, paymentStatusTone } from '../utils/billing'
import type { Patient } from '../types/patient'
import type { Payment, PaymentItem } from '../types/payment'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

/** Care Entry: create the initial visit bill (registration + consultation)
 *  and hand it to the patient — it does NOT collect payment. The patient
 *  pays later at the Billing Center (Collect Payment / Bills), which reads
 *  the same Payment record this page creates via createPaymentBill. There
 *  is exactly one bill/payment model in this app; this page adds no new
 *  state, no new status, and no parallel billing path. */
export function CareEntryPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { patient, setPatient } = usePatientContext()
  const now = useNow(30000)

  const [query, setQuery] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [includeRegistration, setIncludeRegistration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedBill, setGeneratedBill] = useState<Payment | null>(null)

  const searchResults = useStoreValue(getPatientSearchResults, query)
  const doctorRows = useStoreValue(getDoctorRows, now)
  const activeProviders = doctorRows.filter((row) => row.provider.status === 'Active').map((row) => row.provider)
  const provider = activeProviders.find((p) => p.providerId === selectedProviderId) ?? null

  const recentBills = useStoreValue(getPaymentsForPatient, patient?.patientId ?? '__none__')

  const items: PaymentItem[] = []
  if (includeRegistration) items.push(REGISTRATION_FEE)
  if (provider) items.push({ code: 'CONS-GEN', description: 'Consultation Fee', amount: provider.consultationFee })
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  function handleSelectPatient(next: Patient) {
    setPatient(next)
    setQuery('')
    setSelectedProviderId('')
    setIncludeRegistration(false)
    setGeneratedBill(null)
    setError(null)
  }

  function handleChangePatient() {
    setPatient(null)
    setSelectedProviderId('')
    setIncludeRegistration(false)
    setGeneratedBill(null)
    setError(null)
  }

  function handleNextPatient() {
    handleChangePatient()
  }

  function handleGenerateBill() {
    if (!patient || items.length === 0) return
    setError(null)
    try {
      const bill = createPaymentBill({ patientId: patient.patientId, items })
      notify('Bill generated', { detail: `${bill.receiptNo} · ${rupees(bill.totalAmount)}` })
      setGeneratedBill(bill)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not generate bill', { tone: 'error', detail: message })
    }
  }

  return (
    <div>
      <PageHeader
        title="Care Entry"
        subtitle="Create the visit bill and hand it to the patient — payment is collected later at Billing."
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Select patient" />
          <CardBody className="flex flex-col gap-3">
            {!patient ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                  <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, UHID, phone or ABHA"
                    className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                  />
                </div>
                {query.trim().length >= 2 ? (
                  <div className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-ink-muted">No patient found.</p>
                    ) : (
                      searchResults.slice(0, 6).map(({ patient: candidate, matchedOn }) => (
                        <button
                          key={candidate.patientId}
                          type="button"
                          onClick={() => handleSelectPatient(candidate)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">{candidate.name}</span>
                            <span className="block truncate text-xs text-ink-muted">
                              {candidate.uhid} · {candidate.mobile}
                            </span>
                          </span>
                          <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-primary-text">
                            {matchedOn}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initialsOf(patient.name)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{patient.name}</p>
                    <p className="text-xs text-ink-muted">
                      {patient.uhid} · {patient.age} yrs · {patient.sex}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={handleChangePatient}>
                  Change
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {!patient ? (
            <Card>
              <EmptyState
                icon={ClipboardPlus}
                title="Select a patient"
                description="Search by name, UHID, phone or ABHA to start a Care Entry."
              />
            </Card>
          ) : generatedBill ? (
            <Card className="min-w-0">
              <CardHeader
                icon={CheckCircle2}
                iconTone="stable"
                title="Bill Generated"
                subtitle={billNumberFor(generatedBill)}
                action={<Badge tone={paymentStatusTone(generatedBill.status)} status={generatedBill.status} />}
              />
              <CardBody className="flex flex-col gap-4">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-muted">Patient</dt>
                    <dd className="font-medium text-ink">{patient.name}</dd>
                  </div>
                  {provider ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">Doctor</dt>
                      <dd className="font-medium text-ink">{provider.name}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="divide-y divide-border-soft rounded-lg border border-border">
                  {generatedBill.items.map((item) => (
                    <div key={item.code} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-ink">{item.description}</span>
                      <span className="font-medium tabular-nums text-ink">{rupees(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-semibold text-ink">Total</span>
                    <span className="text-base font-semibold tabular-nums text-ink">{rupees(generatedBill.totalAmount)}</span>
                  </div>
                </div>
                <p className="text-xs text-ink-faint">
                  The patient pays this bill at the Billing Center — no payment is collected here.
                </p>
                <div className="flex flex-wrap gap-2 border-t border-border-soft pt-4">
                  <Button
                    onClick={() =>
                      navigate(`/payments/${generatedBill.paymentId}`, { state: { fromCareEntry: true } })
                    }
                  >
                    <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
                    View / Print Bill
                  </Button>
                  <Button variant="secondary" onClick={handleNextPatient}>
                    Next Patient
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              <Card className="min-w-0">
                <CardHeader icon={Stethoscope} iconTone="info" title="Doctor / Consultation" />
                <CardBody className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
                    Doctor
                    <select
                      value={selectedProviderId}
                      onChange={(event) => setSelectedProviderId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
                    >
                      <option value="">Select doctor…</option>
                      {activeProviders.map((p) => (
                        <option key={p.providerId} value={p.providerId}>
                          {p.name} · {p.specialty} · {rupees(p.consultationFee)}
                        </option>
                      ))}
                    </select>
                  </label>
                </CardBody>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Fees" subtitle="Registration is optional — Consultation follows the selected doctor" />
                <CardBody className="flex flex-col gap-3">
                  {error ? <Alert tone="critical">{error}</Alert> : null}
                  <label className="flex items-center gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={includeRegistration}
                      onChange={(event) => setIncludeRegistration(event.target.checked)}
                      className="h-4 w-4 rounded border-border accent-brand-600"
                    />
                    Add Registration Fee ({rupees(REGISTRATION_FEE.amount)})
                  </label>

                  <div className="divide-y divide-border-soft rounded-lg border border-border">
                    {items.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-ink-muted">Select a doctor to add the consultation fee.</p>
                    ) : (
                      items.map((item) => (
                        <div key={item.code} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-ink">{item.description}</span>
                          <span className="font-medium tabular-nums text-ink">{rupees(item.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border-soft pt-3">
                    <span className="text-sm font-semibold text-ink">Total {rupees(total)}</span>
                    <Button disabled={items.length === 0} onClick={handleGenerateBill}>
                      Generate Bill
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {recentBills.length > 0 ? (
                <Card className="min-w-0">
                  <CardHeader title="Recent bills" subtitle={`${patient.name} · ${patient.uhid}`} />
                  <div className="divide-y divide-border-soft">
                    {recentBills.slice(0, 4).map((bill) => (
                      <div key={bill.paymentId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate text-ink" title={bill.items.map((i) => i.description).join(', ')}>
                            {billNumberFor(bill)} · {bill.items.map((i) => i.description).join(', ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="font-medium tabular-nums text-ink">{rupees(bill.totalAmount)}</span>
                          <Badge tone={paymentStatusTone(bill.status)} status={bill.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
