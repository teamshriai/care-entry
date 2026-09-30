import type { MockPatient, StepDef } from './types';

export const STEP_DEFS: StepDef[] = [
  { step: 1, label: 'Welcome' },
  { step: 2, label: 'Verify mobile' },
  { step: 3, label: 'Contact & address' },
  { step: 4, label: 'ABHA' },
  { step: 5, label: 'Your symptoms' },
  { step: 6, label: 'Last known well' },
  { step: 7, label: 'Done' },
];

export const MOCK_PATIENTS: MockPatient[] = [
  { id: 'p1', name: 'Asha Menon', systemId: 'SHRI-202609-2A2F0671', mobile: '9998887777', aadhaar: '412574839021', dob: '1978-04-12', gender: 'female', age: 47 },
  { id: 'p2', name: 'Ravi Kumar', systemId: 'SHRI-202608-7C1B44E0', mobile: '9123456780', aadhaar: '739102846537', dob: '1965-01-20', gender: 'male', age: 60 },
  { id: 'p3', name: 'Rita Kumar', systemId: 'SHRI-202607-9F3D21AA', mobile: '9234567891', aadhaar: null, dob: '1990-06-02', gender: 'female', age: 35 },
];

export const HISTORY_DEFS = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'prior_stroke', label: 'Previous stroke or transient ischaemic attack (TIA)' },
  { key: 'heart_rhythm', label: 'Irregular heartbeat' },
  { key: 'cholesterol', label: 'High cholesterol' },
  { key: 'heart_disease', label: 'Heart disease' },
  { key: 'smoking', label: 'Current or former smoker' },
] as const;

export const SYMPTOM_DEFS = [
  { key: 'facial', label: 'Facial weakness or drooping' },
  { key: 'arm', label: 'Arm weakness or numbness' },
  { key: 'leg', label: 'Leg weakness or numbness' },
  { key: 'speech', label: 'Slurred or difficult speech' },
  { key: 'confusion', label: 'Sudden confusion' },
  { key: 'vision', label: 'Vision problems' },
  { key: 'balance', label: 'Loss of balance or coordination' },
  { key: 'walking', label: 'Difficulty walking' },
  { key: 'headache', label: 'Sudden severe headache' },
  { key: 'consciousness', label: 'Loss of consciousness' },
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export const CORRECT_OTP = '123456';
export const MAX_OTP_ATTEMPTS = 5;

function pad2(n: number) {
  return n < 10 ? '0' + n : '' + n;
}

export function generateSystemId(): string {
  const d = new Date();
  const stamp = '' + d.getFullYear() + pad2(d.getMonth() + 1);
  const suffix = Math.random().toString(16).slice(2, 10).toUpperCase();
  return 'SHRI-' + stamp + '-' + suffix;
}

export function generateEncounterCode(): string {
  const d = new Date();
  const stamp = '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
  return 'ENC-' + stamp + '-' + suffix;
}

export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 4) return mobile || '';
  return '+91 ' + mobile.slice(0, 2) + '•• •••' + mobile.slice(-2);
}

/** Only the last 4 digits of an Aadhaar number may be displayed. */
export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length !== 12) return '';
  return '•••• •••• ' + digits.slice(-4);
}

export function formatAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(.{4})(?=.)/g, '$1 ');
}

export function computeElapsed(dateStr: string, timeStr: string) {
  if (!dateStr) return null;
  const dt = new Date(`${dateStr}T${timeStr || '00:00'}`);
  if (isNaN(dt.getTime())) return null;
  const diffMs = Date.now() - dt.getTime();
  if (diffMs < 0) return { label: 'in the future', level: 'info' as const };
  const diffMin = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  let level: 'ok' | 'warning' | 'critical' = 'ok';
  if (h >= 4.5) level = 'critical';
  else if (h >= 3) level = 'warning';
  return { label: `${h}h ${m}m`, level };
}
