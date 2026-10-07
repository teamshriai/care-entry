import { computeElapsed } from '../data';
import type { LkwDraft } from '../drafts';
import { Alert, Button, ButtonRow, Card, Field, Reveal, StepHeader, StepNav, StepSub } from '../ui/kit';
import { formGridClass, inputClass } from '../ui/classes';

/** How long ago, coloured by urgency: under 3h fine, 3–4.5h attention, beyond critical. */
const ELAPSED_TONE = { ok: 'success', warning: 'warning', critical: 'error', info: 'info' } as const;

export function Step6Lkw({
  draft,
  onChange,
  onComplete,
  onBack,
}: {
  draft: LkwDraft;
  onChange: (patch: Partial<LkwDraft>) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const { date, time } = draft;
  const elapsed = computeElapsed(date, time);

  return (
    <Card>
      <StepNav onBack={onBack} />
      <StepHeader icon="clock" title="Last known well" />
      <StepSub>
        The last time you were known to be free of symptoms. An approximate time is acceptable, and this may be left blank if not known.
      </StepSub>

      <div className={`mt-6 ${formGridClass}`}>
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(e) => onChange({ date: e.target.value })} />
        </Field>
        <Field label="Time">
          <input className={inputClass} type="time" value={time} onChange={(e) => onChange({ time: e.target.value })} />
        </Field>
      </div>

      {elapsed && (
        <Reveal className="mt-5">
          <Alert tone={ELAPSED_TONE[elapsed.level]} icon="clock">
            Time elapsed since last known well: <strong>{elapsed.label}</strong>
          </Alert>
        </Reveal>
      )}

      <ButtonRow>
        <Button onClick={onComplete}>Complete registration</Button>
      </ButtonRow>
    </Card>
  );
}
