import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IndianRupee, Receipt as ReceiptIcon, Undo2, XCircle } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { BillStatusBadge } from '../components/payment/BillStatusBadge'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { useFlow } from '../flows/useFlow'
import { getBillLock, getPaymentById } from '../domain/selectors'
import { cancelPayment, refundPayment } from '../domain/actions'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'
import { billNumberFor, formatRupees, isBillDue } from '../utils/billing'
import type { AppState } from '../types/store'

/** Why this bill can't be refunded or cancelled on its own, if it can't. */
function billLockOf(state: AppState, paymentId: string): string | null {
  const payment = getPaymentById(state, paymentId)
  return payment ? getBillLock(state, payment) : null
}

function timestampLabel(ts: number): string {
  return `${formatDateKey(todayKey(new Date(ts)))} · ${formatClock(ts)}`
}

/** One bill's full picture: its items, every collection and failed attempt
 *  against it, and what can happen next — collect, refund or cancel. */
export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { openFlow } = useFlow()

  const payment = useStoreValue(getPaymentById, paymentId ?? '')
  const lock = useStoreValue(billLockOf, paymentId ?? '')

  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!payment) {
    return (
      <div>
        <PageHeader title="Bill not found" />
        <div className="px-6 py-6 lg:px-8">
          <Card accentTone="stable" className="max-w-xl">
            <CardBody>
              <EmptyState
                icon={ReceiptIcon}
                title="No such bill"
                description="It may have been removed. Every bill is listed on the Billing page."
                action={<Button size="sm" onClick={() => navigate('/billing?filter=all')}>Billing</Button>}
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
      notify('Bill cancelled', { detail: billNumberFor(payment) })
      setCancelling(false)
      setCancelReason('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setCancelling(false)
    }
  }

  function handleRefund(event: React.FormEvent) {
    event.preventDefault()
    if (!payment) return
    setError(null)
    try {
      refundPayment({ paymentId: payment.paymentId, reason: refundReason })
      notify('Payment refunded', { detail: `${billNumberFor(payment)} · ${formatRupees(payment.paidAmount)}` })
      setRefunding(false)
      setRefundReason('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setRefunding(false)
    }
  }

  const canCollect = isBillDue(payment)
  const canCancel = !lock && payment.status === 'Pending' && payment.paidAmount === 0
  const canRefund = !lock && (payment.status === 'Paid' || payment.status === 'Partially Paid')
  const collectedBy = [...new Set(payment.transactions.map((t) => t.method))].join(' + ')
  const linkedTo = payment.admissionId
    ? 'Inpatient admission'
    : payment.appointmentId
      ? 'Outpatient appointment'
      : payment.estimateId
        ? `Estimate ${payment.estimateId}`
        : null

  return (
    <div>
      <PageHeader
        eyebrow="Bill"
        title={billNumberFor(payment)}
        subtitle={
          <>
            <Link to={`/patients/${payment.patientId}`} className="text-primary-text hover:underline">
              {payment.patientName}
            </Link>{' '}
            · {payment.patientId}
          </>
        }
        actions={
          payment.transactions.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}/receipt`)}>
              <ReceiptIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              Receipt
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card accentTone="stable" className="min-w-0">
            <CardHeader title="Bill items" subtitle={linkedTo ?? undefined} action={<BillStatusBadge payment={payment} />} />
            <div className="divide-y divide-border-soft">
              {payment.items.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{formatRupees(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-semibold text-ink">Total</span>
                <span className="text-base font-semibold tabular-nums text-ink">{formatRupees(payment.totalAmount)}</span>
              </div>
            </div>

            <CardHeader title="Collections" subtitle="Every payment and attempt against this bill" />
            {payment.transactions.length === 0 && payment.failedAttempts.length === 0 ? (
              <EmptyState title="Nothing collected yet" description="Collections appear here as they are taken." />
            ) : (
              <div className="divide-y divide-border-soft">
                {[
                  ...payment.transactions.map((txn) => ({
                    id: txn.transactionId,
                    at: txn.collectedAt,
                    detail: txn.method,
                    amount: txn.amount,
                    failed: false,
                  })),
                  ...payment.failedAttempts.map((attempt) => ({
                    id: attempt.attemptId,
                    at: attempt.attemptedAt,
                    detail: `${attempt.method} · ${attempt.reason}`,
                    amount: attempt.amount,
                    failed: true,
                  })),
                ]
                  .sort((a, b) => a.at - b.at)
                  .map((row) => (
                    <div key={row.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="text-ink">{row.id}</p>
                        <p className="text-xs text-ink-muted">
                          {timestampLabel(row.at)} · {row.detail}
                        </p>
                      </div>
                      <span className={row.failed ? 'font-medium tabular-nums text-critical line-through' : 'font-medium tabular-nums text-stable'}>
                        {formatRupees(row.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {payment.refund ? (
              <>
                <CardHeader title="Refund" />
                <CardBody className="text-sm">
                  <p className="text-ink">
                    {payment.refund.refundId} · {formatRupees(payment.refund.amount)}
                    {payment.refund.methods.length > 0 ? ` to ${payment.refund.methods.join(' + ')}` : ''} · {timestampLabel(payment.refund.refundedAt)}
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
          </Card>

          <div className="min-w-0">
            <Card accentTone="stable">
              <CardHeader title="Summary" />
              <CardBody className="flex flex-col gap-3">
                <dl className="space-y-2 text-sm">
                  <Row label="Total" value={formatRupees(payment.totalAmount)} />
                  <Row label="Paid" value={formatRupees(payment.paidAmount)} />
                  <Row label="Due" value={formatRupees(payment.balance)} />
                  <Row label="Raised" value={timestampLabel(payment.createdAt)} />
                </dl>
                <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
                  {canCollect ? (
                    <Button onClick={() => openFlow('billing', { uhid: payment.patientId, bill: payment.paymentId })}>
                      <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Collect {formatRupees(payment.balance)}
                    </Button>
                  ) : null}
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
                  {lock && payment.status !== 'Cancelled' && payment.status !== 'Refunded' ? (
                    <p className="text-xs text-ink-muted">{lock}</p>
                  ) : !canCollect && !canRefund && !canCancel ? (
                    <p className="text-xs text-ink-subtle">Nothing further can be done on this bill.</p>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this bill"
        description="Nothing has been collected against it — this cannot be undone."
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
          <div className="flex justify-end pt-2">
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
        description={`The full ${formatRupees(payment.paidAmount)} collected goes back by ${collectedBy || 'the method it came in'}.`}
      >
        <form onSubmit={handleRefund} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-ink-muted" htmlFor="refund-reason">
            Reason
          </label>
          <input
            id="refund-reason"
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder="e.g. Charged twice for the same service"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="danger" disabled={!refundReason.trim()}>
              Refund {formatRupees(payment.paidAmount)}
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
