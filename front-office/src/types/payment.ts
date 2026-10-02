// Front Office Payments — a mock/in-memory billing and collection layer.
// This is deliberately NOT a finance/accounting system: one Payment record
// is one administrative bill (registration fee, consultation, a service
// charge, …), collected in one or more transactions, with an optional single
// refund. No real payment gateway, no card/bank/UPI credentials are ever
// held here — only the simulated RESULT of a collection.

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'Insurance/TPA' | 'Other'

export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Cancelled' | 'Refunded'

/** What a bill reads as on screen. Derived from the stored record by
 *  utils/billing.billDisplayStatus — never stored. 'Failed' means money is
 *  still due and the latest attempt to collect it did not go through. */
export type BillDisplayStatus = 'Paid' | 'Partial' | 'Pending' | 'Failed' | 'Cancelled' | 'Refunded'

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
  /** Cash handed over, when more than the amount (the receipt shows the change). */
  tenderedAmount?: number
}

/** A collection the front desk confirmed did NOT go through — UPI not
 *  received, card declined. No money moved; it is kept so the bill reads
 *  "Failed" until the next successful collection. */
export interface FailedPaymentAttempt {
  attemptId: string
  amount: number
  method: PaymentMethod
  reason: string
  attemptedAt: number
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
  /** Set when this is an admission's bill — the reverse of Admission.paymentId. */
  admissionId: string | null
  items: PaymentItem[]
  totalAmount: number
  paidAmount: number
  balance: number
  status: PaymentStatus
  transactions: PaymentTransaction[]
  failedAttempts: FailedPaymentAttempt[]
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
  admissionId?: string | null
}

/** actions.collectPayment's input shape. */
export interface CollectPaymentInput {
  paymentId: string
  amount: number
  method: PaymentMethod
  tenderedAmount?: number
}

/** actions.recordFailedPayment's input shape. */
export interface RecordFailedPaymentInput {
  paymentId: string
  amount: number
  method: PaymentMethod
  reason: string
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
