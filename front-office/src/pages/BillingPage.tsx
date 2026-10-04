import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, HandCoins, IndianRupee, ReceiptText } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatFilter } from '../components/ui/StatFilter'
import type { StatFilterItem } from '../components/ui/StatFilter'
import { PaymentIllustration } from '../components/ui/illustrations/PaymentIllustration'
import { PaymentsTable } from '../components/payment/PaymentsTable'
import { useStoreValue } from '../hooks/useStore'
import { getBillingOverview, getBillsByFilter } from '../domain/selectors'
import type { BillFilter } from '../domain/selectors'
import { formatRupees } from '../utils/billing'

const FILTERS: BillFilter[] = ['due', 'failed', 'collected-today', 'all']

function readFilter(search: string): BillFilter {
  const value = new URLSearchParams(search).get('filter')
  return FILTERS.includes(value as BillFilter) ? (value as BillFilter) : 'due'
}

const EMPTY: Record<BillFilter, { title: string; description: string }> = {
  due: { title: 'No payment pending', description: 'Every bill has been paid at the billing counter.' },
  failed: { title: 'No failed payments', description: 'Every payment at the billing counter has gone through.' },
  'collected-today': { title: 'Nothing received yet today', description: 'Payments recorded by the billing counter appear here.' },
  all: { title: 'No bills yet', description: 'Bills appear here as they are raised.' },
}

/** One Billing page, to view only: Care Entry raises bills, and payments
 *  are taken at the billing counter. What is pending, what failed, what the
 *  counter received today, and every bill — each figure is also the filter
 *  for the list under it; a bill opens to its items and history. */
export function BillingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const filter = readFilter(location.search)
  const overview = useStoreValue(getBillingOverview)
  const bills = useStoreValue(getBillsByFilter, filter)

  function selectFilter(next: BillFilter) {
    const query = new URLSearchParams(location.search)
    query.set('filter', next)
    // A filter is a view of this page, not a place — don't fill history.
    navigate({ search: `?${query.toString()}` }, { replace: true })
  }

  const items: StatFilterItem<BillFilter>[] = [
    { key: 'due', label: 'Payment pending', value: formatRupees(overview.dueAmount), context: `${overview.dueCount} bills`, tone: 'warning', icon: HandCoins },
    { key: 'failed', label: 'Payment failed', value: overview.failedCount, context: 'Not completed at the counter', tone: 'critical', icon: AlertCircle },
    {
      key: 'collected-today',
      label: 'Received today',
      value: formatRupees(overview.collectedToday),
      context: `${overview.collectedTodayCount} bills`,
      tone: 'stable',
      icon: IndianRupee,
    },
    { key: 'all', label: 'All bills', value: overview.allCount, context: 'Every bill raised', tone: 'info', icon: ReceiptText },
  ]

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Bills and their payment status — payments are taken at the billing counter."
        illustration={<PaymentIllustration className="h-8 w-8" />}
        illustrationTone="stable"
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        <StatFilter label="Show bills" items={items} selected={filter} onSelect={selectFilter} />

        <Card accentTone="stable">
          <PaymentsTable
            payments={bills}
            showBalance
            emptyTitle={EMPTY[filter].title}
            emptyDescription={EMPTY[filter].description}
            renderActions={(payment) => (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                View bill
              </Button>
            )}
          />
        </Card>
      </div>
    </div>
  )
}
