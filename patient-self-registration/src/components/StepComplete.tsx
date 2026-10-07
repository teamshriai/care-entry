import { Confetti } from './Confetti';
import type { MockPatient } from '../types';
import { Button, ButtonRow, Card, StepNav, StepSub, SuccessMark, SummaryList, SummaryRow } from '../ui/kit';

export function StepComplete({
  patient,
  encounterCode,
  completedAt,
  onRestart,
  onBack,
}: {
  patient: MockPatient;
  encounterCode: string;
  completedAt: string;
  onRestart: () => void;
  onBack: () => void;
}) {
  return (
    <Card center>
      <Confetti />
      <StepNav onBack={onBack} />

      <SuccessMark />
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Registration complete</h2>
      <StepSub className="mx-auto mb-7 max-w-md">Your details have been recorded and sent to the care team.</StepSub>

      <SummaryList className="mx-auto max-w-lg">
        <SummaryRow icon="userCheck" label="Name" value={patient.name} />
        <SummaryRow icon="idCard" label="Patient ID" value={patient.systemId} mono />
        <SummaryRow icon="activity" label="Visit reference" value={encounterCode} mono />
        <SummaryRow icon="calendar" label="Submitted" value={completedAt} />
      </SummaryList>

      <ButtonRow className="justify-center">
        <Button onClick={onRestart}>Back to sign in</Button>
      </ButtonRow>
    </Card>
  );
}
