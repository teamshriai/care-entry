import { useEffect, useState } from 'react';
import '../App.css';
import '../identity/identity.css';
import { Icon, IconBadge } from '../components/Icon';
import { INDIAN_STATES, generateSystemId, maskAadhaar } from '../data';
import { MethodChooser, type IdMethod } from '../identity/MethodChooser';
import { IdentityVerify } from '../identity/IdentityVerify';
import type { DemoIdentity } from '../identity/identityData';
import type { Gender } from '../types';
import '../design-system.css';
import logo from '../logo.png'

type Stage = 'choose' | 'verify' | 'form' | 'done';

const BLANK = {
  name: '',
  dob: '',
  gender: 'unknown' as Gender,
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const STAGES: { key: Stage; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'choose', label: 'Registration method', icon: 'userCheck' },
  { key: 'verify', label: 'Identity verification', icon: 'shieldCheck' },
  { key: 'form', label: 'Confirm details', icon: 'idCard' },
  { key: 'done', label: 'Registered', icon: 'checkCircle' },
];

export default function DemoApp() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('shri-theme-v3') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try {
      localStorage.setItem('shri-theme-v3', dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable — the theme still applies for this session */
    }
  }, [dark]);

  const [stage, setStage] = useState<Stage>('choose');
  const [method, setMethod] = useState<IdMethod>('manual');
  const [identity, setIdentity] = useState<DemoIdentity | null>(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');

  function reset() {
    setStage('choose');
    setMethod('manual');
    setIdentity(null);
    setForm(BLANK);
    setError('');
    setPatientId('');
  }

  function pickMethod(m: IdMethod) {
    setMethod(m);
    setError('');
    if (m === 'manual') {
      setIdentity(null);
      setForm(BLANK);
      setStage('form');
    } else {
      setStage('verify');
    }
  }

  function applyIdentity(found: DemoIdentity) {
    setIdentity(found);
    setForm({
      name: found.name,
      dob: found.dob,
      gender: found.gender,
      mobile: '', // neither source ever returns a usable number
      address: found.address,
      city: found.city,
      state: found.state,
      pincode: found.pincode,
    });
    setError('');
    setStage('form');
  }

  function submit() {
    if (!form.name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (form.mobile.length !== 10) {
      setError('Enter a 10-digit mobile number.');
      return;
    }
    setError('');
    setPatientId(generateSystemId());
    setStage('done');
  }

  const sourceLabel = method === 'aadhaar' ? 'Aadhaar' : method === 'abha' ? 'ABHA' : 'Manual entry';
  const stageIndex = STAGES.findIndex((s) => s.key === stage) + 1;
  const pct = Math.round(((stageIndex - 1) / (STAGES.length - 1)) * 100);
  const filledCount = identity ? 6 : 0;

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <span className="brand-mark">
            <img src={logo} alt="" width={34} height={34} />
          </span>
          <span className="brand-text">
            <span className="brand-name">SHRI HEALTH</span>
            <span className="brand-sub">Identity demonstration</span>
          </span>
        </div>

        <nav className="rail" aria-label="Sample walkthrough progress">
          <p className="rail-head">Sample walkthrough</p>
          <ol className="rail-list">
            {STAGES.map((s, i) => (
              <li key={s.key}>
                <button
                  className={`rail-item ${stageIndex === i + 1 ? 'rail-item--active' : ''} ${stageIndex < i + 1 ? 'rail-item--locked' : ''}`}
                  disabled={stageIndex < i + 1}
                  onClick={() => i === 0 && reset()}
                >
                  <span className="rail-icon">
                    <Icon name={s.icon} size={16} />
                  </span>
                  <span className="rail-label">{s.label}</span>
                  {stageIndex > i + 1 && (
                    <svg className="rail-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="side-foot">
          <a className="side-action" href="/">
            <Icon name="activity" size={15} />
            Full registration
          </a>
          <button className="side-action" onClick={reset}>
            <Icon name="idCard" size={15} />
            Restart demonstration
          </button>
          <div className="side-note">
            <span className="side-dot" />
            Sample data
          </div>
        </div>
      </aside>

      <div className="app-stage">
        <header className="top-bar">
          <div className="top-title">
            <h1 className="top-heading">
              {stage === 'choose' && 'Select a registration method'}
              {stage === 'verify' && `${sourceLabel} verification`}
              {stage === 'form' && (identity ? 'Confirm your details' : 'Enter your details')}
              {stage === 'done' && 'Registration complete'}
            </h1>
          </div>

          <div className="top-actions">
            <div className="top-progress" title={`${pct}% complete`}>
              <div className="top-progress-track">
                <div className="top-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="top-progress-pct">{pct}%</span>
            </div>

            <button
              className="theme-toggle"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Switch to day mode' : 'Switch to night mode'}
              title={dark ? 'Day mode' : 'Night mode'}
            >
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>

            <div className="user-chip">
              <span className="user-avatar">
                <Icon name="userCheck" size={15} />
              </span>
              <span className="user-meta">
                <span className="user-name">{form.name || 'New patient'}</span>
                <span className="user-role">{identity ? `${sourceLabel} verified` : sourceLabel}</span>
              </span>
              <span className={`badge ${stage === 'done' ? 'badge-complete' : 'badge-draft'}`}>
                {stage === 'done' ? 'Complete' : 'Demo'}
              </span>
            </div>
          </div>
        </header>

        <div className="stage-grid">
          <main className="app-main">
            <div className="card step-enter">
              {stage === 'choose' && (
                <>
                  <div className="step-head">
                    <IconBadge name="userCheck" />
                    <h2 className="step-title">Select a registration method</h2>
                  </div>
                  <MethodChooser onPick={pickMethod} />
                </>
              )}

              {stage === 'verify' && method !== 'manual' && (
                <IdentityVerify
                  method={method}
                  onVerified={applyIdentity}
                  onBack={() => setStage('choose')}
                />
              )}

              {stage === 'form' && (
                <>
                  <div className="step-head">
                    <IconBadge name="idCard" />
                    <h2 className="step-title">{identity ? 'Confirm your details' : 'Enter your details'}</h2>
                  </div>
                  <p className="step-sub">
                    {identity
                      ? 'Provide your mobile number and confirm the remaining fields.'
                      : 'Provide the following details. Starred fields are required.'}
                  </p>

                  {identity && (
                    <div className="prefill-banner">
                      <span className="prefill-icon">
                        <Icon name="checkCircle" size={16} />
                      </span>
                      <span>
                        <strong>Verified via {method === 'aadhaar' ? 'Aadhaar' : 'ABHA'}</strong>
                        {method === 'aadhaar' && identity.aadhaar ? ` · ${maskAadhaar(identity.aadhaar)}` : ''}
                        {method === 'abha' && identity.abhaAddress ? ` · ${identity.abhaAddress}` : ''}
                        {' · '}{filledCount} fields retrieved
                      </span>
                    </div>
                  )}

                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    <Field label="Full name" required verified={!!identity} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field
                      label="Mobile number"
                      required
                      autoFocus={!!identity}
                      hint={identity ? `Registered on file: ${identity.maskedMobile}` : undefined}
                      value={form.mobile}
                      inputMode="numeric"
                      placeholder="10-digit number"
                      onChange={(v) => setForm({ ...form, mobile: v.replace(/\D/g, '').slice(0, 10) })}
                    />
                    <Field label="Date of birth" type="date" verified={!!identity} value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
                    <label className="field">
                      <span className="field-label">
                        Gender
                        {identity && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
                      </span>
                      <select className="field-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                        <option value="unknown">Prefer not to say</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    <label className="field" style={{ gridColumn: '1 / -1' }}>
                      <span className="field-label">
                        Address
                        {identity && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
                      </span>
                      <input className="field-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </label>
                    <Field label="Town or city" verified={!!identity} value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                    <label className="field">
                      <span className="field-label">
                        State
                        {identity && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
                      </span>
                      <select className="field-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                        <option value="">Select a state</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="PIN code"
                      verified={!!identity}
                      value={form.pincode}
                      inputMode="numeric"
                      onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, '').slice(0, 6) })}
                    />
                  </div>

                  {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                  <div className="btn-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={submit}>Complete registration</button>
                    <button className="btn btn-secondary" onClick={reset}>Start over</button>
                  </div>
                </>
              )}

              {stage === 'done' && (
                <div style={{ textAlign: 'center' }}>
                  <div className="success-ring">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path className="success-tick" d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                  <h2 className="step-title" style={{ marginBottom: 8 }}>Registration complete</h2>
                  <p className="step-sub" style={{ margin: '0 auto 20px' }}>
                    {identity ? `Verified via ${sourceLabel}.` : 'Registered using the details provided.'}
                  </p>

                  <div className="summary-panel">
                    <SummaryRow icon="userCheck" label="Name" value={form.name} />
                    <SummaryRow icon="phone" label="Mobile" value={form.mobile} />
                    <SummaryRow icon="mapPin" label="Town or city" value={form.city || '—'} />
                    <SummaryRow icon="shieldCheck" label="Identified by" value={sourceLabel} />
                    <SummaryRow icon="idCard" label="Patient ID" value={patientId} mono last />
                  </div>

                  <button className="btn btn-primary" onClick={reset}>Restart demonstration</button>
                </div>
              )}
            </div>

            <div className="assurance-strip">
              <Assurance icon="lock" title="No external requests" copy="Lookups read local sample records only." />
              <Assurance icon="shieldCheck" title="Consent required" copy="Details are retrieved only after verification." />
              <Assurance icon="stethoscope" title="Reduced data entry" copy="Verification removes six fields from the form." />
            </div>
          </main>

          <aside className="side-rail">
            <section className="rail-panel">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Retrieved record</h2>
                <span className={`badge ${identity ? 'badge-complete' : 'badge-draft'}`}>
                  {identity ? 'Verified' : 'None'}
                </span>
              </div>
              <RailRow icon="userCheck" label="Name" value={identity?.name} />
              <RailRow icon="calendar" label="Date of birth" value={identity?.dob} />
              <RailRow icon="mapPin" label="Town or city" value={identity?.city} />
              <RailRow icon="phone" label="Mobile on file" value={identity?.maskedMobile} />
              <RailRow
                icon="idCard"
                label={method === 'abha' ? 'ABHA address' : 'Aadhaar'}
                value={method === 'abha' ? identity?.abhaAddress : identity?.aadhaar ? maskAadhaar(identity.aadhaar) : undefined}
                mono
                last
              />
            </section>

            <section className="rail-panel rail-panel--accent">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Mobile number</h2>
                <Icon name="phone" size={16} />
              </div>
              <p className="rail-accent-copy">
                Aadhaar offline eKYC returns only a hash of the registered mobile number, and ABHA returns it masked.
                Neither discloses a usable number, so it must be provided by the patient.
              </p>
            </section>

            <section className="rail-panel">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Sample data notice</h2>
              </div>
              <p className="rail-help-copy">
                No UIDAI or ABDM service is contacted. Lookups read a local sample table and the code check accepts the
                value displayed on screen. Production integration requires replacing two lookup functions.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  verified,
  hint,
  type,
  inputMode,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  verified?: boolean;
  hint?: string;
  type?: string;
  inputMode?: 'numeric' | 'text';
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-required">*</span>}
        {verified && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
      </span>
      <input
        className="field-input"
        type={type}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function RailRow({
  icon,
  label,
  value,
  mono,
  last,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`rail-row ${last ? 'rail-row--last' : ''}`}>
      <span className="rail-row-label">
        <Icon name={icon} size={13} />
        {label}
      </span>
      <span className={`rail-row-value ${value ? '' : 'rail-row-value--empty'} ${mono && value ? 'rail-row-value--mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  mono,
  last,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`summary-row ${last ? 'summary-row--last' : ''}`}>
      <span className="summary-label field-icon-row">
        <Icon name={icon} size={14} /> {label}
      </span>
      <span className={mono ? 'summary-value summary-value--mono' : 'summary-value'}>{value}</span>
    </div>
  );
}

function Assurance({
  icon,
  title,
  copy,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  copy: string;
}) {
  return (
    <div className="assurance">
      <span className="assurance-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="assurance-text">
        <span className="assurance-title">{title}</span>
        <span className="assurance-copy">{copy}</span>
      </span>
    </div>
  );
}
