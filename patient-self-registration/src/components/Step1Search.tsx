import { useEffect, useState } from 'react';
import { CORRECT_OTP, MAX_OTP_ATTEMPTS, MOBILE_ERROR, MOCK_PATIENTS, dobBounds, dobError, formatAadhaar, generateSystemId, isValidMobile, maskAadhaar, maskMobile } from '../data';
import { IconBadge } from './Icon';
import { MethodChooser, type IdMethod } from '../identity/MethodChooser';
import { IdentityVerify } from '../identity/IdentityVerify';
import type { DemoIdentity, RegistrationOrigin } from '../identity/identityData';
import type { Gender, MockPatient } from '../types';
import {
  Alert,
  BackButton,
  Button,
  ButtonRow,
  Card,
  Field,
  LockedValue,
  Reveal,
  SampleChip,
  SampleHint,
  Select,
  StepHeader,
  StepSub,
  TextButton,
} from '../ui/kit';
import { formGridClass, inputClass } from '../ui/classes';
import { OtpInput } from '../ui/OtpInput';

function ageFromDob(dobStr: string): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const GENDER_LABELS: Record<Gender, string> = { unknown: 'Not stated', male: 'Male', female: 'Female', other: 'Other' };

function displayDob(iso: string) {
  if (!iso) return 'Not provided';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Step1Search({
  onConfirmed,
  onSignIn,
}: {
  onConfirmed: (p: MockPatient, origin: RegistrationOrigin) => void;
  onSignIn: (p: MockPatient) => void;
}) {
  const [id, setId] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<MockPatient[]>([]);
  const [searchError, setSearchError] = useState('');

  /**
   * Returning patient: 'signin' → 'otp' → portal.
   * New patient:       'signin' → 'choose' (Aadhaar / ABHA / manual) → 'verify' → 'form'.
   */
  const [view, setView] = useState<'signin' | 'otp' | 'choose' | 'verify' | 'form'>('signin');
  const [method, setMethod] = useState<IdMethod>('manual');
  const [identity, setIdentity] = useState<DemoIdentity | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAadhaar, setNewAadhaar] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Gender>('unknown');
  const [formError, setFormError] = useState('');
  /** Retrieved fields stay read-only until the patient asks to correct them. */
  const [editing, setEditing] = useState(false);

  /** Sign-in is completed only after a code is sent to the number already on file. */
  const [pending, setPending] = useState<MockPatient | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  // The resend countdown ticks only while the code screen is showing.
  useEffect(() => {
    if (view !== 'otp') return undefined;
    const t = setInterval(() => setResendIn((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [view]);

  function startSignIn(p: MockPatient) {
    setPending(p);
    setOtp('');
    setOtpError('');
    setAttempts(0);
    setResendIn(30);
    setView('otp');
  }

  function verifyOtp(code: string) {
    if (attempts >= MAX_OTP_ATTEMPTS) {
      setOtp('');
      setOtpError('Attempt limit reached. Request a new code.');
      return;
    }
    if (code === CORRECT_OTP) {
      if (pending) onSignIn(pending);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setOtp('');
    setOtpError(
      next >= MAX_OTP_ATTEMPTS
        ? 'Attempt limit reached. Request a new code.'
        : `Incorrect code. ${MAX_OTP_ATTEMPTS - next} attempts remaining.`
    );
  }

  function handleSignIn() {
    if (!name.trim() && !mobile.trim()) {
      setSearchError('Enter your name and mobile number.');
      setSearched(false);
      return;
    }
    if (!name.trim()) {
      setSearchError('Enter your name.');
      setSearched(false);
      return;
    }
    if (!isValidMobile(mobile)) {
      setSearchError(MOBILE_ERROR);
      setSearched(false);
      return;
    }
    const matches = MOCK_PATIENTS.filter((p) => {
      let ok = p.name.toLowerCase().includes(name.trim().toLowerCase()) && p.mobile.includes(mobile);
      if (id.trim()) ok = ok && p.systemId.toLowerCase().includes(id.trim().toLowerCase());
      return ok;
    });
    setSearchError('');
    if (matches.length === 1) {
      startSignIn(matches[0]);
      return;
    }
    setResults(matches);
    setSearched(true);
    setView('signin');
  }

  /** Fills the form from a sample record and runs the search in one step. */
  function fillDemoRecord(p: MockPatient) {
    setName(p.name);
    setMobile(p.mobile);
    setId('');
    setSearchError('');
    setResults([]);
    setSearched(false);
    setView('signin');
  }

  function openRegister() {
    setNewMobile(mobile);
    setIdentity(null);
    setFormError('');
    setView('choose');
  }

  function pickMethod(m: IdMethod) {
    setMethod(m);
    setFormError('');
    if (m === 'manual') {
      setIdentity(null);
      setEditing(true);
      setView('form');
    } else {
      setView('verify');
    }
  }

  /** Copies across everything the verified source could give us. */
  function applyIdentity(found: DemoIdentity) {
    const [first, ...rest] = found.name.split(' ');
    setIdentity(found);
    setFirstName(first);
    setLastName(rest.join(' '));
    setDob(found.dob);
    setGender(found.gender);
    setNewAadhaar(found.aadhaar ? formatAadhaar(found.aadhaar) : '');
    setShowMore(true);
    setFormError('');
    setEditing(false);
    setView('form');
  }

  function submitNewPatient() {
    if (!firstName.trim() || !lastName.trim() || !newMobile.trim()) {
      setFormError('First name, last name and mobile number are required.');
      return;
    }
    if (!isValidMobile(newMobile)) {
      setFormError(MOBILE_ERROR);
      return;
    }
    const dobProblem = dobError(dob);
    if (dobProblem) {
      setFormError(dobProblem);
      return;
    }
    const aadhaarDigits = newAadhaar.replace(/\D/g, '');
    if (!aadhaarDigits) {
      setFormError('Enter your Aadhaar number.');
      return;
    }
    if (aadhaarDigits.length !== 12) {
      setFormError('An Aadhaar number must contain 12 digits.');
      return;
    }
    const patient: MockPatient = {
      id: 'new-' + Date.now(),
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      systemId: generateSystemId(),
      mobile: newMobile.trim(),
      aadhaar: aadhaarDigits,
      dob: dob || null,
      gender,
      age: ageFromDob(dob),
    };
    onConfirmed(patient, { source: method, identity });
  }

  /** Aadhaar is confirmed once, during verification — never asked for twice. */
  const aadhaarVerified = method === 'aadhaar' && !!identity?.aadhaar;
  /** Retrieved fields are read-only unless the patient has opened them for correction. */
  const locked = !!identity && !editing;

  const matchHeading =
    results.length === 1 ? 'Confirm your identity to continue.' : `${results.length} matching records found. Select your record:`;

  return (
    <Card>
      {view !== 'verify' && view !== 'otp' && (
        <>
          {view !== 'signin' && (
            <div className="-mt-1 mb-4">
              <BackButton onClick={() => setView(view === 'choose' ? 'signin' : 'choose')} />
            </div>
          )}
          <StepHeader
            icon={view === 'signin' ? 'userCheck' : 'idCard'}
            title={
              <>
                {view === 'signin' && 'Sign in'}
                {view === 'choose' && 'Select a registration method'}
                {view === 'form' && (identity ? 'Confirm your details' : 'Your details')}
              </>
            }
          />
          {view === 'form' && (
            <StepSub>
              {identity ? 'Provide your mobile number and confirm the remaining fields.' : 'Provide the following details to complete registration.'}
            </StepSub>
          )}
        </>
      )}

      {view === 'signin' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
        >
          <div className={`mt-6 ${formGridClass}`}>
            <Field label="Full name" required>
              <input
                className={inputClass}
                value={name}
                autoComplete="name"
                onChange={(e) => {
                  setName(e.target.value);
                  setSearchError('');
                }}
              />
            </Field>
            <Field label="Mobile number" required>
              <input
                className={inputClass}
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setSearchError('');
                }}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit number"
              />
            </Field>
            <Field label="Patient ID" optional>
              <input
                className={inputClass}
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setSearchError('');
                }}
              />
            </Field>
          </div>

          <p className="mt-3 text-xs text-ink-subtle">
            <span className="text-critical-fg">*</span> Required
          </p>

          {searchError && <Alert tone="error" className="mt-4">{searchError}</Alert>}

          <ButtonRow>
            <Button type="submit" icon="login">
              Sign in
            </Button>
            <span className="hidden text-sm text-ink-subtle sm:inline">or</span>
            <Button variant="outline" onClick={openRegister}>
              Register as a new patient
            </Button>
          </ButtonRow>

          <SampleHint label="Sample records:">
            {MOCK_PATIENTS.map((p) => (
              <SampleChip key={p.id} onClick={() => fillDemoRecord(p)}>
                {p.name} · {p.mobile}
              </SampleChip>
            ))}
          </SampleHint>
        </form>
      )}

      {view === 'otp' && pending && (
        <Reveal>
          <div className="-mt-1 mb-4">
            <BackButton
              onClick={() => {
                setView('signin');
                setPending(null);
              }}
            />
          </div>

          <StepHeader icon="shieldCheck" title="Mobile verification" />
          <StepSub>
            A six-digit code has been sent to <strong className="font-semibold text-ink">{maskMobile(pending.mobile)}</strong>, the number registered against
            this record.
          </StepSub>

          <div className="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-border-soft bg-surface-2 p-3.5">
            <IconBadge name="userCheck" size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{pending.name}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                <span className="font-mono">{pending.systemId}</span>
                {pending.age !== null ? <span>{pending.age} yrs</span> : null}
                <span className="capitalize">{pending.gender}</span>
              </div>
            </div>
          </div>

          <OtpInput
            className="mt-6"
            value={otp}
            onChange={(next) => {
              setOtp(next);
              setOtpError('');
            }}
            onComplete={verifyOtp}
            invalid={Boolean(otpError)}
            autoFocus
          />

          {otpError && <Alert tone="error" className="mt-4">{otpError}</Alert>}

          <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {resendIn > 0 ? (
              `A new code may be requested in ${resendIn}s`
            ) : (
              <TextButton
                onClick={() => {
                  setResendIn(30);
                  setAttempts(0);
                  setOtpError('');
                }}
              >
                Request a new code
              </TextButton>
            )}
          </p>

          <SampleHint label="Sample code:">
            <SampleChip
              onClick={() => {
                setOtp(CORRECT_OTP);
                setOtpError('');
                verifyOtp(CORRECT_OTP);
              }}
            >
              {CORRECT_OTP}
            </SampleChip>
          </SampleHint>
        </Reveal>
      )}

      {view === 'choose' && (
        <Reveal className="mt-6">
          <MethodChooser onPick={pickMethod} />
        </Reveal>
      )}

      {view === 'verify' && method !== 'manual' && <IdentityVerify method={method} onVerified={applyIdentity} onBack={() => setView('choose')} />}

      {view === 'form' && (
        <form
          noValidate
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            submitNewPatient();
          }}
        >
          {identity && (
            <Alert tone="success" className="mb-5">
              <strong>Verified via {method === 'aadhaar' ? 'Aadhaar' : 'ABHA'}</strong>
              {method === 'aadhaar' && identity.aadhaar ? ` · ${maskAadhaar(identity.aadhaar)}` : ''}
              {method === 'abha' && identity.abhaAddress ? ` · ${identity.abhaAddress}` : ''}
            </Alert>
          )}

          <div className={formGridClass}>
            <Field label="First name" required verified={locked}>
              {locked ? (
                <LockedValue value={firstName} />
              ) : (
                <input className={inputClass} value={firstName} autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} autoFocus={!identity} />
              )}
            </Field>
            <Field label="Last name" required verified={locked}>
              {locked ? (
                <LockedValue value={lastName} />
              ) : (
                <input className={inputClass} value={lastName} autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} />
              )}
            </Field>
            <Field label="Mobile number" required hint={identity ? `Registered on file: ${identity.maskedMobile}` : undefined}>
              <input
                className={inputClass}
                value={newMobile}
                autoFocus={!!identity}
                onChange={(e) => {
                  setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setFormError('');
                }}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit number"
              />
            </Field>
            <Field
              label="Aadhaar number"
              required={!aadhaarVerified}
              verified={aadhaarVerified}
              hint={aadhaarVerified ? undefined : 'Used to match your record. Only the final four digits are displayed.'}
            >
              {aadhaarVerified ? (
                <LockedValue value={maskAadhaar(identity!.aadhaar!)} />
              ) : (
                <input
                  className={inputClass}
                  value={newAadhaar}
                  onChange={(e) => {
                    setNewAadhaar(formatAadhaar(e.target.value));
                    setFormError('');
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1234 5678 9012"
                />
              )}
            </Field>
          </div>

          {!identity && (
            <TextButton className="mt-3" onClick={() => setShowMore((v) => !v)}>
              {showMore ? 'Hide date of birth and gender' : 'Add date of birth and gender (optional)'}
            </TextButton>
          )}

          {showMore && (
            <Reveal className={`mt-4 ${formGridClass}`}>
              <Field label="Date of birth" verified={locked}>
                {locked ? (
                  <LockedValue value={displayDob(dob)} />
                ) : (
                  <input className={inputClass} type="date" min={dobBounds().min} max={dobBounds().max} value={dob} onChange={(e) => setDob(e.target.value)} />
                )}
              </Field>
              <Field label="Gender" verified={locked}>
                {locked ? (
                  <LockedValue value={GENDER_LABELS[gender]} />
                ) : (
                  <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                )}
              </Field>
            </Reveal>
          )}

          {formError && <Alert tone="error" className="mt-5">{formError}</Alert>}

          <ButtonRow>
            {identity && (
              <Button variant="outline" icon={editing ? 'checkCircle' : 'edit'} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Done editing' : 'Edit details'}
              </Button>
            )}
            <Button type="submit">Save &amp; continue</Button>
          </ButtonRow>
        </form>
      )}

      {view === 'signin' && searched && (
        <Reveal className="mt-7 border-t border-border-soft pt-7">
          {results.length === 0 && (
            <Alert tone="info">No matching record was found. Select a sample record above, or register as a new patient.</Alert>
          )}

          {results.length > 0 && (
            <>
              <p className="mb-3.5 text-sm text-ink-muted">{matchHeading}</p>
              <ul className="flex flex-col gap-3">
                {results.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface-1 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-md sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-ink">{p.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-muted">
                        <span className="font-mono">{p.systemId}</span>
                        <span>DOB {p.dob}</span>
                        {p.age !== null ? <span>{p.age} yrs</span> : null}
                        <span className="capitalize">{p.gender}</span>
                        <span>{p.mobile}</span>
                        {p.aadhaar && <span>Aadhaar {maskAadhaar(p.aadhaar)}</span>}
                      </div>
                    </div>
                    <Button className="shrink-0 max-sm:w-full" onClick={() => startSignIn(p)}>
                      Sign in
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-sm text-ink-subtle">If none of these is your record, register as a new patient above.</p>
            </>
          )}
        </Reveal>
      )}
    </Card>
  );
}
