import { useRef, useState } from 'react';
import { HISTORY_DEFS, SYMPTOM_DEFS } from '../data';
import { Icon, IconBadge } from './Icon';
import type { SymptomsDraft } from '../drafts';
import type { Hypertension } from '../types';
import { Alert, Button, ButtonRow, Card, CheckCard, ChipGroup, Field, Reveal, Section, StepHeader, StepNav, StepSub } from '../ui/kit';
import { formGridClass, inputClass } from '../ui/classes';
import { cn } from '../ui/cn';
import { toneVar } from '../ui/tones';

export function Step5Symptoms({
  draft,
  onChange,
  onContinue,
  onBack,
  onNext,
  nextDisabled,
}: {
  draft: SymptomsDraft;
  onChange: (patch: Partial<SymptomsDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Forward navigation; disabled until this step has been completed once. */
  onNext?: () => void;
  nextDisabled?: boolean;
}) {
  const { symptoms, history, hypertension, htOnsetDate, htMedication, lastVisitDate, lastVisitHospital, records } = draft;

  const checkedCount = Object.values(symptoms).filter(Boolean).length;

  function toggle(key: string) {
    onChange({ symptoms: { ...symptoms, [key]: !symptoms[key] } });
  }

  function toggleHistory(key: string) {
    onChange({ history: { ...history, [key]: !history[key] } });
  }

  return (
    <Card tone="pink">
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
      <StepHeader icon="activity" title="Current symptoms" />
      <StepSub>
        Select all symptoms you are currently experiencing.
        <span aria-live="polite">{checkedCount > 0 ? ` ${checkedCount} selected.` : ''}</span>
      </StepSub>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SYMPTOM_DEFS.map((s) => (
          <CheckCard key={s.key} checked={!!symptoms[s.key]} onToggle={() => toggle(s.key)}>
            {s.label}
          </CheckCard>
        ))}
      </div>

      <Section title="Hypertension history" sub='Select "Not known" if this information is unavailable.'>
        <ChipGroup<Hypertension>
          label="Hypertension history"
          value={hypertension}
          onChange={(v) => onChange({ hypertension: v })}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'unknown', label: 'Not known' },
          ]}
        />

        {hypertension === 'yes' && (
          <Reveal className={`mt-4 ${formGridClass}`}>
            <Field label="Date of diagnosis" optional>
              <input className={inputClass} type="date" value={htOnsetDate} onChange={(e) => onChange({ htOnsetDate: e.target.value })} />
            </Field>
            <Field label="Current medication" optional>
              <input className={inputClass} value={htMedication} onChange={(e) => onChange({ htMedication: e.target.value })} />
            </Field>
          </Reveal>
        )}
      </Section>

      <Section title="Medical history" sub="Please indicate if you have been diagnosed with any of the following.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HISTORY_DEFS.map((h) => (
            <CheckCard key={h.key} checked={!!history[h.key]} onToggle={() => toggleHistory(h.key)}>
              {h.label}
            </CheckCard>
          ))}
        </div>
      </Section>

      <Section title="Previous hospital visit" sub="Optional.">
        <div className={formGridClass}>
          <Field label="Date of last visit" icon="calendar">
            <input className={inputClass} type="date" value={lastVisitDate} onChange={(e) => onChange({ lastVisitDate: e.target.value })} />
          </Field>
          <Field label="Hospital name" icon="hospital">
            <input
              className={inputClass}
              value={lastVisitHospital}
              onChange={(e) => onChange({ lastVisitHospital: e.target.value })}
              placeholder="Name of the hospital or clinic"
            />
          </Field>
        </div>
      </Section>

      <Section title="Previous records" sub="Optional. Discharge summaries, scan reports or prescriptions, for the doctor to review.">
        <RecordUpload files={records} onChange={(files) => onChange({ records: files })} />
      </Section>

      <ButtonRow className="mt-8">
        <Button onClick={onContinue}>Save and continue</Button>
      </ButtonRow>
    </Card>
  );
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.heic';

function RecordUpload({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function add(incoming: FileList | null) {
    if (!incoming) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_FILE_BYTES) rejected.push(file.name);
      else if (!files.some((f) => f.name === file.name && f.size === file.size)) accepted.push(file);
    }
    setError(rejected.length ? `${rejected.join(', ')} exceeds the 10 MB limit.` : '');
    if (accepted.length) onChange([...files, ...accepted]);
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
    setError('');
  }

  return (
    <div>
      {/* A drop zone washed in blue; it deepens while a file is dragged over it. */}
      <div
        style={toneVar('blue')}
        className={cn(
          'focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
          dragging
            ? 'border-primary-600 bg-[color-mix(in_oklab,var(--tone)_16%,var(--color-surface-1))]'
            : 'border-[color-mix(in_oklab,var(--tone)_35%,var(--color-border))] bg-[radial-gradient(70%_120%_at_50%_0%,color-mix(in_oklab,var(--tone)_12%,transparent),transparent_70%)] bg-surface-1 hover:border-[color-mix(in_oklab,var(--tone)_60%,var(--color-border))]',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload previous records"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="chip-solid mb-1 flex h-11 w-11 items-center justify-center rounded-full">
          <Icon name="upload" size={18} />
        </span>
        <span className="text-sm text-ink-muted">
          <strong className="font-semibold text-primary-text">Choose files</strong> or drag them here
        </span>
        <span className="text-xs text-ink-subtle">PDF, JPG, PNG or HEIC · up to 10 MB each</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <Alert tone="error" className="mt-3">{error}</Alert>}

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border-soft bg-surface-1 py-1 pl-3 pr-1 motion-safe:animate-[fadeIn_200ms_ease-out]"
            >
              <IconBadge name="file" size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
                <span className="block text-xs text-ink-subtle">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                className="focus-ring tap-target shrink-0 rounded-lg text-ink-subtle transition-colors hover:bg-critical-bg hover:text-critical-fg"
                onClick={() => remove(i)}
                aria-label={`Remove ${file.name}`}
              >
                <Icon name="close" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
