// TEMPORARY MOCK DATA.
// Stands in for a real auth/session/capability service, which does not exist
// in this project yet (see plan §18/§22 — no auth infrastructure is built as
// part of this task). Replace with a real session source when one exists.

export type Capability = 'registration.write' | 'appointment.write'

export interface CurrentUser {
  name: string
  role: string
  initials: string
  facilityId: string
  capabilities: Capability[]
}

export const currentFrontOfficeUser: CurrentUser = {
  name: 'Meera Iyer',
  role: 'Care Entry Executive',
  initials: 'MI',
  facilityId: 'shri-main',
  // Capability set per UI_ATLAS M-04.2/M-05.2 — registration.write and
  // appointment.write, no clinical read, and (deliberately) no patient.merge
  // (MRD persona only) and no facility.admin (overbooking policy, P-02 only).
  capabilities: ['registration.write', 'appointment.write'],
}
