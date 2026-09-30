import { useEffect, useRef, useState } from 'react';
import { Icon, IconBadge } from '../components/Icon';
import { trackSpotlight } from '../ui';
import { CORRECT_OTP, formatAadhaar } from '../data';
import { DEMO_HINTS, lookupAadhaar, lookupAbha, type DemoIdentity } from './identityData';
import type { IdMethod } from './MethodChooser';
import './identity.css';

/**
 * Credential entry followed by a one-time code, for either Aadhaar or ABHA.
 * On success it hands back the profile so the caller can prefill its own form.
 */
export function IdentityVerify({
  method,
  onVerified,
  onBack,
}: {
  method: Exclude<IdMethod, 'manual'>;
  onVerified: (identity: DemoIdentity) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<'credential' | 'otp'>('credential');
  const [credential, setCredential] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const boxesRef = useRef<(HTMLInputElement | null)[]>([]);

  const isAadhaar = method === 'aadhaar';
  const label = isAadhaar ? 'Aadhaar' : 'ABHA';

  useEffect(() => {
    if (phase !== 'otp') return;
    boxesRef.current[0]?.focus();
    setResendIn(30);
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  function lookup() {
    return isAadhaar ? lookupAadhaar(credential) : lookupAbha(credential);
  }

  function sendCode() {
    if (isAadhaar && credential.replace(/\D/g, '').length !== 12) {
      setError('An Aadhaar number must contain 12 digits.');
      return;
    }
    if (!isAadhaar && !credential.trim()) {
      setError('Enter your ABHA number or ABHA address.');
      return;
    }
    if (!consent) {
      setError(`Your consent is required before your ${label} details may be used.`);
      return;
    }
    if (!lookup()) {
      setError(`No record found for that ${label}.`);
      return;
    }
    setError('');
    setPhase('otp');
  }

  function handleOtp(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = (otp.slice(0, index) + digit + otp.slice(index + 1)).slice(0, 6);
    setOtp(next);
    setError('');
    if (digit && index < 5) boxesRef.current[index + 1]?.focus();
    if (next.length === 6 && !next.includes(' ')) verify(next);
  }

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) boxesRef.current[index - 1]?.focus();
  }

  function fillCode() {
    setOtp(CORRECT_OTP);
    setError('');
    verify(CORRECT_OTP);
  }

  function verify(code: string) {
    if (code !== CORRECT_OTP) {
      setError(`Incorrect code. This sample build accepts ${CORRECT_OTP}.`);
      setOtp('');
      boxesRef.current[0]?.focus();
      return;
    }
    const found = lookup();
    if (found) onVerified(found);
  }

  return (
    <div className="step-enter">
      <button className="btn-text" onClick={phase === 'otp' ? () => { setPhase('credential'); setOtp(''); setError(''); } : onBack}>
        ← Back
      </button>

      <div className="step-head">
        <IconBadge name={phase === 'otp' ? 'shieldCheck' : isAadhaar ? 'idCard' : 'heartPulse'} />
        <h2 className="step-title">
          {phase === 'credential' ? `${label} verification` : 'Enter verification code'}
        </h2>
      </div>

      {phase === 'otp' && (
        <p className="step-sub">Enter the six-digit code sent to your registered mobile number.</p>
      )}

      {phase === 'credential' && (
        <>
          <label className="field" style={{ maxWidth: 400, marginBottom: 18 }}>
            <span className="field-label">
              {isAadhaar ? 'Aadhaar number' : 'ABHA number or address'}
              <span className="field-required">*</span>
            </span>
            <input
              className="field-input"
              value={credential}
              autoFocus
              inputMode={isAadhaar ? 'numeric' : 'text'}
              placeholder={isAadhaar ? '1234 5678 9012' : '14-2345-6789-0123 or name@abdm'}
              onChange={(e) => {
                setCredential(isAadhaar ? formatAadhaar(e.target.value) : e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
            />
          </label>

          <div className="consent-block">
            {/* Until consent is given, a light runs around the outside of the box. */}
            <div className={`consent-run ${consent ? '' : 'consent-run--active'}`}>
            <button
              className={`choice-card ${consent ? 'choice-card--on' : ''}`}
              onClick={() => { setConsent((v) => !v); setError(''); }}
              onMouseMove={trackSpotlight}
              aria-pressed={consent}
            >
              <span className="checkbox-box">
                {consent && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span>
                I consent to my {label} details being retrieved and used for the purpose of this registration, and I
                accept the privacy notice and terms of use.
                <span className="field-required">*</span>
              </span>
            </button>
            </div>

            <button className="btn-text consent-toggle" onClick={() => setShowNotice((v) => !v)}>
              {showNotice ? 'Hide privacy notice and terms' : 'Read the privacy notice and terms'}
            </button>

            {showNotice && (
              <div className="consent-notice step-enter">
                <dl>
                  <dt>Purpose</dt>
                  <dd>Identification and registration for this hospital visit only.</dd>

                  <dt>Data retrieved</dt>
                  <dd>
                    {isAadhaar
                      ? 'Name, date of birth, gender and address held against your Aadhaar number.'
                      : 'Name, date of birth, gender and address held in your Ayushman Bharat Health Account.'}
                  </dd>

                  <dt>Not collected</dt>
                  <dd>
                    {isAadhaar
                      ? 'Biometric data is never collected. Your Aadhaar number is not stored in full; only the final four digits are displayed.'
                      : 'No clinical records are retrieved from your health account. Only profile details are used.'}
                  </dd>

                  <dt>Verification</dt>
                  <dd>
                    A one-time code is sent to the mobile number registered against your {label}. No details are
                    retrieved until that code is verified.
                  </dd>

                  <dt>Retention and withdrawal</dt>
                  <dd>
                    Details are retained as part of your patient record. Consent may be withdrawn at any time by
                    contacting reception, after which this registration reverts to manual entry.
                  </dd>

                  <dt>Sample data notice</dt>
                  <dd>
                    This build contacts no UIDAI or ABDM service. Lookups read a local sample table and no real identity
                    data is transmitted or stored.
                  </dd>
                </dl>
              </div>
            )}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={sendCode} disabled={!consent}>Send verification code</button>
          </div>
        </>
      )}

      {phase === 'otp' && (
        <>
          <div className="otp-row" style={{ justifyContent: 'flex-start' }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                ref={(el) => { boxesRef.current[i] = el; }}
                className="otp-box"
                maxLength={1}
                inputMode="numeric"
                value={otp[i] ?? ''}
                onChange={(e) => handleOtp(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
              />
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

          <p className="identity-resend">
            {resendIn > 0 ? `A new code may be requested in ${resendIn}s` : (
              <button className="btn-text" onClick={() => setResendIn(30)}>Request a new code</button>
            )}
          </p>
        </>
      )}

      <div className="demo-hint">
        <Icon name="lock" size={14} />
        <span>
          <strong>Sample {phase === 'credential' ? 'values' : 'code'}:</strong>
          {phase === 'credential'
            ? (isAadhaar ? DEMO_HINTS.aadhaar : DEMO_HINTS.abha).map((h) => (
                <button
                  key={h}
                  className="hint-chip"
                  onClick={() => { setCredential(h); setOtp(''); setError(''); }}
                >
                  {h}
                </button>
              ))
            : (
              <button className="hint-chip" onClick={fillCode}>{CORRECT_OTP}</button>
            )}
        </span>
      </div>
    </div>
  );
}
