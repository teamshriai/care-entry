// Front Office Payments — a mock/in-memory billing and collection layer.
// This is deliberately NOT a finance/accounting system: one Payment record
// is one administrative bill (registration fee, consultation, a service
// charge, …), collected in one or more transactions, with an optional single
// refund. No real payment gateway, no card/bank/UPI credentials are ever
// held here — only the simulated RESULT of a collection.

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'Insurance/TPA' | 'Other'

export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Cancelled' | 'Refunded'

/** One line item on a bill — an administrative charge, never a clinical one. */
export interface PaymentItem {
  code: string
  description: string
  amount: number
}

/** One collection event against a bill — a bill can take more than one
 *  (partial payments), each with its own method and transaction id. */
export interface PaymentTransaction {
  transactionId: string
  amount: number
  method: PaymentMethod
  collectedAt: number
}

/** A basic, single refund against an already-collected bill. */
export interface PaymentRefund {
  refundId: string
  amount: number
  reason: string
  refundedAt: number
}

export interface Payment {
  paymentId: string
  /** Assigned once, when the bill is created — stays fixed for its life. */
  receiptNo: string
  patientId: string
  patientName: string
  /** Set when this bill was raised from Book Appointment / the queue — an
   *  administrative cross-reference only, never a clinical link. */
  appointmentId: string | null
  /** Set when this bill was raised from an issued Enquiry & Estimate. */
  estimateId: string | null
  items: PaymentItem[]
  totalAmount: number
  paidAmount: number
  balance: number
  status: PaymentStatus
  transactions: PaymentTransaction[]
  refund: PaymentRefund | null
  createdAt: number
  updatedAt: number
  cancelledAt: number | null
  cancelReason: string | null
}

/** actions.createPaymentBill's input shape. */
export interface CreatePaymentInput {
  patientId: string
  items: PaymentItem[]
  appointmentId?: string | null
  estimateId?: string | null
}

/** actions.collectPayment's input shape. */
export interface CollectPaymentInput {
  paymentId: string
  amount: number
  method: PaymentMethod
}

/** actions.cancelPayment's input shape. */
export interface CancelPaymentInput {
  paymentId: string
  reason: string
}

/** actions.refundPayment's input shape. */
export interface RefundPaymentInput {
  paymentId: string
  amount: number
  reason: string
}

/** domain/selectors.getPaymentSummary's return shape — the Payment
 *  Dashboard's and the Home widget's headline figures, both derived from
 *  the same `payments` state. */
export interface PaymentSummary {
  collectedToday: number
  pendingAmount: number
  transactionsToday: number
  refundsToday: number
}
