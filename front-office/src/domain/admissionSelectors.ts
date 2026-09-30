import type { AppState } from '../types/store'
import type { Admission, Bed } from '../types/admission'

export function getBeds(state: AppState): Bed[] {
  return [...state.beds].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

export function getBedById(state: AppState, bedId: string): Bed | null {
  return state.beds.find((b) => b.bedId === bedId) ?? null
}

export function getAvailableBeds(state: AppState): Bed[] {
  return getBeds(state).filter((b) => b.status === 'Available')
}

export function getAdmissions(state: AppState): Admission[] {
  return [...state.admissions].sort((a, b) => b.createdAt - a.createdAt)
}

export function getAdmissionById(state: AppState, admissionId: string): Admission | null {
  return state.admissions.find((a) => a.admissionId === admissionId) ?? null
}

export function getAdmissionsForPatient(state: AppState, patientId: string): Admission[] {
  return getAdmissions(state).filter((a) => a.patientId === patientId)
}
