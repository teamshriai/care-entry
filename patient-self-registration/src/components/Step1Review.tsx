import { maskAadhaar } from '../data';
import type { RegistrationOrigin } from '../identity/identityData';
import type { MockPatient } from '../types';
import { Alert, Button, ButtonRow, Card, StepHeader, StepNav, StepSub, SummaryList, SummaryRow } from '../ui/kit';

const GENDER_LABELS: Record<string, string> = {
  unknown: 'Not stated',
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/**
 * Step 1 once a patient has been registered. Stepping back to the first step
 * should show what was captured, not an empty sign-in form that would discard
 * the registration in progress.
 */
export function Step1Review({
  patient,
  origin,
  onNext,
  onRestart,
}: {
  patient: MockPatient;
  origin: RegistrationOrigin;
  onNext: () => void;
  onRestart: () => void;
}) {
  const sourceLabel = origin.source === 'aadhaar' ? 'Aadhaar' : origin.source === 'abha' ? 'ABHA' : 'Entered manually';

  return (
    <Card tone="blue">
      <StepNav onNext={onNext} />
      <StepHeader icon="userCheck" title="Your details" />
      <StepSub>These details were captured at the start of this registration.</StepSub>

      {origin.identity && (
        <Alert tone="success" className="mt-5">
          <strong>Verified via {sourceLabel}</strong>
          {origin.source === 'aadhaar' && origin.identity.aadhaar ? ` · ${maskAadhaar(origin.identity.aadhaar)}` : ''}
          {origin.source === 'abha' && origin.identity.abhaAddress ? ` · ${origin.identity.abhaAddress}` : ''}
        </Alert>
      )}

      <SummaryList className="mt-5">
        <SummaryRow label="Full name" value={patient.name} />
        <SummaryRow label="Mobile number" value={patient.mobile} />
        <SummaryRow label="Patient ID" value={patient.systemId} mono />
        <SummaryRow label="Date of birth" value={patient.dob ?? 'Not provided'} />
        <SummaryRow label="Gender" value={GENDER_LABELS[patient.gender] ?? patient.gender} />
        <SummaryRow label="Registration method" value={sourceLabel} />
      </SummaryList>

      <ButtonRow>
        <Button onClick={onNext}>Continue</Button>
        <Button variant="outline" onClick={onRestart}>
          Start a new registration
        </Button>
      </ButtonRow>
    </Card>
  );
}
