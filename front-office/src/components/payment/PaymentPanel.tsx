import { useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { CreditCard, Loader2, QrCode, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { formatRupees } from '../../utils/billing'
import { cn } from '../../utils/cn'
import type { PaymentMethod } from '../../types/payment'

const METHOD_META: Record<PaymentMethod, { label: string; icon: ElementType }> = {
  UPI: { label: 'UPI', icon: QrCode },
  Card: { label: 'Card', icon: CreditCard },
  'Insurance/TPA': { label: 'Insurer / TPA', icon: ShieldCheck },
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * The one place money is taken — billing, scheduling (bookings and walk-ins),
 * admission and discharge all use this panel. The hospital is cashless and
 * has no pay-later: the patient pays by UPI or card (an insured inpatient's
 * bill can be settled by the insurer), and staff confirm what the phone or
 * terminal shows. A UPI that never arrives or a declined card reads as
 * Failed (red) until it is paid another way.
 *
 * Simulated: no gateway is called and no card/bank/UPI credential is ever
 * entered — only the result staff confirm is recorded, by `onPay`.
 */
export function PaymentPanel({
  amount: due,
  status,
  allowPartial = false,
  methods = ['UPI', 'Card'],
  payer,
  onPay,
  onFail,
}: {
  /** What is due now. */
  amount: number
  /** Shown beside the amount — e.g. the bill's status. */
  status?: ReactNode
  /** Lets the desk take part of the amount (inpatient bills only). */
  allowPartial?: boolean
  methods?: PaymentMethod[]
  /** Who settles an Insurance/TPA payment — the insurer, TPA or company. */
  payer?: string
  /** Records the payment. Throw to show the error instead. */
  onPay: (method: PaymentMethod, amount: number) => void
  /** Records a failed UPI/card attempt, where there is a bill to record it on. */
  onFail?: (method: PaymentMethod, amount: number, reason: string) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>(methods[0])
  const [amountText, setAmountText] = useState(String(due))
  const [failure, setFailure] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const amount = allowPartial ? Number(amountText) : due
  const amountValid = amountText.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= due

  function chooseMethod(next: PaymentMethod) {
    setMethod(next)
    setError(null)
  }

  function pay() {
    if (!amountValid) return
    setError(null)
    try {
      onPay(method, amount)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function fail(reason: string) {
    if (!amountValid) return
    setError(null)
    try {
      onFail?.(method, amount, reason)
      setFailure(reason)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-ink-muted">Amount due</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{formatRupees(due)}</p>
        </div>
        {status}
      </div>

      {allowPartial ? (
        <div>
          <label htmlFor="collect-now" className="text-xs font-medium text-ink-muted">
            Pay now
          </label>
          <div className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-surface-1 px-3 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
            <span className="text-sm text-ink-muted">₹</span>
            <input
              id="collect-now"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="h-full w-full bg-transparent px-1.5 text-sm font-semibold tabular-nums text-ink outline-none"
            />
          </div>
          {amountValid && amount < due ? (
            <p className="mt-1 text-xs text-ink-muted">{formatRupees(due - amount)} stays on the running bill.</p>
          ) : null}
        </div>
      ) : null}

      {methods.length > 1 ? (
        <div role="radiogroup" aria-label="Payment method" className={cn('grid gap-2', methods.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
          {methods.map((option) => {
            const { icon: Icon } = METHOD_META[option]
            const label = option === 'Insurance/TPA' && payer ? payer : METHOD_META[option].label
            const active = method === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseMethod(option)}
                className={cn(
                  'flex min-h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-text'
                    : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {failure ? (
        <Alert tone="critical">
          <strong>Payment failed</strong> — {failure.toLowerCase()}. Try again, or choose another method.
        </Alert>
      ) : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      {method === 'UPI' ? (
        <Waiting
          icon={QrCode}
          title={`Scan to pay ${amountValid ? formatRupees(amount) : ''}`}
          hint="Waiting for the payment to arrive…"
          okLabel="Payment received"
          failLabel="Not received"
          disabled={!amountValid}
          onOk={pay}
          onFail={() => fail('UPI payment not received')}
        />
      ) : null}

      {method === 'Card' ? (
        <Waiting
          icon={CreditCard}
          title={`Charge ${amountValid ? formatRupees(amount) : ''} on the card terminal`}
          hint="Tap, insert or swipe the card…"
          okLabel="Approved"
          failLabel="Declined"
          disabled={!amountValid}
          onOk={pay}
          onFail={() => fail('Card declined')}
        />
      ) : null}

      {method === 'Insurance/TPA' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">Record the amount {payer ?? 'the insurer'} has approved for this stay.</p>
          <Button size="lg" disabled={!amountValid} onClick={pay}>
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            Settle {amountValid ? formatRupees(amount) : ''} by {payer ?? 'insurer'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Waiting({
  icon: Icon,
  title,
  hint,
  okLabel,
  failLabel,
  disabled,
  onOk,
  onFail,
}: {
  icon: ElementType
  title: string
  hint: string
  okLabel: string
  failLabel: string
  disabled: boolean
  onOk: () => void
  onFail: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-border px-4 py-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-2">
          <Icon className="h-9 w-9 text-ink" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {hint}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" disabled={disabled} onClick={onOk}>
          {okLabel}
        </Button>
        <Button size="lg" variant="secondary" disabled={disabled} onClick={onFail} className="text-critical">
          {failLabel}
        </Button>
      </div>
    </div>
  )
}
