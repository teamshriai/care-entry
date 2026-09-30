import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PaymentsTable } from '../components/payment/PaymentsTable'
import { CollectPaymentModal } from '../components/payment/CollectPaymentModal'
import { useStoreValue } from '../hooks/useStore'
import { getPendingPayments } from '../domain/selectors'
import type { Payment } from '../types/payment'

/** "Which patients still have money to pay?" — every bill with a balance
 *  still due, oldest first, with Collect Payment one click away. */
export function PendingPaymentsPage() {
  const pending = useStoreValue(getPendingPayments)
  const [collecting, setCollecting] = useState<Payment | null>(null)

  return (
    <div>
      <PageHeader
        title="Pending Payments"
        subtitle="Every bill with a balance still due. Collecting here updates the dashboard and history immediately."
      />

      <div className="px-6 py-6 lg:px-8">
        <Card>
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
            <p className="text-xs text-ink-faint">{pending.length} outstanding</p>
          </div>
          <PaymentsTable
            payments={pending}
            showBalance
            emptyTitle="Nothing pending"
            emptyDescription="Every raised bill has been fully collected."
            renderActions={(payment) => (
              <Button size="sm" onClick={() => setCollecting(payment)}>
                Collect Payment
              </Button>
            )}
          />
        </Card>
      </div>

      <CollectPaymentModal open={Boolean(collecting)} payment={collecting} onClose={() => setCollecting(null)} />
    </div>
  )
}
