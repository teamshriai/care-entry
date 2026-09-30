import type { Gender } from '../types';

/**
 * Demo identity records. These stand in for what an Aadhaar eKYC or an ABHA
 * profile lookup would return. Nothing here touches a real service.
 *
 * Note the deliberate omission: neither source returns a usable mobile number.
 * Aadhaar offline eKYC returns only a hash of it, and ABHA returns it masked —
 * so the demo mirrors that and always asks the patient to type it in.
 */
export interface DemoIdentity {
  name: string;
  dob: string;
  gender: Gender;
  careOf: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  maskedMobile: string;
  aadhaar?: string;
  abhaNumber?: string;
  abhaAddress?: string;
}

const ASHA: DemoIdentity = {
  name: 'Asha Menon',
  dob: '1978-04-12',
  gender: 'female',
  careOf: 'C/O Ramesh Menon',
  address: '14, Lake View Residency, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  maskedMobile: '••••••7777',
  aadhaar: '412574839021',
  abhaNumber: '14-2345-6789-0123',
  abhaAddress: 'asha.menon@abdm',
};

const RAVI: DemoIdentity = {
  name: 'Ravi Kumar',
  dob: '1965-01-20',
  gender: 'male',
  careOf: 'S/O Late Mohan Kumar',
  address: '221-B, Ashok Nagar, Sector 7',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600083',
  maskedMobile: '••••••6780',
  aadhaar: '739102846537',
  abhaNumber: '91-8765-4321-0987',
  abhaAddress: 'ravi.kumar@abdm',
};

const AADHAAR_REGISTRY: Record<string, DemoIdentity> = {
  '412574839021': ASHA,
  '739102846537': RAVI,
};

const ABHA_REGISTRY: Record<string, DemoIdentity> = {
  '142345678901 23': ASHA,
  '14-2345-6789-0123': ASHA,
  'asha.menon@abdm': ASHA,
  '91-8765-4321-0987': RAVI,
  'ravi.kumar@abdm': RAVI,
};

export function lookupAadhaar(raw: string): DemoIdentity | null {
  return AADHAAR_REGISTRY[raw.replace(/\D/g, '')] ?? null;
}

export function lookupAbha(raw: string): DemoIdentity | null {
  return ABHA_REGISTRY[raw.trim().toLowerCase()] ?? null;
}

/** How a patient reached the form, and whatever their ID gave us. */
export interface RegistrationOrigin {
  source: 'aadhaar' | 'abha' | 'manual';
  identity: DemoIdentity | null;
}

/** Shown on screen so anyone trying the demo knows what to type. */
export const DEMO_HINTS = {
  aadhaar: ['4125 7483 9021', '7391 0284 6537'],
  abha: ['14-2345-6789-0123', 'ravi.kumar@abdm'],
};
