// DEVELOPMENT SEED DATA — NOT A BACKEND. Same convention as the other
// domain seed files: timestamps generated relative to app start.
import type { Admission, Bed } from '../types/admission'
import type { NextIds } from '../types/store'

const MINUTE = 60000

export interface AdmissionSeed {
  beds: Bed[]
  admissions: Admission[]
  nextIds: Pick<NextIds, 'admission'>
}

export function createAdmissionSeed(now: number = Date.now()): AdmissionSeed {
  const minutesAgo = (minutes: number) => now - minutes * MINUTE

  const beds: Bed[] = [
    { bedId: 'bed-1', bedNumber: 'G-101-B', roomNumber: 'G-101', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-2', bedNumber: 'G-102-B', roomNumber: 'G-102', ward: 'General Ward', roomType: 'General', status: 'Occupied', currentAdmissionId: 'adm-1' },
    { bedId: 'bed-3', bedNumber: 'G-103-B', roomNumber: 'G-103', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-4', bedNumber: 'G-104-B', roomNumber: 'G-104', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-5', bedNumber: 'G-105-B', roomNumber: 'G-105', ward: 'General Ward', roomType: 'General', status: 'Maintenance', currentAdmissionId: null },
    { bedId: 'bed-6', bedNumber: 'P-201-B', roomNumber: 'P-201', ward: 'Private Ward', roomType: 'Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-7', bedNumber: 'P-202-B', roomNumber: 'P-202', ward: 'Private Ward', roomType: 'Private', status: 'Occupied', currentAdmissionId: 'adm-2' },
    { bedId: 'bed-8', bedNumber: 'SP-301-B', roomNumber: 'SP-301', ward: 'Semi-Private Ward', roomType: 'Semi-Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-9', bedNumber: 'SP-302-B', roomNumber: 'SP-302', ward: 'Semi-Private Ward', roomType: 'Semi-Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-10', bedNumber: 'ICU-01-B', roomNumber: 'ICU-01', ward: 'ICU', roomType: 'ICU', status: 'Occupied', currentAdmissionId: 'adm-3' },
    { bedId: 'bed-11', bedNumber: 'ICU-02-B', roomNumber: 'ICU-02', ward: 'ICU', roomType: 'ICU', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-12', bedNumber: 'ER-01-B', roomNumber: 'ER-01', ward: 'Emergency', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-13', bedNumber: 'ER-02-B', roomNumber: 'ER-02', ward: 'Emergency', roomType: 'General', status: 'Reserved', currentAdmissionId: null },
    { bedId: 'bed-14', bedNumber: 'G-106-B', roomNumber: 'G-106', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-15', bedNumber: 'G-107-B', roomNumber: 'G-107', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-16', bedNumber: 'G-108-B', roomNumber: 'G-108', ward: 'General Ward', roomType: 'General', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-17', bedNumber: 'P-203-B', roomNumber: 'P-203', ward: 'Private Ward', roomType: 'Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-18', bedNumber: 'P-204-B', roomNumber: 'P-204', ward: 'Private Ward', roomType: 'Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-19', bedNumber: 'SP-303-B', roomNumber: 'SP-303', ward: 'Semi-Private Ward', roomType: 'Semi-Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-20', bedNumber: 'SP-304-B', roomNumber: 'SP-304', ward: 'Semi-Private Ward', roomType: 'Semi-Private', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-21', bedNumber: 'ICU-03-B', roomNumber: 'ICU-03', ward: 'ICU', roomType: 'ICU', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-22', bedNumber: 'ICU-04-B', roomNumber: 'ICU-04', ward: 'ICU', roomType: 'ICU', status: 'Available', currentAdmissionId: null },
    { bedId: 'bed-23', bedNumber: 'ER-03-B', roomNumber: 'ER-03', ward: 'Emergency', roomType: 'General', status: 'Available', currentAdmissionId: null },
  ]

  function attendant(name: string, relationship: Admission['attendant']['relationship'], phone: string): Admission['attendant'] {
    return { name, relationship, phone, address: null }
  }

  const admissions: Admission[] = [
    {
      admissionId: 'adm-1',
      admissionNumber: 'ADM-2026-00001',
      patientId: 'SHRI-0044120',
      patientName: 'Arun Kumar',
      doctorId: 'dr-arun-kumar',
      doctorName: 'Dr. Arun Kumar',
      department: 'Neurology',
      admissionType: 'Elective',
      reason: 'Elective admission for observation',
      referralSource: 'OPD',
      bedId: 'bed-2',
      wardLabel: 'General Ward',
      roomNumber: 'G-102',
      bedNumber: 'G-102-B',
      roomType: 'General',
      attendant: attendant('Vikram Kumar', 'Son', '+91 98430 55112'),
      paymentType: 'Self Pay',
      insuranceProvider: null,
      policyNumber: null,
      paymentId: null,
      status: 'Admitted',
      admittedAt: minutesAgo(600),
      dischargedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: minutesAgo(600),
      updatedAt: minutesAgo(600),
    },
    {
      admissionId: 'adm-2',
      admissionNumber: 'ADM-2026-00002',
      patientId: 'SHRI-0102234',
      patientName: 'Priya Nair',
      doctorId: 'dr-priya-nair',
      doctorName: 'Dr. Priya Nair',
      department: 'Cardiology',
      admissionType: 'Emergency',
      reason: 'Chest pain, admitted for cardiac workup',
      referralSource: 'Emergency',
      bedId: 'bed-7',
      wardLabel: 'Private Ward',
      roomNumber: 'P-202',
      bedNumber: 'P-202-B',
      roomType: 'Private',
      attendant: attendant('Rajesh Nair', 'Spouse', '+91 99000 44311'),
      paymentType: 'Insurance',
      insuranceProvider: 'Star Health',
      policyNumber: 'SH-88213340',
      paymentId: null,
      status: 'Admitted',
      admittedAt: minutesAgo(180),
      dischargedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(180),
    },
    {
      admissionId: 'adm-3',
      admissionNumber: 'ADM-2026-00003',
      patientId: 'SHRI-0125590',
      patientName: 'Karthik Subramanian',
      doctorId: 'dr-rahul-menon',
      doctorName: 'Dr. Rahul Menon',
      department: 'General Medicine',
      admissionType: 'Emergency',
      reason: 'Post-operative ICU monitoring',
      referralSource: 'Transfer',
      bedId: 'bed-10',
      wardLabel: 'ICU',
      roomNumber: 'ICU-01',
      bedNumber: 'ICU-01-B',
      roomType: 'ICU',
      attendant: attendant('Lakshmi Subramanian', 'Spouse', '+91 94440 66232'),
      paymentType: 'TPA',
      insuranceProvider: 'MediAssist TPA',
      policyNumber: 'MA-2231987',
      paymentId: null,
      status: 'Admitted',
      admittedAt: minutesAgo(1200),
      dischargedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: minutesAgo(1200),
      updatedAt: minutesAgo(1200),
    },
    // A pending admission — expected, not yet actioned (demonstrates the
    // Pending/Expected metric distinctly from an already-Admitted record).
    {
      admissionId: 'adm-4',
      admissionNumber: 'ADM-2026-00004',
      patientId: 'SHRI-0111045',
      patientName: 'Mohammed Irfan',
      doctorId: 'dr-arun-kumar',
      doctorName: 'Dr. Arun Kumar',
      department: 'Neurology',
      admissionType: 'Elective',
      reason: 'Scheduled admission pending bed availability',
      referralSource: 'OPD',
      bedId: null,
      wardLabel: null,
      roomNumber: null,
      bedNumber: null,
      roomType: null,
      attendant: attendant('Ayesha Irfan', 'Spouse', '+91 90031 77813'),
      paymentType: 'Self Pay',
      insuranceProvider: null,
      policyNumber: null,
      paymentId: null,
      status: 'Pending',
      admittedAt: null,
      dischargedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: minutesAgo(60),
      updatedAt: minutesAgo(60),
    },
  ]

  return {
    beds,
    admissions,
    nextIds: { admission: admissions.length + 1 },
  }
}
