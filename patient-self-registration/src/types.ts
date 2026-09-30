export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface MockPatient {
  id: string;
  name: string;
  systemId: string;
  mobile: string;
  aadhaar: string | null;
  dob: string | null;
  gender: Gender;
  age: number | null;
}

export interface StepDef {
  step: number;
  label: string;
}

export type Hypertension = 'yes' | 'no' | 'unknown';
