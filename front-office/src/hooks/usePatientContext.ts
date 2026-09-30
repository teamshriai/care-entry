import { useContext } from 'react'
import { PatientContext } from '../contexts/patientContextObject'
import type { PatientContextValue } from '../contexts/patientContextObject'

export function usePatientContext(): PatientContextValue {
  const context = useContext(PatientContext)
  if (!context) throw new Error('usePatientContext must be used within a PatientProvider')
  return context
}
