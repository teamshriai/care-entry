// Front Desk services — Attendant Pass, Enquiry & Estimate, MLC — plus the
// small pieces of state (the registration log) that belong to no single
// screen.

export interface AttendantPass {
  passId: string
  patientId: string
  patientName: string
  ward: string
  relationship: string
  issuedAt: number
  returnedAt: number | null
  returned: boolean
}

export interface IssueAttendantPassInput {
  patientId: string
  ward: string
  relationship?: string
}

/** The hospital's own rate card — rates are read, never estimated. */
export interface Tariff {
  code: string
  name: string
  department: string
  rate: number
}

export interface EstimateItem {
  code: string
  name: string
  rate: number
  quantity?: number
}

/** Front Office's own lifecycle — deliberately narrow (no ledger states).
 *  Set by the Payment module once a bill is raised against an estimate;
 *  Enquiry & Estimate itself only ever produces Draft/Saved/Cancelled. */
export type EstimateStatus = 'Draft' | 'Saved' | 'Partially Paid' | 'Paid' | 'Cancelled'

/** An estimate always belongs to exactly one patient — there is no
 *  anonymous/walk-in estimate. */
export interface Estimate {
  estimateId: string
  patientId: string
  patientName: string
  items: EstimateItem[]
  total: number
  payer: string
  status: EstimateStatus
  createdAt: number
  updatedAt: number
}

export interface AddEstimateItemInput {
  patientId: string
  patientName: string
  item: EstimateItem
}

export interface UpdateEstimateItemQuantityInput {
  estimateId: string
  code: string
  quantity: number
}

export interface RemoveEstimateItemInput {
  estimateId: string
  code: string
}

export type MlcCategory = 'Road traffic accident' | 'Assault' | 'Poisoning' | 'Burns' | 'Suicide attempt' | 'Other'
export type MlcBroughtBy = 'Police' | 'Relative' | 'Bystander' | 'Ambulance'

export interface MlcRecord {
  mlcId: string
  patientId: string
  patientName: string
  category: MlcCategory
  broughtBy: string
  policeStation: string
  incidentAt: string | null
  registeredAt: number
  /** Police intimation is captured, never assumed. */
  intimationSent: boolean
  acknowledgedAt: number | null
}

export interface RegisterMlcInput {
  patientId: string
  category: MlcCategory
  broughtBy: MlcBroughtBy | string
  policeStation: string
  incidentAt?: string
}

export interface RegistrationLogEntry {
  patientId: string
  registeredAt: number
}
