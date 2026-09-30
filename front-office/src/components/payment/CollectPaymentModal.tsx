import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { useToast } from '../../hooks/useToast'
import { collectPayment } from '../../domain/actions'
import { formatClock } from '../../utils/format'
import { formatDateKey } from '../../utils/dates'
import { todayKey } from '../../domain/time'
import { cn } from '../../utils/cn'
import type { Payment, PaymentMethod } from '../../types/payment'

const METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Net Banking', 'Insurance/TPA', 'Other']

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function timestampLabel(ts: number): string {
  return `${formatDateKey(todayKey(new Date(ts)))} · ${formatClock(ts)}`
}

/**
 * The single Collect Payment surface — reused everywhere a bill is
 * collectable (Pending Payments, the Payment detail page, and Collect
 * Payment's own patient-bill picker), so the flow only exists once.
 * Simulated only: this never talks to a real payment gateway and never
 * touches a card/bank/UPI credential — it just records the RESULT.
 */
export function CollectPaymentModal({
  open,
  payment,
  onClose,
  onCollected,
}: {
  open: boolean
  payment: Payment | null
  onClose: () => void
  onCollected?: (payment: Payment) => void
}) {
  const navigate = useNavigate()
  const { notify } = useToast()

  const [amountText, setAmountText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [phase, setPhase] = useState<'form' | 'processing' | 'success'>('form')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Payment | null>(null)

  useEffect(() => {
    if (open && payment) {
      setAmountText(String(payment.balance))
      setMethod('Cash')
      setPhase('form')
      setError(null)
      setResult(null)
    }
  }, [open, payment])

  if (!payment) return null

  const amount = Number(amountText)
  const validAmount = amountText.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= payment.balance

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!payment || !validAmount) return
    setError(null)
    setPhase('processing')
    // Simulated processing delay only — a submit affordance, not a fake
    // live/background update. The whole flow is in-memory; no gateway call
    // is ever made and no card/bank/UPI credential is collected or stored.
    window.setTimeout(() => {
      try {
        const updated = collectPayment({ paymentId: payment.paymentId, amount, method })
        setResult(updated)
        setPhase('success')
        notify(updated.status === 'Paid' ? 'Payment collected' : 'Partial payment recorded', {
          detail: `${updated.patientName} · ${rupees(amount)}`,
        })
        onCollected?.(updated)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setPhase('form')
        notify('Payment could not be collected', { tone: 'error', detail: message })
      }
    }, 500)
  }

  const latestTransaction = result?.transactions[result.transactions.length - 1] ?? null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={phase === 'success' ? 'Payment Successful' : 'Collect Payment'}
      description={phase === 'success' ? undefined : `${payment.patientName} · ${payment.receiptNo}`}
      className="max-w-md"
    >
      {phase === 'success' && result && latestTransaction ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 border-b border-border-soft pb-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stable-bg">
              <CheckCircle2 className="h-6 w-6 text-stable" strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-semibold tabular-nums text-ink">{rupees(latestTransaction.amount)}</p>
            <Badge status={result.status} />
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Patient" value={result.patientName} />
            <Row label="Receipt" value={result.receiptNo} />
            <Row label="Transaction" value={latestTransaction.transactionId} />
            <Row label="Method" value={latestTransaction.method} />
            <Row label="Date" value={timestampLabel(latestTransaction.collectedAt)} />
            {result.balance > 0 ? <Row label="Remaining balance" value={rupees(result.balance)} /> : null}
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-border-soft pt-4">
            <Button size="sm" onClick={() => navigate(`/payments/${result.paymentId}/receipt`)}>
              View Receipt
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/payments/${result.paymentId}/receipt`, { state: { autoPrint: true } })}
            >
              Print Receipt
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? <Alert tone="critical">{error}</Alert> : null}

          <dl className="space-y-2 text-sm">
            <Row label="Bill/Invoice" value={payment.receiptNo} />
            <Row label="Description" value={payment.items.map((item) => item.description).join(', ')} />
            <Row label="Amount due" value={rupees(payment.balance)} />
          </dl>

          <div>
            <label htmlFor="collect-amount" className="text-xs font-medium text-ink-muted">
              Amount to Collect
            </label>
            <input
              id="collect-amount"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder={String(payment.balance)}
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            {amount > 0 && amount < payment.balance ? (
              <p className="mt-1 text-xs text-ink-faint">Remaining balance will be {rupees(payment.balance - amount)}.</p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-medium text-ink-muted">Payment Method</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {METHODS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  className={cn(
                    'rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    method === option
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border bg-surface text-ink hover:bg-surface-muted',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!validAmount || phase === 'processing'}>
              {phase === 'processing' ? 'Processing payment…' : 'Collect Payment'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
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
