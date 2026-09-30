import { Confetti } from './Confetti';
import { Icon } from './Icon';
import type { MockPatient } from '../types';

export function StepComplete({
  patient,
  encounterCode,
  completedAt,
  onRestart,
  onBack,
}: {
  patient: MockPatient;
  encounterCode: string;
  completedAt: string;
  onRestart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="card step-enter card--center">
      <Confetti />

      <div className="step-nav">
        <button className="btn-text" onClick={onBack}>← Back</button>
      </div>

      <div className="success-ring">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path className="success-tick" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>

      <h2 className="step-title" style={{ marginBottom: 8 }}>Registration complete</h2>
      <p className="step-sub" style={{ margin: '0 auto 28px' }}>Your details have been recorded and sent to the care team.</p>

      <div className="summary-panel">
        <Row label="Name" icon="userCheck" value={patient.name} />
        <Row label="Patient ID" icon="idCard" value={patient.systemId} mono />
        <Row label="Visit reference" icon="activity" value={encounterCode} mono />
        <Row label="Submitted" icon="calendar" value={completedAt} last />
      </div>

      <button className="btn btn-primary" onClick={onRestart}>
        Back to sign in
      </button>
    </div>
  );
}

function Row({
  label,
  icon,
  value,
  mono,
  last,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`summary-row ${last ? 'summary-row--last' : ''}`}>
      <span className="summary-label field-icon-row"><Icon name={icon} size={14} /> {label}</span>
      <span className={mono ? 'summary-value summary-value--mono' : 'summary-value'}>{value}</span>
    </div>
  );
}
