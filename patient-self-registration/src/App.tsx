import { useEffect, useState } from 'react';
import './App.css';
import { Stepper } from './components/Stepper';
import { Icon } from './components/Icon';
import { Step1Search } from './components/Step1Search';
import { Step1Review } from './components/Step1Review';
import { INITIAL_LKW, INITIAL_SYMPTOMS, initialDetails, type DetailsDraft, type LkwDraft, type SymptomsDraft } from './drafts';
import { Step2Otp } from './components/Step2Otp';
import { Step3Details } from './components/Step3Details';
import { Step4Abha } from './components/Step4Abha';
import { Step5Symptoms } from './components/Step5Symptoms';
import { Step6Lkw } from './components/Step6Lkw';
import { StepComplete } from './components/StepComplete';
import { PatientPortal } from './portal/PatientPortal';
import { generateEncounterCode, maskAadhaar, STEP_DEFS } from './data';
import type { RegistrationOrigin } from './identity/identityData';
import type { MockPatient } from './types';
import './design-system.css';

/** Aadhaar and ABHA registration already involve a one-time code against the
 *  registered mobile number and produce a verified ID, so neither the mobile
 *  verification step nor the ABHA step applies to those patients. */
const VERIFIED_SKIPS = [2, 4];

function stepsFor(source: RegistrationOrigin['source']) {
  return STEP_DEFS.filter((d) => !(source !== 'manual' && VERIFIED_SKIPS.includes(d.step)));
}

function App() {
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [patient, setPatient] = useState<MockPatient | null>(null);
  const [encounterCode, setEncounterCode] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [origin, setOrigin] = useState<RegistrationOrigin>({ source: 'manual', identity: null });

  // Step form state lives here, not in the step components: a component is
  // unmounted as soon as the patient navigates away, which would discard it.
  const [details, setDetails] = useState<DetailsDraft>(() => initialDetails(null));
  const [abhaId, setAbhaId] = useState('');
  const [symptoms, setSymptoms] = useState<SymptomsDraft>(INITIAL_SYMPTOMS);
  const [lkw, setLkw] = useState<LkwDraft>(INITIAL_LKW);
  /** An existing patient who signs in goes to their portal; a new patient
   *  continues through the registration steps. */
  const [inPortal, setInPortal] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('shri-theme-v3') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try {
      localStorage.setItem('shri-theme-v3', dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable — the theme still applies for this session */
    }
  }, [dark]);

  const steps = stepsFor(origin.source);

  function stepAfter(from: number) {
    const i = steps.findIndex((s) => s.step === from);
    return steps[Math.min(i + 1, steps.length - 1)].step;
  }

  function stepBefore(from: number) {
    const i = steps.findIndex((s) => s.step === from);
    return steps[Math.max(i - 1, 0)].step;
  }

  function goto(next: number) {
    setStep(next);
    setFurthestStep((f) => Math.max(f, next));
  }

  function handleConfirmed(p: MockPatient, how: RegistrationOrigin) {
    setPatient(p);
    setOrigin(how);
    setEncounterCode(generateEncounterCode());
    // Address fields start from whatever the verified source supplied.
    setDetails(initialDetails(how.identity));
    // `steps` still reflects the previous origin on this render, so derive the
    // next step from the origin we were just handed.
    const next = stepsFor(how.source);
    goto(next[next.findIndex((s) => s.step === 1) + 1].step);
  }

  function handleSignIn(p: MockPatient) {
    setPatient(p);
    setInPortal(true);
  }

  function handleRestart() {
    setDetails(initialDetails(null));
    setAbhaId('');
    setSymptoms(INITIAL_SYMPTOMS);
    setLkw(INITIAL_LKW);
    setStep(1);
    setFurthestStep(1);
    setInPortal(false);
    setPatient(null);
    setOrigin({ source: 'manual', identity: null });
    setEncounterCode('');
    setCompletedAt('');
    setIsCompleted(false);
  }

  function handleComplete() {
    const now = new Date();
    setCompletedAt(now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    setIsCompleted(true);
    goto(STEP_DEFS[STEP_DEFS.length - 1].step);
  }

  /**
   * Forward navigation, shown on every step that has one ahead of it. It stays
   * disabled until that step has been reached once, so it never bypasses the
   * validation on a step's own Continue button.
   */
  function nav(from: number) {
    const next = stepAfter(from);
    if (next === from) return {};
    return { onNext: () => goto(next), nextDisabled: next > furthestStep };
  }

  const position = Math.max(steps.findIndex((s) => s.step === step), 0) + 1;
  const pct = Math.round(((position - 1) / (steps.length - 1)) * 100);
  /** The first screen greets the patient; later steps are named after their task. */
  const topHeading = step === 1 ? 'Welcome to patient registration' : STEP_DEFS[step - 1].label;

  if (inPortal && patient) {
    return (
      <PatientPortal
        patient={patient}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        onSignOut={handleRestart}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <span className="brand-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2 8 4-16 2 8h6" />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">SHRI HEALTH</span>
            <span className="brand-sub">Patient Registration</span>
          </span>
        </div>

        <Stepper steps={steps} currentStep={step} furthestStep={furthestStep} onGoto={goto} />

        <div className="side-foot">
          <button className="side-action" onClick={handleRestart}>
            <Icon name="idCard" size={15} />
            New registration
          </button>
          <a className="side-action" href="/demo.html">
            <Icon name="shieldCheck" size={15} />
            Identity demonstration
          </a>
          <div className="side-note">
            <span className="side-dot" />
            Encrypted
          </div>
        </div>
      </aside>

      <div className="app-stage">
        <header className="top-bar">
          <div className="top-title">
            <h1 className="top-heading">{topHeading}</h1>
          </div>

          <div className="top-actions">
            <div className="top-progress" title={`${pct}% complete`}>
              <div className="top-progress-track">
                <div className="top-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="top-progress-pct">{pct}%</span>
            </div>

            <button
              className="theme-toggle"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Switch to day mode' : 'Switch to night mode'}
              title={dark ? 'Day mode' : 'Night mode'}
            >
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>

            <div className="user-chip">
              <span className="user-avatar">
                <Icon name="userCheck" size={15} />
              </span>
              <span className="user-meta">
                <span className="user-name">{patient ? patient.name : 'New patient'}</span>
                <span className="user-role">{patient ? encounterCode : 'Not signed in'}</span>
              </span>
              <span className={`badge ${isCompleted ? 'badge-complete' : 'badge-draft'}`}>{isCompleted ? 'Complete' : 'Draft'}</span>
            </div>
          </div>
        </header>

        <div className="stage-grid">
          <main className="app-main">
            {step === 1 && (
              patient && furthestStep > 1 ? (
                <Step1Review
                  patient={patient}
                  origin={origin}
                  onNext={() => goto(stepAfter(1))}
                  onRestart={handleRestart}
                />
              ) : (
                <Step1Search onConfirmed={handleConfirmed} onSignIn={handleSignIn} />
              )
            )}
            {step === 2 && patient && (
              <Step2Otp mobile={patient.mobile} onVerified={() => goto(3)} onBack={() => goto(1)} {...nav(2)} />
            )}
            {step === 3 && patient && (
              <Step3Details
                patientName={patient.name}
                patientMobile={patient.mobile}
                origin={origin}
                draft={details}
                onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
                onContinue={() => goto(stepAfter(3))}
                onBack={() => goto(stepBefore(3))}
                {...nav(3)}
              />
            )}
            {step === 4 && (
              <Step4Abha
                abhaId={abhaId}
                onChange={setAbhaId}
                onContinue={() => goto(stepAfter(4))}
                onBack={() => goto(stepBefore(4))}
                {...nav(4)}
              />
            )}
            {step === 5 && (
              <Step5Symptoms
                draft={symptoms}
                onChange={(patch) => setSymptoms((d) => ({ ...d, ...patch }))}
                onContinue={() => goto(6)}
                onBack={() => goto(stepBefore(5))}
                {...nav(5)}
              />
            )}
            {step === 6 && (
              <Step6Lkw
                draft={lkw}
                onChange={(patch) => setLkw((d) => ({ ...d, ...patch }))}
                onComplete={handleComplete}
                onBack={() => goto(5)}
              />
            )}
            {step === 7 && patient && (
              <StepComplete
                patient={patient}
                encounterCode={encounterCode}
                completedAt={completedAt}
                onRestart={handleRestart}
                onBack={() => goto(stepBefore(7))}
              />
            )}

            <div className="assurance-strip">
              <Assurance
                icon="lock"
                title="Encrypted end to end"
                copy="Data is protected in transit and at rest."
              />
              <Assurance
                icon="clock"
                title="Approx. three minutes"
                copy="Completed steps may be revisited at any point."
              />
              <Assurance
                icon="stethoscope"
                title="Sent to the care team"
                copy="Details reach the stroke team prior to arrival."
              />
            </div>
          </main>

          <aside className="side-rail">
            <section className="rail-panel">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Record summary</h2>
                <span className={`badge ${isCompleted ? 'badge-complete' : 'badge-draft'}`}>{isCompleted ? 'Complete' : 'Draft'}</span>
              </div>
              <RailRow icon="userCheck" label="Name" value={patient?.name} />
              <RailRow icon="phone" label="Mobile" value={patient ? maskTail(patient.mobile) : undefined} />
              <RailRow icon="idCard" label="Patient ID" value={patient?.systemId} mono />
              <RailRow icon="activity" label="Visit reference" value={encounterCode || undefined} mono />
              {origin.source !== 'manual' && (
                <RailRow
                  icon="shieldCheck"
                  label={origin.source === 'aadhaar' ? 'Aadhaar' : 'ABHA'}
                  value={
                    origin.source === 'aadhaar'
                      ? origin.identity?.aadhaar && maskAadhaar(origin.identity.aadhaar)
                      : origin.identity?.abhaAddress
                  }
                  mono
                />
              )}
              <RailRow icon="calendar" label="Submitted" value={completedAt || undefined} last />
            </section>

            <section className="rail-panel rail-panel--accent">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Time dependency</h2>
                <Icon name="clock" size={16} />
              </div>
              <p className="rail-accent-copy">
                Stroke treatment is time dependent. Your details are transmitted to the care team on completion.
              </p>
            </section>

            <section className="rail-panel">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Assistance</h2>
              </div>
              <p className="rail-help-copy">
                Reception staff can assist with any question. Optional fields may be left blank.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Assurance({
  icon,
  title,
  copy,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  copy: string;
}) {
  return (
    <div className="assurance">
      <span className="assurance-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="assurance-text">
        <span className="assurance-title">{title}</span>
        <span className="assurance-copy">{copy}</span>
      </span>
    </div>
  );
}

function maskTail(mobile: string) {
  return mobile.length >= 4 ? `••••••${mobile.slice(-4)}` : mobile;
}

function RailRow({
  icon,
  label,
  value,
  mono,
  last,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`rail-row ${last ? 'rail-row--last' : ''}`}>
      <span className="rail-row-label">
        <Icon name={icon} size={13} />
        {label}
      </span>
      <span className={`rail-row-value ${value ? '' : 'rail-row-value--empty'} ${mono && value ? 'rail-row-value--mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default App;
