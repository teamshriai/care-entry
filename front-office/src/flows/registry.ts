import type { ComponentType } from 'react'
import type { FlowName, FlowParams } from './flowParams'
import { BillingFlow } from './billing/BillingFlow'

export interface FlowProps {
  params: FlowParams
  /** Closes the flow and returns to the page underneath. Safe to call twice. */
  onClose: () => void
}

/** Every flow FlowHost can open. A name in the URL that isn't here is
 *  stripped from the address. */
export const FLOWS: Partial<Record<FlowName, ComponentType<FlowProps>>> = {
  billing: BillingFlow,
}
