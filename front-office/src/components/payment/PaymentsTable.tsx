import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { BillStatusBadge } from './BillStatusBadge'
import { formatClock } from '../../utils/format'
import { formatDateKey } from '../../utils/dates'
import { todayKey } from '../../domain/time'
import { cn } from '../../utils/cn'
import type { Payment } from '../../types/payment'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

/** Shared table for Payment History and Pending Payments — the two lists
 *  differ only in which rows they pass in and which columns they need. */
export function PaymentsTable({
  payments,
  emptyTitle = 'No payments to show',
  emptyDescription = 'Payment records appear here as bills are raised and collected.',
  renderActions,
  showBalance = false,
}: {
  payments: Payment[]
  emptyTitle?: string
  emptyDescription?: string
  renderActions?: (payment: Payment) => ReactNode
  showBalance?: boolean
}) {
  if (payments.length === 0) {
    return <EmptyState icon={Receipt} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
            <th className="px-5 py-2.5 font-medium">Receipt No.</th>
            <th className="px-5 py-2.5 font-medium">Patient</th>
            <th className="px-5 py-2.5 font-medium">Date &amp; Time</th>
            <th className="px-5 py-2.5 font-medium">Description</th>
            <th className="px-5 py-2.5 font-medium text-right">Amount</th>
            {showBalance ? <th className="px-5 py-2.5 font-medium text-right">Balance</th> : null}
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="px-5 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.paymentId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle">
              <td className="whitespace-nowrap px-5 py-3">
                <Link to={`/payments/${payment.paymentId}`} className="font-medium text-primary-text hover:underline">
                  {payment.receiptNo}
                </Link>
              </td>
              <td className="px-5 py-3">
                <p className="max-w-[12rem] truncate text-ink" title={payment.patientName}>
                  {payment.patientName}
                </p>
                <p className="text-2xs text-ink-faint">{payment.patientId}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                {formatDateKey(todayKey(new Date(payment.createdAt)))} · {formatClock(payment.createdAt)}
              </td>
              <td className="px-5 py-3 text-ink-muted">
                <span className="block max-w-[16rem] truncate" title={payment.items.map((i) => i.description).join(', ')}>
                  {payment.items.map((item) => item.description).join(', ')}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-ink">
                {rupees(payment.totalAmount)}
              </td>
              {showBalance ? (
                <td
                  className={cn(
                    'whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums',
                    payment.balance > 0 ? 'text-warning' : 'text-ink-faint',
                  )}
                >
                  {rupees(payment.balance)}
                </td>
              ) : null}
              <td className="whitespace-nowrap px-5 py-3">
                <BillStatusBadge payment={payment} />
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right">
                <div className="flex justify-end gap-1.5">{renderActions?.(payment)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
