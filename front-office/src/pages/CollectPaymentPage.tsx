import { useState } from 'react'
import { Search, Plus, IndianRupee } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { CollectPaymentModal } from '../components/payment/CollectPaymentModal'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { getPatientSearchResults, getPaymentsForPatient } from '../domain/selectors'
import { createPaymentBill } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { cn } from '../utils/cn'
import { BillStatusBadge } from '../components/payment/BillStatusBadge'
import type { Patient } from '../types/patient'
import type { Payment, PaymentItem } from '../types/payment'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

// A minimal, honest set of administrative charges a front desk actually
// raises on the spot — not a duplicate of the Enquiry & Estimate rate card,
// which stays the source of truth for clinical/investigation pricing.
const QUICK_CHARGES: PaymentItem[] = [
  { code: 'REG-FEE', description: 'Registration Fee', amount: 100 },
  { code: 'CONS-GEN', description: 'Consultation', amount: 500 },
  { code: 'SVC-CHG', description: 'Service Charge', amount: 50 },
]

/** Find a patient, see what they owe, and collect against it — or raise a
 *  new administrative charge if nothing is on file yet. */
export function CollectPaymentPage() {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [selectedCharges, setSelectedCharges] = useState<PaymentItem[]>([])
  const [collecting, setCollecting] = useState<Payment | null>(null)
  const [error, setError] = useState<string | null>(null)

  const results = useStoreValue(getPatientSearchResults, query)
  const bills = useStoreValue(getPaymentsForPatient, patient?.patientId ?? '__none__')

  function selectPatient(next: Patient) {
    setPatient(next)
    setQuery('')
    setSelectedCharges([])
    setError(null)
  }

  function toggleCharge(item: PaymentItem) {
    setSelectedCharges((current) =>
      current.some((c) => c.code === item.code) ? current.filter((c) => c.code !== item.code) : [...current, item],
    )
  }

  function handleCreateBill() {
    if (!patient || selectedCharges.length === 0) return
    setError(null)
    try {
      const bill = createPaymentBill({ patientId: patient.patientId, items: selectedCharges })
      notify('Bill raised', { detail: `${bill.receiptNo} · ${rupees(bill.totalAmount)}` })
      setSelectedCharges([])
      setCollecting(bill)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not raise bill', { tone: 'error', detail: message })
    }
  }

  const chargeTotal = selectedCharges.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div>
      <PageHeader
        title="Collect Payment"
        subtitle="Find a patient, review what they owe, and collect against an existing or new bill."
      />

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:px-8 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Find patient" />
          <CardBody className="flex flex-col gap-3">
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
                {results.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-ink-muted">No patient found.</p>
                ) : (
                  results.slice(0, 6).map(({ patient: candidate, matchedOn }) => (
                    <button
                      key={candidate.patientId}
                      type="button"
                      onClick={() => selectPatient(candidate)}
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

            {patient ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initialsOf(patient.name)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{patient.name}</p>
                    <p className="text-xs text-ink-muted">
                      {patient.uhid} · {patient.mobile}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>
                  Change
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {!patient ? (
            <Card>
              <EmptyState
                icon={IndianRupee}
                title="Select a patient"
                description="Search by name, UHID, phone or ABHA to see their outstanding payments."
              />
            </Card>
          ) : (
            <>
              <Card className="min-w-0">
                <CardHeader title="Outstanding Payments" subtitle={`${patient.name} · ${patient.uhid}`} />
                {bills.length === 0 ? (
                  <EmptyState title="No bills on file" description="Raise a new administrative charge below." />
                ) : (
                  <div className="divide-y divide-border-soft">
                    {bills.map((bill) => (
                      <div key={bill.paymentId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {bill.receiptNo} · {bill.items.map((i) => i.description).join(', ')}
                          </p>
                          <p className="text-xs text-ink-muted">
                            Total {rupees(bill.totalAmount)}
                            {bill.paidAmount > 0 ? ` · Paid ${rupees(bill.paidAmount)}` : ''}
                            {bill.balance > 0 ? ` · Balance ${rupees(bill.balance)}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <BillStatusBadge payment={bill} />
                          {bill.balance > 0 ? (
                            <Button size="sm" onClick={() => setCollecting(bill)}>
                              Collect Payment
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Raise a new charge" subtitle="Standard front-desk administrative charges" />
                <CardBody className="flex flex-col gap-3">
                  {error ? <p className="text-sm text-critical">{error}</p> : null}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHARGES.map((item) => {
                      const active = selectedCharges.some((c) => c.code === item.code)
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => toggleCharge(item)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            active
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-border bg-surface text-ink hover:bg-surface-muted',
                          )}
                        >
                          <Plus className="h-3 w-3" strokeWidth={2} />
                          {item.description} · {rupees(item.amount)}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-border-soft pt-3">
                    <span className="text-sm text-ink-muted">
                      {selectedCharges.length === 0 ? 'No charges selected' : `Total ${rupees(chargeTotal)}`}
                    </span>
                    <Button size="sm" disabled={selectedCharges.length === 0} onClick={handleCreateBill}>
                      Raise Bill
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <CollectPaymentModal open={Boolean(collecting)} payment={collecting} onClose={() => setCollecting(null)} />
    </div>
  )
}
