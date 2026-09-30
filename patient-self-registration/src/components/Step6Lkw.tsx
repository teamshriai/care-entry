import { computeElapsed } from '../data';
import { IconBadge } from './Icon';
import type { LkwDraft } from '../drafts';

const ELAPSED_COLORS = { ok: 'var(--ok)', warning: 'var(--warn)', critical: 'var(--danger)', info: 'var(--ink-2)' };
const ELAPSED_BG = { ok: 'var(--ok-soft)', warning: 'var(--warn-soft)', critical: 'var(--danger-soft)', info: 'var(--sand-2)' };

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
    <div className="card step-enter">
      <div className="step-nav">
        <button className="btn-text" onClick={onBack}>← Back</button>
      </div>
      <div className="step-head">
        <IconBadge name="clock" />
        <h2 className="step-title">Last known well</h2>
      </div>
      <p className="step-sub">The last time you were known to be free of symptoms. An approximate time is acceptable, and this may be left blank if not known.</p>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <label className="field">
          <span className="field-label">Date</span>
          <input className="field-input" type="date" value={date} onChange={(e) => onChange({ date: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Time</span>
          <input className="field-input" type="time" value={time} onChange={(e) => onChange({ time: e.target.value })} />
        </label>
      </div>

      {elapsed && (
        <div
          className="alert step-enter"
          style={{ color: ELAPSED_COLORS[elapsed.level], background: ELAPSED_BG[elapsed.level], border: `1px solid ${ELAPSED_COLORS[elapsed.level]}33` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <span>Time elapsed since last known well: <strong>{elapsed.label}</strong></span>
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={onComplete}>
        Complete registration
      </button>
    </div>
  );
}
