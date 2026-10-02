import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IndianRupee, Plus, Printer } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
import { BillStatusBadge } from '../../components/payment/BillStatusBadge'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useStoreValue } from '../../hooks/useStore'
import {
  getBillForEstimate,
  getBillsByFilter,
  getEstimateById,
  getPatientById,
  getPaymentById,
  getPaymentsForPatient,
} from '../../domain/selectors'
import { collectPayment, createPaymentBill, recordFailedPayment } from '../../domain/actions'
import { COUNTER_CHARGES, billNumberFor, billServicesSummary, formatRupees, isBillDue, sumItems } from '../../utils/billing'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Payment, PaymentItem, PaymentMethod } from '../../types/payment'

interface Settled {
  amount: number
  method: PaymentMethod
  bills: Payment[]
}

/**
 * Billing for one patient: what they owe (dues first, all selected), any
 * counter charge to add, the payment, done. Opened from the patient's Billing
 * action, a bill row's Collect, or a bill number typed into search. Opened
 * with no patient (an old Collect Payment link), it starts from everything
 * due.
 */
export function BillingFlow({ params, onClose }: FlowProps) {
  const navigate = useNavigate()
  const [pickedBillId, setPickedBillId] = useState(params.bill ?? '')
  const pickedBill = useStoreValue(getPaymentById, pickedBillId)
  // An estimate brought to the counter is paid here and billed as it is paid.
  const estimate = useStoreValue(getEstimateById, params.estimate ?? '')
  const estimateBill = useStoreValue(getBillForEstimate, params.estimate ?? '')
  const estimateItems: PaymentItem[] =
    estimate && !estimateBill && estimate.status !== 'Cancelled'
      ? estimate.items.map((item) => ({ code: item.code, description: item.name, amount: item.rate * (item.quantity ?? 1) }))
      : []
  const patientId = params.uhid ?? pickedBill?.patientId ?? estimate?.patientId ?? ''
  const patient = useStoreValue(getPatientById, patientId)
  const bills = useStoreValue(getPaymentsForPatient, patientId)
  const allDue = useStoreValue(getBillsByFilter, 'due')

  const due = bills.filter(isBillDue)
  const settledBills = bills.filter((bill) => !isBillDue(bill))

  // Everything due starts selected — one payment clears the lot. A bill the
  // flow was opened for is the only selection.
  const [selected, setSelected] = useState<string[]>(() => (params.bill ? [params.bill] : []))
  const [selectionTouched, setSelectionTouched] = useState(Boolean(params.bill))
  const selectedIds = selectionTouched ? selected : due.map((bill) => bill.paymentId)
  const selectedBills = due.filter((bill) => selectedIds.includes(bill.paymentId))

  // Counter charges are added to this payment and only raised once it goes
  // through — nothing is left on a bill unpaid.
  const [draft, setDraft] = useState<PaymentItem[]>([])
  const [settled, setSettled] = useState<Settled | null>(null)

  const amountDue = selectedBills.reduce((sum, bill) => sum + bill.balance, 0) + sumItems(draft) + sumItems(estimateItems)
  const newBills = (draft.length > 0 ? 1 : 0) + (estimateItems.length > 0 ? 1 : 0)
  // Part-payment only on one inpatient's running bill (a deposit).
  const allowPartial = newBills === 0 && selectedBills.length === 1 && Boolean(selectedBills[0].admissionId)

  function toggle(bill: Payment) {
    setSelectionTouched(true)
    setSelected(
      selectedIds.includes(bill.paymentId)
        ? selectedIds.filter((id) => id !== bill.paymentId)
        : [...selectedIds, bill.paymentId],
    )
  }

  function toggleCharge(item: PaymentItem) {
    setDraft((current) =>
      current.some((c) => c.code === item.code) ? current.filter((c) => c.code !== item.code) : [...current, item],
    )
  }

  function pay(method: PaymentMethod, amount: number) {
    if (!patient) return
    const paid: Payment[] = []
    let remaining = amount
    for (const bill of selectedBills) {
      if (remaining <= 0) break
      const portion = Math.min(remaining, bill.balance)
      paid.push(collectPayment({ paymentId: bill.paymentId, amount: portion, method }))
      remaining -= portion
    }
    if (estimate && estimateItems.length > 0) {
      const billed = createPaymentBill({ patientId: patient.patientId, items: estimateItems, estimateId: estimate.estimateId })
      paid.push(collectPayment({ paymentId: billed.paymentId, amount: billed.balance, method }))
    }
    if (draft.length > 0) {
      const charge = createPaymentBill({ patientId: patient.patientId, items: draft })
      paid.push(collectPayment({ paymentId: charge.paymentId, amount: charge.balance, method }))
    }
    setSettled({ amount, method, bills: paid })
  }

  function fail(method: PaymentMethod, amount: number, reason: string) {
    let remaining = amount
    for (const bill of selectedBills) {
      if (remaining <= 0) break
      const portion = Math.min(remaining, bill.balance)
      recordFailedPayment({ paymentId: bill.paymentId, amount: portion, method, reason })
      remaining -= portion
    }
  }

  const subtitle = patient
    ? `${patient.name} · ${patient.uhid}${patient.age ? ` · ${patient.age} ${patient.sex.charAt(0)}` : ''}`
    : 'Choose a bill to collect'

  if (settled) {
    const stillDue = settled.bills.reduce((sum, bill) => sum + bill.balance, 0)
    const receipt = settled.bills.length === 1 ? settled.bills[0] : null
    return (
      <FlowSheet title="Billing" subtitle={subtitle} icon={IndianRupee} iconTone="stable" onClose={onClose}>
        <AckCard
          title="Payment Received"
          onDone={onClose}
          action={
            receipt ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/payments/${receipt.paymentId}/receipt`, { replace: true, state: { autoPrint: true } })}
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
                Print receipt
              </Button>
            ) : undefined
          }
        >
          <p className="text-2xl font-semibold tabular-nums text-ink">{formatRupees(settled.amount)}</p>
          <p>
            {settled.method}
            {receipt ? ` · ${billNumberFor(receipt)}` : ` · ${settled.bills.length} bills`}
          </p>
          {stillDue > 0 ? <p className="font-medium text-warning">{formatRupees(stillDue)} remains on the running bill</p> : null}
        </AckCard>
      </FlowSheet>
    )
  }

  // Opened without a patient: pick from everything due.
  if (!patient) {
    return (
      <FlowSheet title="Billing" subtitle={subtitle} icon={IndianRupee} iconTone="stable" onClose={onClose}>
        {allDue.length === 0 ? (
          <EmptyState icon={IndianRupee} title="Nothing is due" description="Every bill has been settled." />
        ) : (
          <ul className="flex flex-col gap-2">
            {allDue.map((bill) => (
              <li key={bill.paymentId}>
                <button
                  type="button"
                  onClick={() => {
                    setPickedBillId(bill.paymentId)
                    setSelected([bill.paymentId])
                    setSelectionTouched(true)
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{bill.patientName}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {billNumberFor(bill)} · {billServicesSummary(bill)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatRupees(bill.balance)}</span>
                    <BillStatusBadge payment={bill} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FlowSheet>
    )
  }

  return (
    <FlowSheet title="Billing" subtitle={subtitle} icon={IndianRupee} iconTone="stable" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {estimate && estimateItems.length > 0 ? (
          <section aria-label="Estimate to pay" className="rounded-xl border border-primary-600 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-text">Estimate {estimate.estimateId}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {estimateItems.map((item) => (
                <li key={item.code} className="flex justify-between gap-3">
                  <span className="text-ink">{item.description}</span>
                  <span className="tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Bills due">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Due</h3>
          {due.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-muted">Nothing is due.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {due.map((bill) => {
                const checked = selectedIds.includes(bill.paymentId)
                return (
                  <li key={bill.paymentId}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                        checked ? 'border-primary-600 bg-primary-50' : 'border-border bg-surface-1 hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(bill)}
                        className="h-4 w-4 shrink-0 accent-[var(--color-primary-600)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{billServicesSummary(bill)}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {billNumberFor(bill)}
                          {bill.paidAmount > 0 ? ` · ${formatRupees(bill.paidAmount)} paid of ${formatRupees(bill.totalAmount)}` : ''}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-ink">{formatRupees(bill.balance)}</span>
                      <BillStatusBadge payment={bill} />
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Add a counter charge" className="flex flex-wrap items-center gap-2">
          {COUNTER_CHARGES.map((item) => {
            const active = draft.some((c) => c.code === item.code)
            return (
              <button
                key={item.code}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCharge(item)}
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
        </section>

        {amountDue > 0 ? (
          <section aria-label="Payment" className="border-t border-border-soft pt-5">
            <PaymentPanel
              key={`${selectedIds.join('|')}#${draft.map((d) => d.code).join('|')}#${estimateItems.length}`}
              amount={amountDue}
              status={
                selectedBills.length === 1 && newBills === 0 ? (
                  <BillStatusBadge payment={selectedBills[0]} />
                ) : (
                  <Badge tone="warning">{selectedBills.length + newBills === 1 ? 'Pending' : `${selectedBills.length + newBills} bills`}</Badge>
                )
              }
              allowPartial={allowPartial}
              onPay={pay}
              onFail={selectedBills.length > 0 ? fail : undefined}
            />
          </section>
        ) : due.length > 0 ? (
          <p className="text-sm text-ink-muted">Select the bills to pay.</p>
        ) : null}

        {settledBills.length > 0 ? (
          <section aria-label="Settled bills">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Settled</h3>
            <ul className="divide-y divide-border-soft rounded-xl border border-border-soft">
              {settledBills.map((bill) => (
                <li key={bill.paymentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link to={`/payments/${bill.paymentId}`} className="min-w-0 truncate text-sm text-primary-text hover:underline">
                    {billNumberFor(bill)} · {billServicesSummary(bill)}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums text-ink-muted">{formatRupees(bill.totalAmount)}</span>
                    <BillStatusBadge payment={bill} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </FlowSheet>
  )
}
