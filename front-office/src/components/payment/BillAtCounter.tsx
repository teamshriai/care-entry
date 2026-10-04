import { Link } from 'react-router-dom'
import { BillStatusBadge } from './BillStatusBadge'
import { useStoreValue } from '../../hooks/useStore'
import { getPaymentById } from '../../domain/selectors'
import { billNumberFor, formatRupees, isBillDue } from '../../utils/billing'
import { cn } from '../../utils/cn'

/**
 * A bill Care Entry has raised, as the billing counter has it: number,
 * amount and live status — pending until the counter records the payment.
 * Care Entry never takes the money itself.
 */
export function BillAtCounter({ paymentId, className }: { paymentId: string; className?: string }) {
  const bill = useStoreValue(getPaymentById, paymentId)
  if (!bill) return null
  const due = isBillDue(bill)
  return (
    <div className={cn('rounded-xl border border-border-soft bg-surface-2 px-3.5 py-2.5 text-left', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/payments/${bill.paymentId}`} className="text-sm font-semibold text-primary-text hover:underline">
          {billNumberFor(bill)} · {formatRupees(bill.totalAmount)}
        </Link>
        <BillStatusBadge payment={bill} />
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {due ? 'Sent to the billing counter — ask the patient to pay there.' : 'Received at the billing counter.'}
      </p>
    </div>
  )
}
