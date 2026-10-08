import { useNavigate } from 'react-router-dom'
import { IndianRupee, Receipt } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ResponsiveTable } from '../ui/ResponsiveTable'
import type { Column } from '../ui/ResponsiveTable'
import { BillStatusBadge } from '../payment/BillStatusBadge'
import { useStoreValue } from '../../hooks/useStore'
import { getBillsForPatient } from '../../domain/selectors'
import { todayKey } from '../../domain/time'
import { billNumberFor, billServicesSummary, formatRupees, isBillDue } from '../../utils/billing'
import { formatDateKey } from '../../utils/dates'
import { formatClock } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { Payment } from '../../types/payment'

/**
 * The patient's bills, with the amount still to be paid at the top. The
 * amount is the profile header's own figure — it also counts a current stay's
 * bed charges not yet billed — so the two never disagree. Care Entry takes no
 * money: a bill opens its detail, where it is sent to the billing counter.
 */
export function PatientBillingCard({ patientId, due }: { patientId: string; due: number }) {
  const navigate = useNavigate()
  const bills = useStoreValue(getBillsForPatient, patientId)
  const paid = bills.reduce((sum, bill) => sum + (bill.status === 'Refunded' ? 0 : bill.paidAmount), 0)

  const columns: Column<Payment>[] = [
    {
      key: 'bill',
      header: 'Bill no.',
      className: 'whitespace-nowrap font-medium text-primary-text',
      mobile: 'subtitle',
      cell: (bill) => billNumberFor(bill),
    },
    {
      key: 'services',
      header: 'Services',
      mobile: 'title',
      cell: (bill) => (
        <span className="block tbl:max-w-64 tbl:truncate" title={billServicesSummary(bill)}>
          {billServicesSummary(bill)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      className: 'whitespace-nowrap text-ink-muted',
      mobile: 'meta',
      cell: (bill) => `${formatDateKey(todayKey(new Date(bill.createdAt)))} · ${formatClock(bill.createdAt)}`,
    },
    { key: 'total', header: 'Total', className: 'whitespace-nowrap text-right tabular-nums', mobile: 'meta', cell: (bill) => formatRupees(bill.totalAmount) },
    { key: 'paid', header: 'Paid', className: 'whitespace-nowrap text-right tabular-nums text-ink-muted', mobile: 'meta', cell: (bill) => formatRupees(bill.paidAmount) },
    {
      key: 'balance',
      header: 'Pending',
      className: 'whitespace-nowrap text-right tabular-nums font-semibold',
      mobile: 'meta',
      cell: (bill) => <span className={cn(bill.balance > 0 && bill.status !== 'Cancelled' && bill.status !== 'Refunded' ? 'text-critical' : 'text-ink-muted')}>{formatRupees(bill.status === 'Cancelled' || bill.status === 'Refunded' ? 0 : bill.balance)}</span>,
    },
    { key: 'status', header: 'Status', className: 'whitespace-nowrap', mobile: 'aside', cell: (bill) => <BillStatusBadge payment={bill} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'whitespace-nowrap text-right',
      mobile: 'actions',
      // Only a pending bill leads anywhere; a paid one is just a record.
      cell: (bill) =>
        isBillDue(bill) ? (
          <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${bill.paymentId}`)}>
            Bill details
          </Button>
        ) : null,
    },
  ]

  return (
    <Card accentTone="stable">
      <CardHeader icon={IndianRupee} iconTone="stable" title="Payment Status" subtitle={bills.length ? `${bills.length} ${bills.length === 1 ? 'bill' : 'bills'}` : 'No bills yet'} />
      <div className="grid grid-cols-1 gap-3 border-b border-border-soft px-4 py-4 sm:grid-cols-3 sm:px-5">
        <div className={cn('rounded-xl border px-4 py-3', due > 0 ? 'border-critical-border bg-critical-bg' : 'border-stable-border bg-stable-bg')}>
          <p className="text-xs font-medium text-ink-muted">Pending amount</p>
          <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', due > 0 ? 'text-critical' : 'text-stable')}>{formatRupees(due)}</p>
          <p className="text-xs text-ink-muted">{due > 0 ? 'Pending — the patient pays at the bill counter' : 'Nothing is pending'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
          <p className="text-xs font-medium text-ink-muted">Payment received</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{formatRupees(paid)}</p>
          <p className="text-xs text-ink-muted">Across all bills</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
          <p className="text-xs font-medium text-ink-muted">Bills</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{bills.length}</p>
          <p className="text-xs text-ink-muted">{bills.filter((bill) => bill.balance > 0 && bill.status !== 'Cancelled' && bill.status !== 'Refunded').length} pending</p>
        </div>
      </div>
      {bills.length === 0 ? (
        <EmptyState icon={Receipt} title="No bills" description="Bills for this patient's visits and stays appear here." />
      ) : (
        <ResponsiveTable
          rows={bills}
          rowKey={(bill) => bill.paymentId}
          caption="Bills"
          columns={columns}
        />
      )}
    </Card>
  )
}
