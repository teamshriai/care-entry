import { useState } from 'react'
import type { ElementType } from 'react'
import { Banknote, CreditCard, Loader2, QrCode, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { BillStatusBadge } from './BillStatusBadge'
import { collectPayment, recordFailedPayment } from '../../domain/actions'
import { formatRupees } from '../../utils/billing'
import { cn } from '../../utils/cn'
import type { Payment, PaymentMethod } from '../../types/payment'

export type PanelMethod = 'Cash' | 'UPI' | 'Card' | 'Insurance/TPA'

const METHOD_META: Record<PanelMethod, { label: string; icon: ElementType }> = {
  Cash: { label: 'Cash', icon: Banknote },
  UPI: { label: 'UPI', icon: QrCode },
  Card: { label: 'Card', icon: CreditCard },
  'Insurance/TPA': { label: 'TPA', icon: ShieldCheck },
}

export interface SettledPayment {
  amount: number
  method: PaymentMethod
  /** Cash change handed back. */
  change: number
  /** The bills as they stand after this collection. */
  bills: Payment[]
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * The one place money is taken. Everywhere a bill is collected — billing,
 * scheduling, walk-in, admission, discharge — it is this panel: pick Cash,
 * UPI or Card, confirm what the counter sees (cash in hand, UPI received,
 * card approved), done. A UPI that never arrives or a declined card is
 * recorded and the bill reads Failed (red) until it is paid.
 *
 * Simulated: no gateway is called and no card/bank/UPI credential is ever
 * entered — staff confirm the result they see on the terminal or phone.
 */
export function PaymentPanel({
  bills,
  allowPartial = false,
  methods = ['Cash', 'UPI', 'Card'],
  onSettled,
  onPayLater,
  payLaterLabel = 'Pay later',
}: {
  /** Bills to collect, in the order money is applied. Only bills with a balance. */
  bills: Payment[]
  /** Lets the desk take part of the amount — only when collecting one bill. */
  allowPartial?: boolean
  methods?: PanelMethod[]
  onSettled: (result: SettledPayment) => void
  onPayLater?: () => void
  payLaterLabel?: string
}) {
  const due = bills.reduce((sum, bill) => sum + bill.balance, 0)
  const single = bills.length === 1 ? bills[0] : null
  const partial = allowPartial && single !== null

  const [method, setMethod] = useState<PanelMethod>(methods[0])
  const [amountText, setAmountText] = useState(String(due))
  const [cashText, setCashText] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const amount = partial ? Number(amountText) : due
  const amountValid = amountText.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= due
  const cash = cashText.trim() === '' ? amount : Number(cashText)
  const cashValid = Number.isFinite(cash) && cash >= amount
  const change = method === 'Cash' && cashValid ? cash - amount : 0

  function chooseMethod(next: PanelMethod) {
    setMethod(next)
    setFailure(null)
    setError(null)
  }

  /** Applies `amount` across the bills in order. */
  function settle(chosen: PanelMethod) {
    if (!amountValid) return
    setError(null)
    try {
      let remaining = amount
      const updated: Payment[] = []
      for (const bill of bills) {
        if (remaining <= 0) break
        const portion = Math.min(remaining, bill.balance)
        updated.push(
          collectPayment({
            paymentId: bill.paymentId,
            amount: portion,
            method: chosen,
            tenderedAmount: chosen === 'Cash' && single ? cash : undefined,
          }),
        )
        remaining -= portion
      }
      onSettled({ amount, method: chosen, change: chosen === 'Cash' ? change : 0, bills: updated })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function fail(chosen: 'UPI' | 'Card', reason: string) {
    if (!amountValid) return
    setError(null)
    try {
      let remaining = amount
      for (const bill of bills) {
        if (remaining <= 0) break
        const portion = Math.min(remaining, bill.balance)
        recordFailedPayment({ paymentId: bill.paymentId, amount: portion, method: chosen, reason })
        remaining -= portion
      }
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
        {single ? <BillStatusBadge payment={single} /> : <Badge tone="warning">{bills.length} bills</Badge>}
      </div>

      {partial ? (
        <div>
          <label htmlFor="collect-now" className="text-xs font-medium text-ink-muted">
            Collect now
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
            <p className="mt-1 text-xs text-ink-muted">{formatRupees(due - amount)} will remain due.</p>
          ) : null}
        </div>
      ) : null}

      <div role="radiogroup" aria-label="Payment method" className={cn('grid gap-2', methods.length > 3 ? 'grid-cols-4' : 'grid-cols-3')}>
        {methods.map((option) => {
          const { label, icon: Icon } = METHOD_META[option]
          const active = method === option
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => chooseMethod(option)}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition-colors',
                active
                  ? 'border-primary-600 bg-primary-50 text-primary-text'
                  : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      {failure ? (
        <Alert tone="critical">
          <strong>Payment failed</strong> — {failure.toLowerCase()}. Try again, or choose another method.
        </Alert>
      ) : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      {method === 'Cash' ? (
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="cash-received" className="text-xs font-medium text-ink-muted">
              Cash received
            </label>
            <div className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-surface-1 px-3 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
              <span className="text-sm text-ink-muted">₹</span>
              <input
                id="cash-received"
                value={cashText}
                onChange={(event) => setCashText(event.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder={amountValid ? String(amount) : ''}
                className="h-full w-full bg-transparent px-1.5 text-sm font-semibold tabular-nums text-ink outline-none placeholder:font-normal placeholder:text-ink-subtle"
              />
            </div>
            {!cashValid ? (
              <p className="mt-1 text-xs text-critical">Less than {formatRupees(amount)}.</p>
            ) : change > 0 ? (
              <p className="mt-1 text-sm font-semibold text-ink">Return {formatRupees(change)} change</p>
            ) : null}
          </div>
          <Button size="lg" disabled={!amountValid || !cashValid} onClick={() => settle('Cash')}>
            <Banknote className="h-4 w-4" strokeWidth={1.75} />
            Received {amountValid ? formatRupees(amount) : ''}
          </Button>
        </div>
      ) : null}

      {method === 'UPI' ? (
        <Waiting
          icon={QrCode}
          title={`Scan to pay ${amountValid ? formatRupees(amount) : ''}`}
          hint="Waiting for the payment to arrive…"
          okLabel="Payment received"
          failLabel="Not received"
          disabled={!amountValid}
          onOk={() => settle('UPI')}
          onFail={() => fail('UPI', 'UPI payment not received')}
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
          onOk={() => settle('Card')}
          onFail={() => fail('Card', 'Card declined')}
        />
      ) : null}

      {method === 'Insurance/TPA' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">Settle against the insurer’s approved amount.</p>
          <Button size="lg" disabled={!amountValid} onClick={() => settle('Insurance/TPA')}>
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            Settle {amountValid ? formatRupees(amount) : ''} by TPA
          </Button>
        </div>
      ) : null}

      {onPayLater ? (
        <Button variant="ghost" onClick={onPayLater} className="self-center">
          {payLaterLabel}
        </Button>
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
