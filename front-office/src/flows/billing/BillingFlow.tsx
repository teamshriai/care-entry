import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IndianRupee, Plus, Printer } from 'lucide-react'
import { FlowSheet } from '../../components/flow/FlowSheet'
import { AckCard } from '../../components/flow/AckCard'
import { PaymentPanel } from '../../components/payment/PaymentPanel'
import type { SettledPayment } from '../../components/payment/PaymentPanel'
import { BillStatusBadge } from '../../components/payment/BillStatusBadge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { useStoreValue } from '../../hooks/useStore'
import { getBillsByFilter, getPatientById, getPaymentById, getPaymentsForPatient } from '../../domain/selectors'
import { createPaymentBill } from '../../domain/actions'
import { COUNTER_CHARGES, billNumberFor, billServicesSummary, formatRupees, isBillDue, sumItems } from '../../utils/billing'
import { cn } from '../../utils/cn'
import type { FlowProps } from '../registry'
import type { Payment, PaymentItem } from '../../types/payment'

/**
 * Billing for one patient: what they owe (dues first, all selected), take
 * the payment, done. Opened from the patient's Billing action, a bill row's
 * Collect, or a bill number typed into search. Opened with no patient (an
 * old Collect Payment link), it starts from the list of everything due.
 */
export function BillingFlow({ params, onClose }: FlowProps) {
  const navigate = useNavigate()
  const [pickedBillId, setPickedBillId] = useState(params.bill ?? '')
  const pickedBill = useStoreValue(getPaymentById, pickedBillId)
  const patientId = params.uhid ?? pickedBill?.patientId ?? ''
  const patient = useStoreValue(getPatientById, patientId)
  const bills = useStoreValue(getPaymentsForPatient, patientId)
  const allDue = useStoreValue(getBillsByFilter, 'due')

  const due = bills.filter(isBillDue)
  const settledBills = bills.filter((bill) => !isBillDue(bill))

  // Everything due starts selected — one confirmation clears the lot. A bill
  // the flow was opened for is the only selection.
  const [selected, setSelected] = useState<string[]>(() => (params.bill ? [params.bill] : []))
  const [selectionTouched, setSelectionTouched] = useState(Boolean(params.bill))
  const selectedIds = selectionTouched ? selected : due.map((bill) => bill.paymentId)
  const selectedBills = due.filter((bill) => selectedIds.includes(bill.paymentId))

  const [draft, setDraft] = useState<PaymentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState<SettledPayment | null>(null)

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

  function raiseCharge() {
    if (!patient || draft.length === 0) return
    setError(null)
    try {
      const bill = createPaymentBill({ patientId: patient.patientId, items: draft })
      setDraft([])
      setSelectionTouched(true)
      setSelected([...selectedIds, bill.paymentId])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
            {settled.change > 0 ? ` · return ${formatRupees(settled.change)} change` : ''}
            {receipt ? ` · ${billNumberFor(receipt)}` : ` · ${settled.bills.length} bills`}
          </p>
          {stillDue > 0 ? <p className="font-medium text-warning">{formatRupees(stillDue)} still due</p> : null}
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
        {error ? <Alert tone="critical">{error}</Alert> : null}

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
          {draft.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={raiseCharge}>
              Add {formatRupees(sumItems(draft))} to bill
            </Button>
          ) : null}
        </section>

        {selectedBills.length > 0 ? (
          <section aria-label="Payment" className="border-t border-border-soft pt-5">
            <PaymentPanel
              key={selectedBills.map((bill) => bill.paymentId).join('|')}
              bills={selectedBills}
              allowPartial
              onSettled={setSettled}
            />
          </section>
        ) : due.length > 0 ? (
          <p className="text-sm text-ink-muted">Select the bills to collect.</p>
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
