import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee, Plus, Send } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { BillStatusBadge } from '../../components/payment/BillStatusBadge'
import { BillAtCounter } from '../../components/payment/BillAtCounter'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useStoreValue } from '../../hooks/useStore'
import { useToast } from '../../hooks/useToast'
import { getBillForEstimate, getBillsByFilter, getEstimateById, getPatientById, getPaymentById, getPaymentsForPatient } from '../../domain/selectors'
import { createPaymentBill } from '../../domain/actions'
import { repriceAdmissionBill } from '../../domain/admissionActions'
import { getCurrentAdmissionForPatient } from '../../domain/patientSelectors'
import { getState } from '../../domain/store'
import { isAtBillingCounter, sendToBillingCounter } from '../../domain/billingCounter'
import { COUNTER_CHARGES, billNumberFor, billServicesSummary, formatRupees, isBillDue, sumItems } from '../../utils/billing'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Payment, PaymentItem } from '../../types/payment'

/**
 * A patient's bills, as the billing counter has them. Care Entry never takes
 * money: it shows what is outstanding and what is settled, raises a bill
 * (counter charges, an estimate) and sends the patient to the billing
 * counter, where the payment is recorded. Opened from the patient's Bills
 * action, an estimate, or a bill number typed into search.
 */
export function BillingFlow({ params, onClose }: FlowProps) {
  const { notify } = useToast()
  const pickedBill = useStoreValue(getPaymentById, params.bill ?? '')
  const estimate = useStoreValue(getEstimateById, params.estimate ?? '')
  const estimateBill = useStoreValue(getBillForEstimate, params.estimate ?? '')
  const patientId = params.uhid ?? pickedBill?.patientId ?? estimate?.patientId ?? ''
  const patient = useStoreValue(getPatientById, patientId)
  const bills = useStoreValue(getPaymentsForPatient, patientId)
  const allDue = useStoreValue(getBillsByFilter, 'due')
  const [draft, setDraft] = useState<PaymentItem[]>([])
  const [sent, setSent] = useState<string[]>([])
  const [raised, setRaised] = useState<string | null>(null)

  // An inpatient's running bill is first brought up to the stay so far.
  useEffect(() => {
    const admission = patientId ? getCurrentAdmissionForPatient(getState(), patientId) : null
    if (admission?.status === 'Admitted') repriceAdmissionBill(admission.admissionId, Date.now())
  }, [patientId])

  const outstanding = bills.filter(isBillDue)
  const history = bills.filter((bill) => !isBillDue(bill))
  const estimateItems: PaymentItem[] =
    estimate && !estimateBill && estimate.status !== 'Cancelled'
      ? estimate.items.map((item) => ({ code: item.code, description: item.name, amount: item.rate * (item.quantity ?? 1) }))
      : []

  function send(bill: Payment) {
    sendToBillingCounter(bill.paymentId)
    setSent((current) => [...current, bill.paymentId])
    notify('Sent to the billing counter', { detail: `${billNumberFor(bill)} · ${formatRupees(bill.balance)}` })
  }

  function raise(items: PaymentItem[], estimateId?: string) {
    if (!patient) return
    try {
      const bill = createPaymentBill({ patientId: patient.patientId, items, estimateId })
      sendToBillingCounter(bill.paymentId)
      setRaised(bill.paymentId)
      setDraft([])
      notify('Bill raised and sent to the billing counter', { detail: `${billNumberFor(bill)} · ${formatRupees(bill.totalAmount)}` })
    } catch (err) {
      notify('Could not raise the bill', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Bills with payment pending'

  // Opened with no patient: everything still to be paid, to open.
  if (!patient) {
    return (
      <FlowSheet title="Bills" subtitle={subtitle} icon={IndianRupee} iconTone="stable" onClose={onClose}>
        {allDue.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No payment pending" description="Every bill has been paid at the billing counter." />
        ) : (
          <ul className="flex flex-col gap-2">
            {allDue.map((bill) => (
              <li key={bill.paymentId}>
                <BillRow bill={bill} />
              </li>
            ))}
          </ul>
        )}
      </FlowSheet>
    )
  }

  return (
    <FlowSheet title="Bills" subtitle={subtitle} icon={IndianRupee} iconTone="stable" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-muted">
          Payments are taken at the <span className="font-semibold text-ink">billing counter</span>. Here you can see each bill’s status and send
          the patient there.
        </p>

        {raised ? <BillAtCounter paymentId={raised} /> : null}

        {estimate && estimateItems.length > 0 ? (
          <section aria-label="Estimate to bill" className="rounded-xl border border-primary-600 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-text">Estimate {estimate.estimateId}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {estimateItems.map((item) => (
                <li key={item.code} className="flex justify-between gap-3">
                  <span className="text-ink">{item.description}</span>
                  <span className="tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-3" onClick={() => raise(estimateItems, estimate.estimateId)}>
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Raise bill for {formatRupees(sumItems(estimateItems))} and send to the billing counter
            </Button>
          </section>
        ) : null}

        <section aria-label="Payment pending">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Payment pending</h3>
          {outstanding.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-muted">Nothing outstanding.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {outstanding.map((bill) => {
                const atCounter = sent.includes(bill.paymentId) || isAtBillingCounter(bill.paymentId)
                return (
                  <li key={bill.paymentId} className={cn(bill.paymentId === params.bill && 'rounded-xl ring-2 ring-primary-600')}>
                    <BillRow
                      bill={bill}
                      action={
                        atCounter ? (
                          <span className="text-xs text-ink-muted">At the billing counter</span>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => send(bill)}>
                            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Send to billing counter
                          </Button>
                        )
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Raise a bill">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Raise a bill</h3>
          <div className="flex flex-wrap items-center gap-2">
            {COUNTER_CHARGES.map((item) => {
              const active = draft.some((c) => c.code === item.code)
              return (
                <button
                  key={item.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setDraft((current) => (active ? current.filter((c) => c.code !== item.code) : [...current, item]))
                  }
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active ? 'border-primary-600 bg-primary-600 text-on-primary' : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2',
                  )}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  {item.description} · {formatRupees(item.amount)}
                </button>
              )
            })}
          </div>
          {draft.length > 0 ? (
            <Button className="mt-3" onClick={() => raise(draft)}>
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Raise bill for {formatRupees(sumItems(draft))} and send to the billing counter
            </Button>
          ) : null}
        </section>

        {history.length > 0 ? (
          <section aria-label="Bill history">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">History</h3>
            <ul className="flex flex-col gap-2">
              {history.map((bill) => (
                <li key={bill.paymentId}>
                  <BillRow bill={bill} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </FlowSheet>
  )
}

/** One bill: what it is for, its number, amount and status; opens the bill. */
function BillRow({ bill, action }: { bill: Payment; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3">
      <Link to={`/payments/${bill.paymentId}`} className="min-w-0 flex-1 basis-48">
        <span className="block truncate text-sm font-semibold text-ink hover:text-primary-text">{billServicesSummary(bill)}</span>
        <span className="block truncate text-xs text-ink-muted">
          {billNumberFor(bill)} · {formatRupees(bill.totalAmount)}
          {isBillDue(bill) ? ` · ${formatRupees(bill.balance)} due` : ''}
        </span>
      </Link>
      <BillStatusBadge payment={bill} />
      {action}
    </div>
  )
}
