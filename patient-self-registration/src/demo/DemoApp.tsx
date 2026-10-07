import { useState } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { INDIAN_STATES, MOBILE_ERROR, dobError, generateSystemId, isValidMobile, maskAadhaar } from '../data';
import { MethodChooser, type IdMethod } from '../identity/MethodChooser';
import { IdentityVerify } from '../identity/IdentityVerify';
import type { DemoIdentity } from '../identity/identityData';
import type { Gender } from '../types';
import { PatientShell } from '../ui/PatientShell';
import {
  Alert,
  Assurance,
  AssuranceStrip,
  Badge,
  Button,
  ButtonRow,
  Card,
  Field,
  RailPanel,
  RailRow,
  Select,
  StepHeader,
  StepSub,
  SuccessMark,
  SummaryList,
  SummaryRow,
} from '../ui/kit';
import { formGridClass, inputClass } from '../ui/classes';
import { useTheme } from '../ui/useTheme';

type Stage = 'choose' | 'verify' | 'form' | 'done';

const BLANK = {
  name: '',
  dob: '',
  gender: 'unknown' as Gender,
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const STAGES: { key: Stage; label: string; icon: IconName }[] = [
  { key: 'choose', label: 'Registration method', icon: 'userCheck' },
  { key: 'verify', label: 'Identity verification', icon: 'shieldCheck' },
  { key: 'form', label: 'Confirm details', icon: 'idCard' },
  { key: 'done', label: 'Registered', icon: 'checkCircle' },
];

export default function DemoApp() {
  const theme = useTheme();

  const [stage, setStage] = useState<Stage>('choose');
  const [method, setMethod] = useState<IdMethod>('manual');
  const [identity, setIdentity] = useState<DemoIdentity | null>(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');

  function reset() {
    setStage('choose');
    setMethod('manual');
    setIdentity(null);
    setForm(BLANK);
    setError('');
    setPatientId('');
  }

  function pickMethod(m: IdMethod) {
    setMethod(m);
    setError('');
    if (m === 'manual') {
      setIdentity(null);
      setForm(BLANK);
      setStage('form');
    } else {
      setStage('verify');
    }
  }

  function applyIdentity(found: DemoIdentity) {
    setIdentity(found);
    setForm({
      name: found.name,
      dob: found.dob,
      gender: found.gender,
      mobile: '', // neither source ever returns a usable number
      address: found.address,
      city: found.city,
      state: found.state,
      pincode: found.pincode,
    });
    setError('');
    setStage('form');
  }

  function submit() {
    if (!form.name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!isValidMobile(form.mobile)) {
      setError(MOBILE_ERROR);
      return;
    }
    const dobProblem = dobError(form.dob);
    if (dobProblem) {
      setError(dobProblem);
      return;
    }
    setError('');
    setPatientId(generateSystemId());
    setStage('done');
  }

  const sourceLabel = method === 'aadhaar' ? 'Aadhaar' : method === 'abha' ? 'ABHA' : 'Manual entry';
  const stageIndex = STAGES.findIndex((s) => s.key === stage) + 1;
  const pct = Math.round(((stageIndex - 1) / (STAGES.length - 1)) * 100);
  const filledCount = identity ? 6 : 0;

  const heading =
    stage === 'choose'
      ? 'Select a registration method'
      : stage === 'verify'
        ? `${sourceLabel} verification`
        : stage === 'form'
          ? identity
            ? 'Confirm your details'
            : 'Enter your details'
          : 'Registration complete';

  return (
    <PatientShell
      product="Identity demonstration"
      navLabel="Sample walkthrough"
      navKind="steps"
      nav={STAGES.map((s, i) => ({
        key: s.key,
        label: s.label,
        icon: s.icon,
        active: stageIndex === i + 1,
        done: stageIndex > i + 1,
        locked: stageIndex < i + 1,
        onSelect: () => i === 0 && reset(),
      }))}
      actions={[
        { label: 'Full registration', icon: 'activity', href: './' },
        { label: 'Restart demonstration', icon: 'idCard', onSelect: reset },
      ]}
      note="Sample data"
      heading={heading}
      progress={pct}
      user={{
        name: form.name || 'New patient',
        detail: identity ? `${sourceLabel} verified` : sourceLabel,
        badge: { label: stage === 'done' ? 'Complete' : 'Demo', done: stage === 'done' },
      }}
      theme={{ dark: theme.dark, onToggle: theme.toggle }}
      rail={
        <>
          <RailPanel title="Retrieved record" aside={<Badge tone={identity ? 'success' : 'neutral'}>{identity ? 'Verified' : 'None'}</Badge>}>
            <RailRow icon="userCheck" label="Name" value={identity?.name} />
            <RailRow icon="calendar" label="Date of birth" value={identity?.dob} />
            <RailRow icon="mapPin" label="Town or city" value={identity?.city} />
            <RailRow icon="phone" label="Mobile on file" value={identity?.maskedMobile} />
            <RailRow
              icon="idCard"
              label={method === 'abha' ? 'ABHA address' : 'Aadhaar'}
              value={method === 'abha' ? identity?.abhaAddress : identity?.aadhaar ? maskAadhaar(identity.aadhaar) : undefined}
              mono
            />
          </RailPanel>

          <RailPanel title="Mobile number" accent aside={<span className="text-primary-text"><Icon name="phone" size={16} /></span>}>
            <p className="text-sm leading-relaxed text-ink-muted">
              Aadhaar offline eKYC returns only a hash of the registered mobile number, and ABHA returns it masked. Neither discloses a usable number, so it
              must be provided by the patient.
            </p>
          </RailPanel>

          <RailPanel title="Sample data notice">
            <p className="text-sm leading-relaxed text-ink-muted">
              No UIDAI or ABDM service is contacted. Lookups read a local sample table and the code check accepts the value displayed on screen. Production
              integration requires replacing two lookup functions.
            </p>
          </RailPanel>
        </>
      }
    >
      <Card center={stage === 'done'}>
        {stage === 'choose' && (
          <>
            <StepHeader icon="userCheck" title="Select a registration method" />
            <div className="mt-6">
              <MethodChooser onPick={pickMethod} />
            </div>
          </>
        )}

        {stage === 'verify' && method !== 'manual' && <IdentityVerify method={method} onVerified={applyIdentity} onBack={() => setStage('choose')} />}

        {stage === 'form' && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <StepHeader icon="idCard" title={identity ? 'Confirm your details' : 'Enter your details'} />
            <StepSub>
              {identity ? 'Provide your mobile number and confirm the remaining fields.' : 'Provide the following details. Starred fields are required.'}
            </StepSub>

            {identity && (
              <Alert tone="success" className="mt-5">
                <strong>Verified via {method === 'aadhaar' ? 'Aadhaar' : 'ABHA'}</strong>
                {method === 'aadhaar' && identity.aadhaar ? ` · ${maskAadhaar(identity.aadhaar)}` : ''}
                {method === 'abha' && identity.abhaAddress ? ` · ${identity.abhaAddress}` : ''}
                {' · '}
                {filledCount} fields retrieved
              </Alert>
            )}

            <div className={`mt-6 ${formGridClass}`}>
              <Field label="Full name" required verified={!!identity}>
                <input className={inputClass} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Mobile number" required hint={identity ? `Registered on file: ${identity.maskedMobile}` : undefined}>
                <input
                  className={inputClass}
                  autoFocus={!!identity}
                  value={form.mobile}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit number"
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </Field>
              <Field label="Date of birth" verified={!!identity}>
                <input className={inputClass} type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </Field>
              <Field label="Gender" verified={!!identity}>
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                  <option value="unknown">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Address" verified={!!identity} className="sm:col-span-2">
                <input className={inputClass} autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Town or city" verified={!!identity}>
                <input className={inputClass} autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="State" verified={!!identity}>
                <Select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                  <option value="">Select a state</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="PIN code" verified={!!identity}>
                <input
                  className={inputClass}
                  value={form.pincode}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                />
              </Field>
            </div>

            {error && <Alert tone="error" className="mt-5">{error}</Alert>}

            <ButtonRow>
              <Button type="submit">Complete registration</Button>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </ButtonRow>
          </form>
        )}

        {stage === 'done' && (
          <>
            <SuccessMark />
            <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Registration complete</h2>
            <StepSub className="mx-auto mb-6 max-w-md">{identity ? `Verified via ${sourceLabel}.` : 'Registered using the details provided.'}</StepSub>

            <SummaryList className="mx-auto max-w-lg">
              <SummaryRow icon="userCheck" label="Name" value={form.name} />
              <SummaryRow icon="phone" label="Mobile" value={form.mobile} />
              <SummaryRow icon="mapPin" label="Town or city" value={form.city} />
              <SummaryRow icon="shieldCheck" label="Identified by" value={sourceLabel} />
              <SummaryRow icon="idCard" label="Patient ID" value={patientId} mono />
            </SummaryList>

            <ButtonRow className="justify-center">
              <Button onClick={reset}>Restart demonstration</Button>
            </ButtonRow>
          </>
        )}
      </Card>

      <AssuranceStrip>
        <Assurance icon="lock" title="No external requests" copy="Lookups read local sample records only." />
        <Assurance icon="shieldCheck" title="Consent required" copy="Details are retrieved only after verification." />
        <Assurance icon="stethoscope" title="Reduced data entry" copy="Verification removes six fields from the form." />
      </AssuranceStrip>
    </PatientShell>
  );
}
