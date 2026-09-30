import { useNavigate } from 'react-router-dom'
import { FileStack, HandCoins, History, IndianRupee, Landmark, Receipt } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { PaymentIllustration } from '../components/ui/illustrations/PaymentIllustration'
import { Button } from '../components/ui/Button'
import { MetricCard, MetricRow } from '../components/frontoffice/MetricCard'
import { PaymentsTable } from '../components/payment/PaymentsTable'
import { useStoreValue } from '../hooks/useStore'
import { getBillingSummary, getPendingPayments, getPayments } from '../domain/selectors'

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

/** Billing & Accounts' own landing page — the single financial-module
 *  dashboard. A bill IS a Payment record (see utils/billing.ts), so this
 *  covers billing, payment collection and receipts in one place rather
 *  than splitting them across two top-level modules. */
export function BillingDashboardPage() {
  const navigate = useNavigate()
  const summary = useStoreValue(getBillingSummary)
  const pending = useStoreValue(getPendingPayments)
  const recent = useStoreValue(getPayments)

  return (
    <div>
      <PageHeader
        title="Billing & Accounts"
        subtitle="Bills, payments and receipts for every patient — one financial module, one source of truth."
        illustration={<PaymentIllustration className="h-8 w-8" />}
        illustrationTone="stable"
        actions={
          <Button size="sm" onClick={() => navigate('/payments/collect')}>
            Collect Payment
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        <section aria-label="Billing summary">
          <MetricRow>
            <MetricCard
              label="Today's Bills"
              value={summary.billsToday}
              context="Bills raised today"
              onClick={() => navigate('/billing/bills')}
            />
            <MetricCard
              label="Today's Collections"
              value={rupees(summary.collectedToday)}
              context="Across all methods today"
              tone="stable"
              onClick={() => navigate('/payments/history')}
            />
            <MetricCard
              label="Pending Payments"
              value={summary.pendingPayments}
              context="Bills with a balance due"
              tone={summary.pendingPayments > 0 ? 'warning' : undefined}
              onClick={() => navigate('/payments/pending')}
            />
            <MetricCard
              label="Outstanding Amount"
              value={rupees(summary.outstandingAmount)}
              context="Total balance still owed"
              tone={summary.outstandingAmount > 0 ? 'warning' : undefined}
              onClick={() => navigate('/payments/pending')}
            />
          </MetricRow>
        </section>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <section aria-label="Pending payments" className="min-w-0">
            <Card>
              <CardHeader
                icon={HandCoins}
                iconTone="warning"
                title="Needs attention"
                subtitle="Patients who still have a balance due"
                action={
                  <Button size="sm" variant="ghost" onClick={() => navigate('/payments/pending')}>
                    View all
                  </Button>
                }
              />
              <PaymentsTable
                payments={pending.slice(0, 5)}
                showBalance
                emptyTitle="Nothing pending"
                emptyDescription="Every raised bill has been fully collected."
                renderActions={(payment) => (
                  <Button size="sm" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                    Collect
                  </Button>
                )}
              />
            </Card>
          </section>

          <section aria-label="Recent transactions" className="min-w-0">
            <Card>
              <CardHeader
                icon={Receipt}
                iconTone="stable"
                title="Recent transactions"
                subtitle="Latest bills, newest first"
                action={
                  <Button size="sm" variant="ghost" onClick={() => navigate('/payments/history')}>
                    View all
                  </Button>
                }
              />
              <PaymentsTable
                payments={recent.slice(0, 5)}
                emptyTitle="No payments yet"
                emptyDescription="Collected and pending bills will appear here."
                renderActions={(payment) => (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${payment.paymentId}`)}>
                    View
                  </Button>
                )}
              />
            </Card>
          </section>
        </div>

        <Card>
          <CardHeader icon={Landmark} iconTone="stable" title="Billing sections" subtitle="Everything a Billing & Accounts desk needs, in one place" />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <Button variant="secondary" onClick={() => navigate('/billing/bills')}>
              <FileStack className="h-3.5 w-3.5 text-primary-text" strokeWidth={1.75} />
              Bills
            </Button>
            <Button variant="secondary" onClick={() => navigate('/payments/pending')}>
              <HandCoins className="h-3.5 w-3.5 text-warning" strokeWidth={1.75} />
              Pending Payments
            </Button>
            <Button variant="secondary" onClick={() => navigate('/payments/history')}>
              <History className="h-3.5 w-3.5 text-info" strokeWidth={1.75} />
              Payment History
            </Button>
            <Button variant="secondary" onClick={() => navigate('/payments/collect')}>
              <IndianRupee className="h-3.5 w-3.5 text-stable" strokeWidth={1.75} />
              Collect Payment
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
