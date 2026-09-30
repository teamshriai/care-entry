import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PaymentsTable } from '../components/payment/PaymentsTable'
import { useStoreValue } from '../hooks/useStore'
import { getPayments } from '../domain/selectors'
import { todayKey } from '../domain/time'
import { cn } from '../utils/cn'
import type { Payment, PaymentMethod, PaymentStatus } from '../types/payment'

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Partially Paid', 'Cancelled', 'Refunded'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const METHOD_FILTERS: Array<'All' | PaymentMethod> = ['All', 'Cash', 'UPI', 'Card', 'Net Banking', 'Insurance/TPA', 'Other']
const DATE_FILTERS = ['All time', 'Today'] as const
type DateFilter = (typeof DATE_FILTERS)[number]

function paymentMethod(payment: Payment): PaymentMethod | null {
  return payment.transactions[payment.transactions.length - 1]?.method ?? null
}

/** The full ledger of bills raised at the front desk — filterable, but
 *  deliberately not more than a busy staff member needs: date, status,
 *  method and a free-text patient match. */
export function PaymentHistoryPage() {
  const navigate = useNavigate()
  const payments = useStoreValue(getPayments)
  const today = todayKey()

  const [status, setStatus] = useState<StatusFilter>('All')
  const [method, setMethod] = useState<'All' | PaymentMethod>('All')
  const [date, setDate] = useState<DateFilter>('All time')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return payments.filter((payment) => {
      const matchesStatus = status === 'All' || payment.status === (status as PaymentStatus)
      const matchesMethod = method === 'All' || paymentMethod(payment) === method
      const matchesDate = date === 'All time' || todayKey(new Date(payment.createdAt)) === today
      const matchesQuery =
        term.length === 0 ||
        payment.patientName.toLowerCase().includes(term) ||
        payment.patientId.toLowerCase().includes(term) ||
        payment.receiptNo.toLowerCase().includes(term)
      return matchesStatus && matchesMethod && matchesDate && matchesQuery
    })
  }, [payments, status, method, date, query, today])

  return (
    <div>
      <PageHeader title="Payment History" subtitle="Every bill ever raised at the front desk — nothing is ever deleted, only cancelled or refunded." />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 xl:flex-row xl:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, UHID or receipt no."
              className="h-9 w-full max-w-xs rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 xl:w-64"
            />
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as 'All' | PaymentMethod)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
            >
              {METHOD_FILTERS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {DATE_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDate(option)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    date === option
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border bg-surface text-ink-muted hover:bg-surface-muted',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-faint xl:ml-auto">{filtered.length} of {payments.length} bills</span>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border-soft px-4 py-2.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  status === option
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-border bg-surface text-ink-muted hover:bg-surface-muted',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <PaymentsTable
            payments={filtered}
            showBalance
            emptyTitle="No payments match"
            emptyDescription="Try a different filter or search term."
            renderActions={(payment) => (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                View
              </Button>
            )}
          />
        </Card>
      </div>
    </div>
  )
}
