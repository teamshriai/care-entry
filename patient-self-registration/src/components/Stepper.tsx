import { Icon } from './Icon';
import type { StepDef } from '../types';
import './Stepper.css';

const STEP_ICONS: Parameters<typeof Icon>[0]['name'][] = [
  'userCheck',
  'shieldCheck',
  'mapPin',
  'idCard',
  'brainPulse',
  'clock',
  'checkCircle',
];

export function Stepper({
  steps,
  currentStep,
  furthestStep,
  onGoto,
}: {
  steps: StepDef[];
  currentStep: number;
  furthestStep: number;
  onGoto: (step: number) => void;
}) {
  return (
    <nav className="rail" aria-label="Registration progress">
      <p className="rail-head">Registration</p>

      <ol className="rail-list">
        {steps.map((def) => {
          const isDone = def.step < currentStep;
          const isActive = def.step === currentStep;
          const isLocked = def.step > furthestStep;
          return (
            <li key={def.step}>
              <button
                className={`rail-item ${isActive ? 'rail-item--active' : ''} ${isLocked ? 'rail-item--locked' : ''}`}
                onClick={() => !isLocked && onGoto(def.step)}
                disabled={isLocked}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="rail-icon">
                  <Icon name={STEP_ICONS[def.step - 1]} size={16} />
                </span>
                <span className="rail-label">{def.label}</span>
                {isDone && (
                  <svg className="rail-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
