/**
 * Sample content for the patient portal. There is no backend, so every record
 * here is static demonstration data rendered against whichever patient signs in.
 */

export interface Appointment {
  id: string;
  date: string;
  time: string;
  department: string;
  clinician: string;
  location: string;
  status: 'confirmed' | 'awaiting' | 'completed';
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  prescribedBy: string;
  refillsLeft: number;
}

export interface Document {
  id: string;
  title: string;
  kind: string;
  date: string;
  size: string;
}

export interface Visit {
  id: string;
  date: string;
  department: string;
  clinician: string;
  summary: string;
}

export const UPCOMING: Appointment[] = [
  {
    id: 'a1',
    date: '2026-10-02',
    time: '10:30',
    department: 'Neurology',
    clinician: 'Dr R. Anderson',
    location: 'Clinic Wing B · Room 311',
    status: 'confirmed',
  },
  {
    id: 'a2',
    date: '2026-11-14',
    time: '09:00',
    department: 'Pathology',
    clinician: 'Walk-in',
    location: 'Ground floor · Sample collection',
    status: 'awaiting',
  },
];

export const VISITS: Visit[] = [
  {
    id: 'v1',
    date: '2026-08-19',
    department: 'Neurology',
    clinician: 'Dr R. Anderson',
    summary: 'Follow-up review. Blood pressure stable, medication continued.',
  },
  {
    id: 'v2',
    date: '2026-05-04',
    department: 'General medicine',
    clinician: 'Dr S. Iyer',
    summary: 'Routine consultation and blood panel.',
  },
];

export const MEDICATIONS: Medication[] = [
  { id: 'm1', name: 'Amlodipine', dose: '5 mg', schedule: 'Once daily, morning', prescribedBy: 'Dr R. Anderson', refillsLeft: 2 },
  { id: 'm2', name: 'Atorvastatin', dose: '10 mg', schedule: 'Once daily, night', prescribedBy: 'Dr R. Anderson', refillsLeft: 1 },
  { id: 'm3', name: 'Aspirin', dose: '75 mg', schedule: 'Once daily, after food', prescribedBy: 'Dr S. Iyer', refillsLeft: 4 },
];

export const DOCUMENTS: Document[] = [
  { id: 'd1', title: 'MRI brain — report', kind: 'Radiology', date: '2026-08-19', size: '1.8 MB' },
  { id: 'd2', title: 'Lipid profile', kind: 'Pathology', date: '2026-08-17', size: '240 KB' },
  { id: 'd3', title: 'Discharge summary', kind: 'Inpatient', date: '2026-05-06', size: '620 KB' },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I reschedule an appointment?',
    a: 'Open Appointments, select the booking and choose Request change. Reception confirms the new slot by SMS, usually within one working day.',
  },
  {
    q: 'Can somebody else collect my reports?',
    a: 'Yes. They need your patient ID and a photo identity document of their own. Reports are not released without both.',
  },
  {
    q: 'How do I request a medication refill?',
    a: 'Open Medications and use Request refill on the relevant item. Requests are reviewed by the prescribing clinician before dispensing.',
  },
  {
    q: 'Who do I contact outside clinic hours?',
    a: 'Call the 24-hour helpline below. For stroke symptoms — facial droop, arm weakness or slurred speech — call emergency services immediately rather than waiting.',
  },
];

export const CONTACTS = {
  reception: '+91 44 4000 1200',
  helpline: '+91 44 4000 1299',
  emergency: '108',
};

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface Notice {
  id: string;
  icon: 'calendar' | 'file' | 'pill' | 'alert';
  title: string;
  body: string;
  when: string;
  unread: boolean;
}

export const NOTICES: Notice[] = [
  {
    id: 'n1',
    icon: 'calendar',
    title: 'Appointment confirmed',
    body: 'Neurology review with Dr R. Anderson on 02 Oct, 10:30. Clinic Wing B, Room 311.',
    when: '2 hours ago',
    unread: true,
  },
  {
    id: 'n2',
    icon: 'file',
    title: 'Report released',
    body: 'Your lipid profile is available under Records.',
    when: 'Yesterday',
    unread: true,
  },
  {
    id: 'n3',
    icon: 'pill',
    title: 'Refill running low',
    body: 'Atorvastatin has one refill remaining. Request a renewal before it runs out.',
    when: '3 days ago',
    unread: false,
  },
  {
    id: 'n4',
    icon: 'alert',
    title: 'Contact details confirmed',
    body: 'The mobile number on your record was verified at sign-in.',
    when: '5 days ago',
    unread: false,
  },
];
