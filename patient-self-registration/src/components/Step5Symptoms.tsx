import { useRef, useState } from 'react';
import { HISTORY_DEFS, SYMPTOM_DEFS } from '../data';
import { Icon, IconBadge } from './Icon';
import { trackSpotlight } from '../ui';
import type { SymptomsDraft } from '../drafts';
import type { Hypertension } from '../types';

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
    <div className="card step-enter">
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
      <div className="step-head">
        <IconBadge name="activity" />
        <h2 className="step-title">Current symptoms</h2>
      </div>
      <p className="step-sub">
        Select all symptoms you are currently experiencing.{checkedCount > 0 ? ` ${checkedCount} selected.` : ''}
      </p>

      <div className="grid-2" style={{ marginBottom: 28 }}>
        {SYMPTOM_DEFS.map((s) => (
          <Choice key={s.key} label={s.label} checked={!!symptoms[s.key]} onToggle={() => toggle(s.key)} />
        ))}
      </div>

      <hr className="rule" />
      <h3 className="section-title">Hypertension history</h3>
      <p className="section-sub">Select "Not known" if this information is unavailable.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {(['yes', 'no', 'unknown'] as Hypertension[]).map((v) => (
          <button key={v} className={`pill ${hypertension === v ? 'pill-active' : ''}`} onClick={() => onChange({ hypertension: v })}>
            {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not known'}
          </button>
        ))}
      </div>

      {hypertension === 'yes' && (
        <div className="grid-2 step-enter">
          <label className="field">
            <span className="field-label">Date of diagnosis (if known)</span>
            <input className="field-input" type="date" value={htOnsetDate} onChange={(e) => onChange({ htOnsetDate: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Current medication (if applicable)</span>
            <input className="field-input" value={htMedication} onChange={(e) => onChange({ htMedication: e.target.value })} placeholder="optional" />
          </label>
        </div>
      )}

      <hr className="rule" />
      <h3 className="section-title">Medical History</h3>
      <p className="section-sub">Please indicate if you have been diagnosed with any of the following.</p>

      <div className="grid-2">
        {HISTORY_DEFS.map((h) => (
          <Choice key={h.key} label={h.label} checked={!!history[h.key]} onToggle={() => toggleHistory(h.key)} />
        ))}
      </div>

      <hr className="rule" />
      <h3 className="section-title">Previous hospital visit</h3>
      <p className="section-sub">Optional.</p>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <label className="field">
          <span className="field-label field-icon-row"><Icon name="calendar" size={14} /> Date of last visit</span>
          <input className="field-input" type="date" value={lastVisitDate} onChange={(e) => onChange({ lastVisitDate: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label field-icon-row"><Icon name="hospital" size={14} /> Hospital name</span>
          <input
            className="field-input"
            value={lastVisitHospital}
            onChange={(e) => onChange({ lastVisitHospital: e.target.value })}
            placeholder="Name of the hospital or clinic"
          />
        </label>
      </div>

      <hr className="rule" />
      <h3 className="section-title">Previous records</h3>
      <p className="section-sub">
        Optional. Discharge summaries, scan reports or prescriptions, for the doctor to review.
      </p>

      <RecordUpload files={records} onChange={(files) => onChange({ records: files })} />

      <button className="btn btn-primary" style={{ marginTop: 30 }} onClick={onContinue}>Save and continue</button>
    </div>
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
      <div
        className={`dropzone ${dragging ? 'dropzone--over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <span className="dropzone-icon">
          <Icon name="upload" size={18} />
        </span>
        <span className="dropzone-text">
          <strong>Choose files</strong> or drag them here
        </span>
        <span className="dropzone-hint">PDF, JPG, PNG or HEIC · up to 10 MB each</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="dropzone-input"
          onChange={(e) => { add(e.target.files); e.target.value = ''; }}
        />
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.size}`} className="file-row">
              <span className="file-icon">
                <Icon name="file" size={15} />
              </span>
              <span className="file-meta">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatBytes(file.size)}</span>
              </span>
              <button className="file-remove" onClick={() => remove(i)} aria-label={`Remove ${file.name}`}>
                <Icon name="close" size={14} />
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

function Choice({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      className={`choice-card ${checked ? 'choice-card--on' : ''}`}
      onClick={onToggle}
      onMouseMove={trackSpotlight}
      aria-pressed={checked}
    >
      <span className="checkbox-box">
        {checked && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
