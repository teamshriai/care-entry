import { useEffect, useState } from 'react';
import { CORRECT_OTP, formatAadhaar } from '../data';
import { DEMO_HINTS, lookupAadhaar, lookupAbha, type DemoIdentity } from './identityData';
import type { IdMethod } from './MethodChooser';
import { Alert, BackButton, Button, ButtonRow, CheckCard, Field, Reveal, SampleChip, SampleHint, StepHeader, StepSub, TextButton } from '../ui/kit';
import { inputClass } from '../ui/classes';
import { OtpInput } from '../ui/OtpInput';
import { cn } from '../ui/cn';
import { toneVar } from '../ui/tones';

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

  const isAadhaar = method === 'aadhaar';
  const label = isAadhaar ? 'Aadhaar' : 'ABHA';

  // The resend countdown ticks only while the code screen is showing.
  useEffect(() => {
    if (phase !== 'otp') return undefined;
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
    setResendIn(30);
    setPhase('otp');
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
      return;
    }
    const found = lookup();
    if (found) onVerified(found);
  }

  return (
    <Reveal>
      <div className="-mt-1 mb-4">
        <BackButton
          onClick={
            phase === 'otp'
              ? () => {
                  setPhase('credential');
                  setOtp('');
                  setError('');
                }
              : onBack
          }
        />
      </div>

      <StepHeader
        icon={phase === 'otp' ? 'shieldCheck' : isAadhaar ? 'idCard' : 'heartPulse'}
        title={phase === 'credential' ? `${label} verification` : 'Enter verification code'}
      />

      {phase === 'otp' && <StepSub>Enter the six-digit code sent to your registered mobile number.</StepSub>}

      {phase === 'credential' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <Field label={isAadhaar ? 'Aadhaar number' : 'ABHA number or address'} required className="mt-6 max-w-md">
            <input
              className={inputClass}
              value={credential}
              autoFocus
              autoComplete="off"
              inputMode={isAadhaar ? 'numeric' : 'text'}
              placeholder={isAadhaar ? '1234 5678 9012' : '14-2345-6789-0123 or name@abdm'}
              onChange={(e) => {
                setCredential(isAadhaar ? formatAadhaar(e.target.value) : e.target.value);
                setError('');
              }}
            />
          </Field>

          <div className="mt-5">
            {/* Until consent is given, a quiet dashed ring marks what is still needed. */}
            <div className={cn('rounded-xl transition-[outline-color]', consent ? 'outline-transparent' : 'outline-2 outline-offset-2 outline-dashed outline-primary-300')}>
              <CheckCard
                checked={consent}
                onToggle={() => {
                  setConsent((v) => !v);
                  setError('');
                }}
              >
                I consent to my {label} details being retrieved and used for the purpose of this registration, and I accept the privacy notice and
                terms of use.
                <span className="text-critical-fg" aria-hidden="true">
                  {' '}
                  *
                </span>
              </CheckCard>
            </div>

            <TextButton className="mt-2" onClick={() => setShowNotice((v) => !v)}>
              {showNotice ? 'Hide privacy notice and terms' : 'Read the privacy notice and terms'}
            </TextButton>

            {showNotice && (
              <Reveal className="mt-2">
                <div style={toneVar('green')} className="tint-surface rounded-xl border p-4">
                <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-ink">Purpose</dt>
                  <dd className="text-ink-muted">Identification and registration for this hospital visit only.</dd>

                  <dt className="font-semibold text-ink">Data retrieved</dt>
                  <dd className="text-ink-muted">
                    {isAadhaar
                      ? 'Name, date of birth, gender and address held against your Aadhaar number.'
                      : 'Name, date of birth, gender and address held in your Ayushman Bharat Health Account.'}
                  </dd>

                  <dt className="font-semibold text-ink">Not collected</dt>
                  <dd className="text-ink-muted">
                    {isAadhaar
                      ? 'Biometric data is never collected. Your Aadhaar number is not stored in full; only the final four digits are displayed.'
                      : 'No clinical records are retrieved from your health account. Only profile details are used.'}
                  </dd>

                  <dt className="font-semibold text-ink">Verification</dt>
                  <dd className="text-ink-muted">
                    A one-time code is sent to the mobile number registered against your {label}. No details are retrieved until that code is verified.
                  </dd>

                  <dt className="font-semibold text-ink">Retention and withdrawal</dt>
                  <dd className="text-ink-muted">
                    Details are retained as part of your patient record. Consent may be withdrawn at any time by contacting reception, after which this
                    registration reverts to manual entry.
                  </dd>

                  <dt className="font-semibold text-ink">Sample data notice</dt>
                  <dd className="text-ink-muted">
                    This build contacts no UIDAI or ABDM service. Lookups read a local sample table and no real identity data is transmitted or stored.
                  </dd>
                </dl>
                </div>
              </Reveal>
            )}
          </div>

          {error && <Alert tone="error" className="mt-4">{error}</Alert>}

          <ButtonRow>
            <Button type="submit" disabled={!consent}>
              Send verification code
            </Button>
          </ButtonRow>
        </form>
      )}

      {phase === 'otp' && (
        <>
          <OtpInput
            className="mt-6"
            value={otp}
            onChange={(next) => {
              setOtp(next);
              setError('');
            }}
            onComplete={verify}
            invalid={Boolean(error)}
            autoFocus
          />

          {error && <Alert tone="error" className="mt-4">{error}</Alert>}

          <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {resendIn > 0 ? `A new code may be requested in ${resendIn}s` : <TextButton onClick={() => setResendIn(30)}>Request a new code</TextButton>}
          </p>
        </>
      )}

      <SampleHint label={`Sample ${phase === 'credential' ? 'values' : 'code'}:`}>
        {phase === 'credential' ? (
          (isAadhaar ? DEMO_HINTS.aadhaar : DEMO_HINTS.abha).map((h) => (
            <SampleChip
              key={h}
              onClick={() => {
                setCredential(h);
                setOtp('');
                setError('');
              }}
            >
              {h}
            </SampleChip>
          ))
        ) : (
          <SampleChip onClick={fillCode}>{CORRECT_OTP}</SampleChip>
        )}
      </SampleHint>
    </Reveal>
  );
}
