import { Badge, Button, ButtonRow, Card, Field, StepHeader, StepNav, StepSub } from '../ui/kit';
import { inputClass } from '../ui/classes';

export function Step4Abha({
  abhaId,
  onChange,
  onContinue,
  onBack,
  onNext,
  nextDisabled,
}: {
  abhaId: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Forward navigation; disabled until this step has been completed once. */
  onNext?: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <Card>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
      <StepHeader icon="heartPulse" title="ABHA" badge={<Badge>Optional</Badge>} />
      <StepSub>Link an Ayushman Bharat Health Account. This may also be added after registration.</StepSub>

      <Field label="ABHA number or ABHA address" className="mt-6 max-w-md">
        <input className={inputClass} value={abhaId} onChange={(e) => onChange(e.target.value)} placeholder="14-2345-6789-0123 or name@abdm" autoComplete="off" />
      </Field>

      <ButtonRow>
        <Button onClick={onContinue}>{abhaId.trim() ? 'Save and continue' : 'Continue without ABHA'}</Button>
      </ButtonRow>
    </Card>
  );
}
