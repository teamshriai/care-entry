import { useEffect, useRef, useState } from 'react';
import { CORRECT_OTP, MAX_OTP_ATTEMPTS, MOCK_PATIENTS, formatAadhaar, generateSystemId, maskAadhaar, maskMobile } from '../data';
import { Icon, IconBadge } from './Icon';
import { LockedValue } from './LockedValue';
import { trackSpotlight } from '../ui';
import { MethodChooser, type IdMethod } from '../identity/MethodChooser';
import { IdentityVerify } from '../identity/IdentityVerify';
import type { DemoIdentity, RegistrationOrigin } from '../identity/identityData';
import type { Gender, MockPatient } from '../types';

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
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (view !== 'otp') return;
    otpRefs.current[0]?.focus();
    setResendIn(30);
    const t = setInterval(() => setResendIn((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [view]);

  function startSignIn(p: MockPatient) {
    setPending(p);
    setOtp('');
    setOtpError('');
    setAttempts(0);
    setView('otp');
  }

  function verifyOtp(code: string) {
    if (code === CORRECT_OTP) {
      if (pending) onSignIn(pending);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setOtp('');
    otpRefs.current[0]?.focus();
    setOtpError(
      next >= MAX_OTP_ATTEMPTS
        ? 'Attempt limit reached. Request a new code.'
        : `Incorrect code. ${MAX_OTP_ATTEMPTS - next} attempts remaining.`
    );
  }

  function handleOtpDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = (otp.slice(0, index) + digit + otp.slice(index + 1)).slice(0, 6);
    setOtp(next);
    setOtpError('');
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.length === 6) verifyOtp(next);
  }

  function handleOtpKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
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
    if (mobile.length !== 10) {
      setSearchError('Enter a 10-digit mobile number.');
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
    if (newMobile.length !== 10) {
      setFormError('Enter a 10-digit mobile number.');
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
    <div className="card step-enter">
      {view !== 'verify' && view !== 'otp' && (
        <>
          {view !== 'signin' && (
            <div className="step-nav">
              <button className="btn-text" onClick={() => setView(view === 'choose' ? 'signin' : 'choose')}>
                ← Back
              </button>
            </div>
          )}
          <div className="step-head">
            <IconBadge name={view === 'signin' ? 'userCheck' : 'idCard'} />
            <h2 className="step-title">
              {view === 'signin' && 'Sign in'}
              {view === 'choose' && 'Select a registration method'}
              {view === 'form' && (identity ? 'Confirm your details' : 'Your details')}
            </h2>
          </div>
          {view === 'form' && (
            <p className="step-sub">
              {identity
                ? 'Provide your mobile number and confirm the remaining fields.'
                : 'Provide the following details to complete registration.'}
            </p>
          )}
        </>
      )}

      {view === 'signin' && (
        <>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <label className="field">
              <span className="field-label">Full name<span className="field-required">*</span></span>
              <input className="field-input" value={name} onChange={(e) => { setName(e.target.value); setSearchError(''); }} />
            </label>
            <label className="field">
              <span className="field-label">Mobile number<span className="field-required">*</span></span>
              <input
                className="field-input"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setSearchError(''); }}
                inputMode="numeric"
                placeholder="10-digit number"
              />
            </label>
            <label className="field">
              <span className="field-label">Patient ID</span>
              <input className="field-input" placeholder="Optional" value={id} onChange={(e) => { setId(e.target.value); setSearchError(''); }} />
            </label>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '2px 0 16px' }}>
            <span className="field-required" style={{ marginLeft: 0 }}>*</span> Required
          </p>

          {searchError && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>{searchError}</div>
          )}

          <div className="btn-row" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSignIn}>
              <span className="btn-ico"><Icon name="login" size={15} /></span>
              Sign In
            </button>
            <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>or</span>
            <button className="btn btn-secondary" onClick={openRegister}>Register as a new patient</button>
          </div>

          <div className="demo-hint">
            <Icon name="lock" size={14} />
            <span>
              <strong>Sample records:</strong>
              {MOCK_PATIENTS.map((p) => (
                <button key={p.id} className="hint-chip" onClick={() => fillDemoRecord(p)}>
                  {p.name} · {p.mobile}
                </button>
              ))}
            </span>
          </div>
        </>
      )}

      {view === 'otp' && pending && (
        <div className="step-enter">
          <button className="btn-text" onClick={() => { setView('signin'); setPending(null); }}>← Back</button>

          <div className="step-head">
            <IconBadge name="shieldCheck" />
            <h2 className="step-title">Mobile verification</h2>
          </div>
          <p className="step-sub">
            A six-digit code has been sent to{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{maskMobile(pending.mobile)}</strong>, the number
            registered against this record.
          </p>

          <div className="signin-summary">
            <IconBadge name="userCheck" size={34} />
            <div>
              <div className="signin-summary-name">{pending.name}</div>
              <div className="signin-summary-meta">
                <span>{pending.systemId}</span>
                <span>{pending.age} yrs</span>
                <span>{pending.gender}</span>
              </div>
            </div>
          </div>

          <div className="otp-row" style={{ justifyContent: 'flex-start' }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                className="otp-box"
                maxLength={1}
                inputMode="numeric"
                value={otp[i] ?? ''}
                onChange={(e) => handleOtpDigit(i, e.target.value)}
                onKeyDown={(e) => handleOtpKey(i, e)}
              />
            ))}
          </div>

          {otpError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{otpError}</div>}

          <p className="identity-resend">
            {resendIn > 0 ? `A new code may be requested in ${resendIn}s` : (
              <button className="btn-text" onClick={() => { setResendIn(30); setAttempts(0); setOtpError(''); }}>
                Request a new code
              </button>
            )}
          </p>

          <div className="demo-hint">
            <Icon name="lock" size={14} />
            <span>
              <strong>Sample code:</strong>
              <button className="hint-chip" onClick={() => { setOtp(CORRECT_OTP); setOtpError(''); verifyOtp(CORRECT_OTP); }}>
                {CORRECT_OTP}
              </button>
            </span>
          </div>
        </div>
      )}

      {view === 'choose' && (
        <div className="step-enter">
          <MethodChooser onPick={pickMethod} />
        </div>
      )}

      {view === 'verify' && method !== 'manual' && (
        <IdentityVerify
          method={method}
          onVerified={applyIdentity}
          onBack={() => setView('choose')}
        />
      )}

      {view === 'form' && (
        <div>
          {identity && (
            <div className="prefill-banner">
              <span className="prefill-icon">
                <Icon name="checkCircle" size={16} />
              </span>
              <span>
                <strong>Verified via {method === 'aadhaar' ? 'Aadhaar' : 'ABHA'}</strong>
                {method === 'aadhaar' && identity.aadhaar ? ` · ${maskAadhaar(identity.aadhaar)}` : ''}
                {method === 'abha' && identity.abhaAddress ? ` · ${identity.abhaAddress}` : ''}
              </span>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 8 }}>
            <label className="field">
              <span className="field-label">
                First name<span className="field-required">*</span>
                {locked && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
              </span>
              {locked ? (
                <LockedValue value={firstName} />
              ) : (
                <input className="field-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus={!identity} />
              )}
            </label>
            <label className="field">
              <span className="field-label">
                Last name<span className="field-required">*</span>
                {locked && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
              </span>
              {locked ? (
                <LockedValue value={lastName} />
              ) : (
                <input className="field-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              )}
            </label>
            <label className="field">
              <span className="field-label">Mobile number<span className="field-required">*</span></span>
              <input
                className="field-input"
                value={newMobile}
                autoFocus={!!identity}
                onChange={(e) => { setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setFormError(''); }}
                inputMode="numeric"
                placeholder="10-digit number"
              />
              {identity && <span className="field-hint">Registered on file: {identity.maskedMobile}</span>}
            </label>
            <label className="field">
              <span className="field-label">
                Aadhaar number
                {aadhaarVerified ? (
                  <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>
                ) : (
                  <span className="field-required">*</span>
                )}
              </span>
              {aadhaarVerified ? (
                <div className="locked-field">
                  <Icon name="lock" size={14} />
                  <span>{maskAadhaar(identity!.aadhaar!)}</span>
                </div>
              ) : (
                <input
                  className="field-input"
                  value={newAadhaar}
                  onChange={(e) => { setNewAadhaar(formatAadhaar(e.target.value)); setFormError(''); }}
                  inputMode="numeric"
                  placeholder="1234 5678 9012"
                />
              )}
            </label>
          </div>
          {!aadhaarVerified && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '10px 0 0' }}>
              Used to match your record. Only the final four digits are displayed.
            </p>
          )}

          {!identity && (
            <button className="btn-text" style={{ marginBottom: showMore ? 16 : 20 }} onClick={() => setShowMore((v) => !v)}>
              {showMore ? 'Hide date of birth and gender' : 'Add date of birth and gender (optional)'}
            </button>
          )}

          {showMore && (
            <div className="grid-2" style={{ marginTop: identity ? 20 : 0, marginBottom: 20 }}>
              <label className="field">
                <span className="field-label">
                  Date of birth
                  {locked && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
                </span>
                {locked ? (
                  <LockedValue value={displayDob(dob)} />
                ) : (
                  <input className="field-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                )}
              </label>
              <label className="field">
                <span className="field-label">
                  Gender
                  {locked && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
                </span>
                {locked ? (
                  <LockedValue value={GENDER_LABELS[gender]} />
                ) : (
                  <select className="field-input" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </label>
            </div>
          )}

          {formError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{formError}</div>}

          <div className="btn-row">
            {identity && (
              <button className="btn btn-secondary" onClick={() => setEditing((v) => !v)}>
                <span className="btn-ico"><Icon name={editing ? 'checkCircle' : 'edit'} size={15} /></span>
                {editing ? 'Done editing' : 'Edit details'}
              </button>
            )}
            <button className="btn btn-primary" onClick={submitNewPatient}>Save &amp; continue</button>
          </div>
        </div>
      )}

      {view === 'signin' && searched && (
        <div style={{ marginTop: 26, borderTop: '1px solid var(--line)', paddingTop: 26 }}>
          {results.length === 0 && (
            <div className="alert alert-info">
              <span>No matching record was found. Select a sample record above, or register as a new patient.</span>
            </div>
          )}

          {results.length > 0 && (
            <>
              <p style={{ color: 'var(--ink-2)', fontSize: 13.5, marginBottom: 14 }}>{matchHeading}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((p) => (
                  <div key={p.id} className="choice-card" onMouseMove={trackSpotlight} style={{ alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 22px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16.5, marginBottom: 5 }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--ink-2)', fontSize: 13 }}>
                        <span>{p.systemId}</span>
                        <span>DOB {p.dob}</span>
                        <span>{p.age} yrs</span>
                        <span>{p.gender}</span>
                        <span>{p.mobile}</span>
                        {p.aadhaar && <span>Aadhaar {maskAadhaar(p.aadhaar)}</span>}
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => startSignIn(p)}>Sign in</button>
                  </div>
                ))}
              </div>
              <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 14 }}>
                If none of these is your record, register as a new patient above.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
