import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { PatientContext } from './patientContextObject'
import type { Patient } from '../types/patient'

// Front-office-only patient context. Once a patient is selected anywhere
// (search, registration, a queue/appointment row), it persists across Find
// Doctor -> Book Appointment -> Visit -> Queue so
// staff never re-search the same patient at every step (approved plan §8/§10).
//
// Deliberately mirrors the SHAPE of UI_ATLAS's own GP-05/Z3 patient context
// banner, with every clinical field removed (no allergy flag, no LOS, no
// consultant, no risk strip) — P-03 has no clinical read.

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patient, setPatientState] = useState<Patient | null>(null)

  const value = useMemo(
    () => ({
      patient,
      setPatient: (nextPatient: Patient | null) => setPatientState(nextPatient),
      clearPatient: () => setPatientState(null),
    }),
    [patient],
  )

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
}
