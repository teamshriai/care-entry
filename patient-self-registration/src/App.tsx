import { useState } from 'react';
import type { IconName } from './components/Icon';
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
import { PatientShell } from './ui/PatientShell';
import { Assurance, AssuranceStrip, Badge, RailPanel, RailRow } from './ui/kit';
import { useTheme } from './ui/useTheme';
import { formatTime } from './portal/portalData';
import { IconBadge } from './components/Icon';

const STEP_ICONS: IconName[] = ['userCheck', 'shieldCheck', 'mapPin', 'idCard', 'brainPulse', 'clock', 'checkCircle'];

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
  const theme = useTheme();

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
    // A new step starts at its top, not wherever the last one was scrolled to.
    window.scrollTo({ top: 0 });
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
    window.scrollTo({ top: 0 });
  }

  function handleRestart() {
    window.scrollTo({ top: 0 });
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
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setCompletedAt(`${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${formatTime(clock)}`);
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
        theme={theme}
        onSignOut={handleRestart}
      />
    );
  }

  const statusBadge = (
    <Badge tone={isCompleted ? 'success' : 'warning'}>{isCompleted ? 'Complete' : 'Draft'}</Badge>
  );

  return (
    <PatientShell
      product="Patient Registration"
      navLabel="Registration"
      navKind="steps"
      nav={steps.map((def) => ({
        key: String(def.step),
        label: def.label,
        icon: STEP_ICONS[def.step - 1],
        active: def.step === step,
        done: def.step < step,
        locked: def.step > furthestStep,
        onSelect: () => def.step <= furthestStep && goto(def.step),
      }))}
      actions={[
        { label: 'New registration', icon: 'idCard', onSelect: handleRestart },
        { label: 'Identity demonstration', icon: 'shieldCheck', href: './demo.html' },
      ]}
      note="Encrypted"
      heading={topHeading}
      progress={pct}
      user={{
        name: patient ? patient.name : 'New patient',
        person: !!patient,
        detail: patient ? encounterCode : 'Not signed in',
        badge: { label: isCompleted ? 'Complete' : 'Draft', done: isCompleted },
      }}
      theme={{ dark: theme.dark, onToggle: theme.toggle }}
      rail={
        <>
          <RailPanel title="Record summary" tone="blue" aside={statusBadge}>
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
            <RailRow icon="calendar" label="Submitted" value={completedAt || undefined} />
          </RailPanel>

          <RailPanel title="Time dependency" accent tone="orange" aside={<IconBadge name="clock" size={28} variant="solid" />}>
            <p className="text-sm leading-relaxed text-ink-muted">
              Stroke treatment is time dependent. Your details are transmitted to the care team on completion.
            </p>
          </RailPanel>

          <RailPanel title="Assistance" tone="teal" aside={<IconBadge name="stethoscope" size={28} tone="teal" />}>
            <p className="text-sm leading-relaxed text-ink-muted">
              Reception staff can assist with any question. Optional fields may be left blank.
            </p>
          </RailPanel>
        </>
      }
    >
      {step === 1 &&
        (patient && furthestStep > 1 ? (
          <Step1Review patient={patient} origin={origin} onNext={() => goto(stepAfter(1))} onRestart={handleRestart} />
        ) : (
          <Step1Search onConfirmed={handleConfirmed} onSignIn={handleSignIn} />
        ))}
      {step === 2 && patient && <Step2Otp mobile={patient.mobile} onVerified={() => goto(3)} onBack={() => goto(1)} {...nav(2)} />}
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
        <Step4Abha abhaId={abhaId} onChange={setAbhaId} onContinue={() => goto(stepAfter(4))} onBack={() => goto(stepBefore(4))} {...nav(4)} />
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
        <Step6Lkw draft={lkw} onChange={(patch) => setLkw((d) => ({ ...d, ...patch }))} onComplete={handleComplete} onBack={() => goto(5)} />
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

      <AssuranceStrip>
        <Assurance icon="lock" title="Encrypted end to end" copy="Data is protected in transit and at rest." />
        <Assurance icon="clock" title="Approx. three minutes" copy="Completed steps may be revisited at any point." />
        <Assurance icon="stethoscope" title="Sent to the care team" copy="Details reach the stroke team prior to arrival." />
      </AssuranceStrip>
    </PatientShell>
  );
}

function maskTail(mobile: string) {
  return mobile.length >= 4 ? `••••••${mobile.slice(-4)}` : mobile;
}

export default App;
