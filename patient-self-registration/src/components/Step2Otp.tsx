import { useEffect, useRef, useState } from 'react';
import { CORRECT_OTP, MAX_OTP_ATTEMPTS, maskMobile } from '../data';
import { Icon, IconBadge } from './Icon';

export function Step2Otp({
  mobile,
  onVerified,
  onBack,
  onNext,
  nextDisabled,
}: {
  mobile: string;
  onVerified: () => void;
  onBack: () => void;
  /** Forward navigation; disabled until this step has been completed once. */
  onNext?: () => void;
  nextDisabled?: boolean;
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : s)), 1000);
    return () => clearInterval(t);
  }, []);

  function verify(joined: string) {
    if (joined === CORRECT_OTP) {
      setVerifying(true);
      setTimeout(onVerified, 350); // brief celebratory pause
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setOtp(['', '', '', '', '', '']);
    inputsRef.current[0]?.focus();
    setError(
      next >= MAX_OTP_ATTEMPTS
        ? 'Attempt limit reached. Request a new code.'
        : `Incorrect code. ${MAX_OTP_ATTEMPTS - next} attempts remaining.`
    );
  }

  function handleChange(i: number, raw: string) {
    const v = raw.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    setError('');
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
    if (v && i === 5) {
      const joined = next.join('');
      if (joined.length === 6) verify(joined);
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }

  function handleResend() {
    setOtp(['', '', '', '', '', '']);
    setAttempts(0);
    setError('');
    setResendSeconds(30);
    inputsRef.current[0]?.focus();
  }

  return (
    <div className="card step-enter card--center" style={{ textAlign: 'center' }}>
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
      <div className="step-head" style={{ justifyContent: 'center' }}>
        <IconBadge name="shieldCheck" />
        <h2 className="step-title">Mobile verification</h2>
      </div>
      <p className="step-sub" style={{ margin: '10px auto 28px' }}>
        A six-digit verification code has been sent to <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{maskMobile(mobile)}</strong>
      </p>

      <div className="otp-row">
        {otp.map((v, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            className={`otp-box ${verifying ? 'otp-box--success' : ''}`}
            maxLength={1}
            inputMode="numeric"
            value={v}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ justifyContent: 'center', marginBottom: 16 }}>{error}</div>}
      {verifying && <div className="alert alert-success" style={{ justifyContent: 'center', marginBottom: 16 }}>Verified!</div>}

      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>
        {resendSeconds <= 0 ? (
          <button className="btn-text" onClick={handleResend}>Request a new code</button>
        ) : (
          <span>A new code may be requested in 0:{resendSeconds < 10 ? '0' + resendSeconds : resendSeconds}</span>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Sample code: <strong>123456</strong></p>
    </div>
  );
}
