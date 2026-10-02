import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { BillingIllustration } from '../components/ui/illustrations/BillingIllustration'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { BillStatusBadge } from '../components/payment/BillStatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { getPayments } from '../domain/selectors'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { todayKey } from '../domain/time'
import { billNumberFor, billServicesSummary } from '../utils/billing'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

/** Every bill raised at the counter — a bill is the existing Payment record
 *  (see utils/billing.ts), just presented with the columns a billing desk
 *  actually works from: who owes what, and how much of it is settled. */
export function BillsListPage() {
  const navigate = useNavigate()
  const payments = useStoreValue(getPayments)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return payments
    return payments.filter((payment) => {
      return (
        payment.patientName.toLowerCase().includes(term) ||
        payment.patientId.toLowerCase().includes(term) ||
        payment.receiptNo.toLowerCase().includes(term) ||
        billNumberFor(payment).toLowerCase().includes(term) ||
        payment.paymentId.toLowerCase().includes(term)
      )
    })
  }, [payments, query])

  return (
    <div>
      <PageHeader
        title="Bills"
        subtitle="Every bill raised at the counter, across every patient."
        illustration={<BillingIllustration className="h-8 w-8" />}
        illustrationTone="stable"
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        <Card>
          <div className="flex items-center gap-2 border-b border-border-soft p-4">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search billing records..."
                className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No bills found" description="Try a different name, UHID, bill number or payment ID." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">Bill Number</th>
                    <th className="px-5 py-2.5 font-medium">Patient</th>
                    <th className="px-5 py-2.5 font-medium">UHID</th>
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Services</th>
                    <th className="px-5 py-2.5 font-medium text-right">Total</th>
                    <th className="px-5 py-2.5 font-medium text-right">Paid</th>
                    <th className="px-5 py-2.5 font-medium text-right">Balance</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment) => (
                    <tr key={payment.paymentId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle">
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link to={`/payments/${payment.paymentId}`} className="font-medium text-primary-text hover:underline">
                          {billNumberFor(payment)}
                        </Link>
                      </td>
                      <td className="max-w-[10rem] truncate px-5 py-3 text-ink" title={payment.patientName}>
                        {payment.patientName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{payment.patientId}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                        {formatDateKey(todayKey(new Date(payment.createdAt)))} · {formatClock(payment.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        <span className="block max-w-[14rem] truncate" title={billServicesSummary(payment)}>
                          {billServicesSummary(payment)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-ink">
                        {rupees(payment.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-ink-muted">
                        {rupees(payment.paidAmount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-ink">
                        {rupees(payment.balance)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <BillStatusBadge payment={payment} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
