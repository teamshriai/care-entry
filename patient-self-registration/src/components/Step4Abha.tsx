import { Icon, IconBadge } from './Icon';

export function Step4Abha({
  abhaId,
  onChange,
  onContinue,
  onBack,
  onNext,
  nextDisabled,
}: {
  abhaId: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Forward navigation; disabled until this step has been completed once. */
  onNext?: () => void;
  nextDisabled?: boolean;
}) {

  return (
    <div className="card step-enter">
      <div className="step-nav">
        <button className="btn-text" onClick={onBack}>← Back</button>
        {onNext && (
          <button
            className="btn-next"
            onClick={onNext}
            disabled={nextDisabled}
            title={nextDisabled ? 'Complete this step to continue' : 'Go to the next step'}
          >
            Next
            <Icon name="chevron" size={14} />
          </button>
        )}
      </div>
      <div className="step-head">
        <IconBadge name="heartPulse" />
        <h2 className="step-title">ABHA</h2>
        <span className="badge" style={{ background: 'var(--sand-2)', color: 'var(--ink-2)' }}>Optional</span>
      </div>
      <p className="step-sub">
        Link an Ayushman Bharat Health Account. This may also be added after registration.
      </p>

      <label className="field" style={{ marginBottom: 24 }}>
        <span className="field-label">ABHA number or ABHA address</span>
        <input className="field-input" value={abhaId} onChange={(e) => onChange(e.target.value)} placeholder="14-2345-6789-0123 or name@abdm" />
      </label>

      <button className="btn btn-primary" onClick={onContinue}>
        {abhaId.trim() ? 'Save and continue' : 'Continue without ABHA'}
      </button>
    </div>
  );
}
