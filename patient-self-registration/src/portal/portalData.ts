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

/** A date `days` from today (negative = past), as YYYY-MM-DD — the sample
 *  record always reads as current, never as a stale fixed date. */
function fromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "10:30" → "10:30 AM" — every time a patient reads is 12-hour. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const UPCOMING: Appointment[] = [
  {
    id: 'a1',
    date: fromToday(3),
    time: '10:30',
    department: 'Neurology',
    clinician: 'Dr. Arun Kumar',
    location: 'Block B · Room 12',
    status: 'confirmed',
  },
  {
    id: 'a2',
    date: fromToday(12),
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
    date: fromToday(-49),
    department: 'Neurology',
    clinician: 'Dr. Arun Kumar',
    summary: 'Follow-up review. Blood pressure stable, medication continued.',
  },
  {
    id: 'v2',
    date: fromToday(-156),
    department: 'General Medicine',
    clinician: 'Dr. Farah Ahmed',
    summary: 'Routine consultation and blood panel.',
  },
];

export const MEDICATIONS: Medication[] = [
  { id: 'm1', name: 'Amlodipine', dose: '5 mg', schedule: 'Once daily, morning', prescribedBy: 'Dr. Arun Kumar', refillsLeft: 2 },
  { id: 'm2', name: 'Atorvastatin', dose: '10 mg', schedule: 'Once daily, night', prescribedBy: 'Dr. Arun Kumar', refillsLeft: 1 },
  { id: 'm3', name: 'Aspirin', dose: '75 mg', schedule: 'Once daily, after food', prescribedBy: 'Dr. Farah Ahmed', refillsLeft: 4 },
];

export const DOCUMENTS: Document[] = [
  { id: 'd1', title: 'MRI brain — report', kind: 'Radiology', date: fromToday(-49), size: '1.8 MB' },
  { id: 'd2', title: 'Lipid profile', kind: 'Pathology', date: fromToday(-51), size: '240 KB' },
  { id: 'd3', title: 'Discharge summary', kind: 'Inpatient', date: fromToday(-154), size: '620 KB' },
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
    body: `Neurology review with Dr. Arun Kumar on ${formatDate(UPCOMING[0].date)}, ${formatTime(UPCOMING[0].time)}. Block B, Room 12.`,
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
