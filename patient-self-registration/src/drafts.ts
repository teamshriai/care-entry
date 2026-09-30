/**
 * Form state for each step, held by App rather than by the step components.
 *
 * A step component is unmounted the moment the patient navigates away, so any
 * state it owned would be discarded. Keeping the drafts here means stepping
 * back and forward through the registration preserves everything typed.
 */
import type { DemoIdentity } from './identity/identityData';
import type { Hypertension } from './types';

export interface DetailsDraft {
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  ecName: string;
  ecMobile: string;
  consent: boolean;
}

/** Address fields start from whatever the verified source supplied, if anything. */
export function initialDetails(identity: DemoIdentity | null): DetailsDraft {
  return {
    email: '',
    addressLine1: identity?.address ?? '',
    addressLine2: identity?.careOf ?? '',
    city: identity?.city ?? '',
    state: identity?.state ?? '',
    pincode: identity?.pincode ?? '',
    country: 'India',
    ecName: '',
    ecMobile: '',
    consent: true,
  };
}

export interface SymptomsDraft {
  symptoms: Record<string, boolean>;
  history: Record<string, boolean>;
  hypertension: Hypertension;
  htOnsetDate: string;
  htMedication: string;
  lastVisitDate: string;
  lastVisitHospital: string;
  records: File[];
}

export const INITIAL_SYMPTOMS: SymptomsDraft = {
  symptoms: {},
  history: {},
  hypertension: 'unknown',
  htOnsetDate: '',
  htMedication: '',
  lastVisitDate: '',
  lastVisitHospital: '',
  records: [],
};

export interface LkwDraft {
  date: string;
  time: string;
}

export const INITIAL_LKW: LkwDraft = { date: '', time: '' };
