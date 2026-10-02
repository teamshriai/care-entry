import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Receipt as ReceiptIcon, Undo2, XCircle } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { CollectPaymentModal } from '../components/payment/CollectPaymentModal'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { getPaymentById } from '../domain/selectors'
import { cancelPayment, refundPayment } from '../domain/actions'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'
import { billNumberFor } from '../utils/billing'
import { BillStatusBadge } from '../components/payment/BillStatusBadge'
import { cn } from '../utils/cn'
import type { Payment } from '../types/payment'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function timestampLabel(ts: number): string {
  return `${formatDateKey(todayKey(new Date(ts)))} · ${formatClock(ts)}`
}

interface PaymentDetailLocationState {
  /** Set when arriving straight from Care Entry, right after the bill was
   *  created there. Care Entry only creates bills — it never collects
   *  payment — so this view drops the collection/refund/cancel controls and
   *  the transaction history entirely, showing just what the front desk
   *  handed the patient. Reached any other way (Bills, Pending Payments,
   *  Payment History, a bookmarked link), it's the full Billing Counter
   *  view, unchanged. */
  fromCareEntry?: boolean
}

/** One bill's full picture. For the Billing Counter, that's items, every
 *  transaction against it, and the three actions that can happen next:
 *  collect more, refund, or cancel. Reached from Care Entry right after
 *  bill creation, it's a focused, print-only view — see
 *  PaymentDetailLocationState above. */
export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()
  const id = paymentId ?? ''
  const fromCareEntry = Boolean((location.state as PaymentDetailLocationState | null)?.fromCareEntry)

  const payment = useStoreValue(getPaymentById, id)

  const [collecting, setCollecting] = useState<Payment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!payment) {
    return (
      <div>
        <PageHeader title="Payment not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card className="max-w-xl">
            <CardBody>
              <EmptyState
                icon={ReceiptIcon}
                title="No such payment"
                description="This bill may have been removed. Return to Payment History to find another."
                action={<Button size="sm" onClick={() => navigate('/payments/history')}>Payment History</Button>}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  function handleCancel(event: React.FormEvent) {
    event.preventDefault()
    if (!payment) return
    setError(null)
    try {
      cancelPayment({ paymentId: payment.paymentId, reason: cancelReason })
      notify('Payment bill cancelled', { detail: payment.receiptNo })
      setCancelling(false)
      setCancelReason('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not cancel', { tone: 'error', detail: message })
    }
  }

  function handleRefund(event: React.FormEvent) {
    event.preventDefault()
    if (!payment) return
    setError(null)
    try {
      refundPayment({ paymentId: payment.paymentId, amount: payment.paidAmount, reason: refundReason })
      notify('Payment refunded', { detail: `${payment.receiptNo} · ${rupees(payment.paidAmount)}` })
      setRefunding(false)
      setRefundReason('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      notify('Could not refund', { tone: 'error', detail: message })
    }
  }

  const canCollect = payment.balance > 0 && payment.status !== 'Cancelled' && payment.status !== 'Refunded'
  const canCancel = payment.status === 'Pending' && payment.paidAmount === 0
  const canRefund = payment.status === 'Paid' || payment.status === 'Partially Paid'

  return (
    <div>
      <PageHeader
        eyebrow="Bill"
        title={fromCareEntry ? billNumberFor(payment) : payment.receiptNo}
        subtitle={`${payment.patientName} · ${payment.patientId}`}
        actions={
          fromCareEntry ? (
            <Button size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              Print Bill
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigate('/payments/history')}>
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                History
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}/receipt`)}>
                <ReceiptIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                View Receipt
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className={cn('grid grid-cols-1 gap-6', !fromCareEntry && '2xl:grid-cols-[minmax(0,1fr)_340px]')}>
          <Card className="min-w-0">
            <CardHeader
              title="Bill items"
              subtitle={payment.appointmentId ? `Linked to appointment ${payment.appointmentId}` : undefined}
              action={<BillStatusBadge payment={payment} />}
            />
            <div className="divide-y divide-border-soft">
              {payment.items.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{rupees(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-semibold text-ink">Total</span>
                <span className="text-base font-semibold tabular-nums text-ink">{rupees(payment.totalAmount)}</span>
              </div>
            </div>

            {fromCareEntry ? (
              <CardBody className="text-xs text-ink-faint">
                Bill No. {billNumberFor(payment)} · Awaiting payment at the Billing Counter.
              </CardBody>
            ) : (
              <>
                <CardHeader title="Transactions" subtitle="Every collection recorded against this bill" />
                {payment.transactions.length === 0 ? (
                  <EmptyState title="No collections yet" description="Nothing has been collected against this bill." />
                ) : (
                  <div className="divide-y divide-border-soft">
                    {payment.transactions.map((txn) => (
                      <div key={txn.transactionId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="text-ink">{txn.transactionId}</p>
                          <p className="text-xs text-ink-muted">{timestampLabel(txn.collectedAt)} · {txn.method}</p>
                        </div>
                        <span className="font-medium tabular-nums text-stable">{rupees(txn.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {payment.refund ? (
                  <>
                    <CardHeader title="Refund" />
                    <CardBody className="text-sm">
                      <p className="text-ink">
                        {payment.refund.refundId} · {rupees(payment.refund.amount)} · {timestampLabel(payment.refund.refundedAt)}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">{payment.refund.reason}</p>
                    </CardBody>
                  </>
                ) : null}

                {payment.status === 'Cancelled' ? (
                  <CardBody className="text-sm text-ink-muted">
                    Cancelled {payment.cancelledAt ? timestampLabel(payment.cancelledAt) : ''} — {payment.cancelReason}
                  </CardBody>
                ) : null}
              </>
            )}
          </Card>

          {fromCareEntry ? null : (
            <div className="min-w-0">
              <Card>
                <CardHeader title="Summary" />
                <CardBody className="flex flex-col gap-3">
                  <dl className="space-y-2 text-sm">
                    <Row label="Bill No." value={billNumberFor(payment)} />
                    <Row label="Total" value={rupees(payment.totalAmount)} />
                    <Row label="Paid" value={rupees(payment.paidAmount)} />
                    <Row label="Balance" value={rupees(payment.balance)} />
                    <Row label="Created" value={timestampLabel(payment.createdAt)} />
                  </dl>
                  <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
                    {canCollect ? <Button onClick={() => setCollecting(payment)}>Collect Payment</Button> : null}
                    {canRefund ? (
                      <Button variant="secondary" onClick={() => setRefunding(true)}>
                        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Refund
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button variant="ghost" onClick={() => setCancelling(true)}>
                        <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Cancel bill
                      </Button>
                    ) : null}
                    {!canCollect && !canRefund && !canCancel ? (
                      <p className="text-xs text-ink-faint">No further action is possible on this bill.</p>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>

      <CollectPaymentModal open={Boolean(collecting)} payment={collecting} onClose={() => setCollecting(null)} />

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this bill"
        description="Nothing has been collected against it yet — this cannot be undone."
      >
        <form onSubmit={handleCancel} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="cancel-reason">
            Reason
          </label>
          <input
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="e.g. Patient left without registering"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCancelling(false)}>
              Back
            </Button>
            <Button type="submit" variant="danger" disabled={!cancelReason.trim()}>
              Cancel bill
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={refunding}
        onClose={() => setRefunding(false)}
        title="Refund this payment"
        description={`The full ₹${payment.paidAmount.toLocaleString('en-IN')} collected will be refunded.`}
      >
        <form onSubmit={handleRefund} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="refund-reason">
            Reason
          </label>
          <input
            id="refund-reason"
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder="e.g. Duplicate booking cancelled by patient"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRefunding(false)}>
              Back
            </Button>
            <Button type="submit" variant="danger" disabled={!refundReason.trim()}>
              Confirm refund
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  )
}
