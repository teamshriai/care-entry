import { Icon, IconBadge } from './Icon';
import { maskAadhaar } from '../data';
import type { RegistrationOrigin } from '../identity/identityData';
import type { MockPatient } from '../types';
import '../identity/identity.css';

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
  const sourceLabel =
    origin.source === 'aadhaar' ? 'Aadhaar' : origin.source === 'abha' ? 'ABHA' : 'Entered manually';

  return (
    <div className="card step-enter">
      <div className="step-nav">
        <button className="btn-next" onClick={onNext}>
          Next
          <Icon name="chevron" size={14} />
        </button>
      </div>

      <div className="step-head">
        <IconBadge name="userCheck" />
        <h2 className="step-title">Your details</h2>
      </div>
      <p className="step-sub">These details were captured at the start of this registration.</p>

      {origin.identity && (
        <div className="prefill-banner">
          <span className="prefill-icon">
            <Icon name="checkCircle" size={16} />
          </span>
          <span>
            <strong>Verified via {sourceLabel}</strong>
            {origin.source === 'aadhaar' && origin.identity.aadhaar
              ? ` · ${maskAadhaar(origin.identity.aadhaar)}`
              : ''}
            {origin.source === 'abha' && origin.identity.abhaAddress ? ` · ${origin.identity.abhaAddress}` : ''}
          </span>
        </div>
      )}

      <div className="review-grid">
        <ReviewRow label="Full name" value={patient.name} />
        <ReviewRow label="Mobile number" value={patient.mobile} />
        <ReviewRow label="Patient ID" value={patient.systemId} />
        <ReviewRow label="Date of birth" value={patient.dob ?? 'Not provided'} />
        <ReviewRow label="Gender" value={GENDER_LABELS[patient.gender] ?? patient.gender} />
        <ReviewRow label="Registration method" value={sourceLabel} />
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onNext}>Continue</button>
        <button className="btn btn-secondary" onClick={onRestart}>Start a new registration</button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className="review-value">{value}</span>
    </div>
  );
}
