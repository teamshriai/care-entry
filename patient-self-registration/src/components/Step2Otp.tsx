import { useEffect, useRef, useState } from 'react';
import { CORRECT_OTP, MAX_OTP_ATTEMPTS, maskMobile } from '../data';
import { Alert, Card, SampleChip, SampleHint, StepHeader, StepNav, StepSub, TextButton } from '../ui/kit';
import { OtpInput } from '../ui/OtpInput';

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
  const [otp, setOtp] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const done = useRef<number | undefined>(undefined);

  useEffect(() => {
    const t = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : s)), 1000);
    return () => {
      clearInterval(t);
      window.clearTimeout(done.current);
    };
  }, []);

  function verify(code: string) {
    if (attempts >= MAX_OTP_ATTEMPTS) {
      setError('Attempt limit reached. Request a new code.');
      setOtp('');
      return;
    }
    if (code === CORRECT_OTP) {
      setVerifying(true);
      done.current = window.setTimeout(onVerified, 350); // a brief beat to show the success state
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setOtp('');
    setError(next >= MAX_OTP_ATTEMPTS ? 'Attempt limit reached. Request a new code.' : `Incorrect code. ${MAX_OTP_ATTEMPTS - next} attempts remaining.`);
  }

  function handleResend() {
    setOtp('');
    setAttempts(0);
    setError('');
    setResendSeconds(30);
  }

  return (
    <Card center tone="green">
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
      <StepHeader icon="shieldCheck" title="Mobile verification" center />
      <StepSub className="mx-auto mb-7 max-w-md">
        A six-digit verification code has been sent to <strong className="font-semibold text-ink">{maskMobile(mobile)}</strong>
      </StepSub>

      <OtpInput
        value={otp}
        onChange={(next) => {
          setOtp(next);
          setError('');
        }}
        onComplete={verify}
        success={verifying}
        invalid={Boolean(error)}
        autoFocus
        className="mx-auto"
      />

      <div className="mx-auto mt-5 max-w-md space-y-3 text-left">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {verifying ? <Alert tone="success">Verified</Alert> : null}
      </div>

      <div className="mt-4 text-sm text-ink-muted" aria-live="polite">
        {resendSeconds <= 0 ? (
          <TextButton onClick={handleResend}>Request a new code</TextButton>
        ) : (
          <span>A new code may be requested in {resendSeconds}s</span>
        )}
      </div>

      <SampleHint label="Sample code:">
        <SampleChip
          onClick={() => {
            setOtp(CORRECT_OTP);
            verify(CORRECT_OTP);
          }}
        >
          {CORRECT_OTP}
        </SampleChip>
      </SampleHint>
    </Card>
  );
}
