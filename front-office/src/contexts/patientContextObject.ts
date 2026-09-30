import { createContext } from 'react'
import type { Patient } from '../types/patient'

export interface PatientContextValue {
  patient: Patient | null
  setPatient: (nextPatient: Patient | null) => void
  clearPatient: () => void
}

// The context object lives in its own module so PatientContext.tsx exports
// only components and stays fast-refresh friendly (same split as useToast).
export const PatientContext = createContext<PatientContextValue | null>(null)
