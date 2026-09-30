import { useState } from 'react';
import { INDIAN_STATES } from '../data';
import { IconBadge, Icon } from './Icon';
import { LockedValue } from './LockedValue';
import { trackSpotlight } from '../ui';
import type { DetailsDraft } from '../drafts';
import type { RegistrationOrigin } from '../identity/identityData';
import '../identity/identity.css';

export function Step3Details({
  patientName,
  patientMobile,
  origin,
  draft,
  onChange,
  onContinue,
  onBack,
  onNext,
  nextDisabled,
}: {
  patientName: string;
  patientMobile: string;
  origin: RegistrationOrigin;
  draft: DetailsDraft;
  onChange: (patch: Partial<DetailsDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Forward navigation; disabled until this step has been completed once. */
  onNext?: () => void;
  nextDisabled?: boolean;
}) {
  const verified = origin.identity;
  const sourceLabel = origin.source === 'aadhaar' ? 'Aadhaar' : 'ABHA';

  const { email, addressLine1, addressLine2, city, state, pincode, country, ecName, ecMobile, consent } = draft;
  const [formError, setFormError] = useState('');
  /** Address fields carried over from the verified source stay read-only until opened. */
  const [editingAddress, setEditingAddress] = useState(false);

  const hasVerifiedAddress = !!(verified?.address || verified?.city || verified?.state || verified?.pincode);
  const locked = hasVerifiedAddress && !editingAddress;

  function handleContinue() {
    if (!ecName.trim() || !ecMobile.trim()) {
      setFormError('Emergency contact name and mobile number are required.');
      return;
    }
    if (ecMobile.length !== 10) {
      setFormError('Enter a 10-digit mobile number for the emergency contact.');
      return;
    }
    setFormError('');
    onContinue();
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
        <IconBadge name="mapPin" />
        <h2 className="step-title">Contact & Address</h2>
      </div>
      <p className="step-sub">Contact details for your record.</p>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <label className="field">
          <span className="field-label">Full name</span>
          <input className="field-input" value={patientName} readOnly style={{ background: 'var(--sand)', color: 'var(--ink-2)' }} />
        </label>
        <label className="field">
          <span className="field-label">Mobile number</span>
          <input className="field-input" value={patientMobile} readOnly style={{ background: 'var(--sand)', color: 'var(--ink-2)' }} />
        </label>
        <label className="field">
          <span className="field-label field-icon-row"><Icon name="mail" size={14} /> Email address</span>
          <input className="field-input" type="email" value={email} onChange={(e) => onChange({ email: e.target.value })} placeholder="Optional" />
        </label>
      </div>

      <hr className="rule" />
      <h3 className="section-title">Your address</h3>
      <p className="section-sub">
        {hasVerifiedAddress ? `Retrieved from ${sourceLabel}.` : 'Optional.'}
      </p>


      <div className="grid-2" style={{ marginBottom: 20 }}>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="field-label">
            Address line 1
            {locked && verified?.address && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
          </span>
          {locked ? (
            <LockedValue value={addressLine1} />
          ) : (
            <input className="field-input" value={addressLine1} onChange={(e) => onChange({ addressLine1: e.target.value })} placeholder="House, street, area" />
          )}
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="field-label">Address line 2</span>
          {locked ? (
            <LockedValue value={addressLine2} />
          ) : (
            <input className="field-input" value={addressLine2} onChange={(e) => onChange({ addressLine2: e.target.value })} placeholder="Optional" />
          )}
        </label>
        <label className="field">
          <span className="field-label">
            City / Town
            {locked && verified?.city && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
          </span>
          {locked ? (
            <LockedValue value={city} />
          ) : (
            <input className="field-input" value={city} onChange={(e) => onChange({ city: e.target.value })} />
          )}
        </label>
        <label className="field">
          <span className="field-label">
            State
            {locked && verified?.state && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
          </span>
          {locked ? (
            <LockedValue value={state} />
          ) : (
            <select className="field-input" value={state} onChange={(e) => onChange({ state: e.target.value })}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </label>
        <label className="field">
          <span className="field-label">
            Pincode
            {locked && verified?.pincode && <span className="verified-tag"><Icon name="checkCircle" size={11} /> Verified</span>}
          </span>
          {locked ? (
            <LockedValue value={pincode} />
          ) : (
            <input
              className="field-input"
              value={pincode}
              onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              inputMode="numeric"
              placeholder="6-digit PIN"
            />
          )}
        </label>
        <label className="field">
          <span className="field-label">Country</span>
          {locked ? (
            <LockedValue value={country} />
          ) : (
            <select className="field-input" value={country} onChange={(e) => onChange({ country: e.target.value })}>
              <option value="India">India</option>
              <option value="Other">Other</option>
            </select>
          )}
        </label>
      </div>

      {hasVerifiedAddress && (
        <div className="btn-row" style={{ marginBottom: 20 }}>
          <button className="btn btn-secondary" onClick={() => setEditingAddress((v) => !v)}>
            <span className="btn-ico"><Icon name={editingAddress ? 'checkCircle' : 'edit'} size={15} /></span>
            {editingAddress ? 'Done editing' : 'Edit address'}
          </button>
        </div>
      )}

      <hr className="rule" />
      <h3 className="section-title">Emergency contact</h3>
      <p className="section-sub">The person to be contacted in an emergency.</p>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <label className="field">
          <span className="field-label">Emergency contact name<span className="field-required">*</span></span>
          <input className="field-input" value={ecName} onChange={(e) => { onChange({ ecName: e.target.value }); setFormError(''); }} />
        </label>
        <label className="field">
          <span className="field-label">Emergency contact mobile number<span className="field-required">*</span></span>
          <input
            className="field-input"
            value={ecMobile}
            onChange={(e) => { onChange({ ecMobile: e.target.value.replace(/\D/g, '').slice(0, 10) }); setFormError(''); }}
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit number"
          />
        </label>
      </div>

      <hr className="rule" />
      <h3 className="section-title">Consent</h3>
      <p className="section-sub">This preference may be withdrawn at any time.</p>

      <button
        className={`choice-card ${consent ? 'choice-card--on' : ''}`}
        onClick={() => onChange({ consent: !consent })}
        onMouseMove={trackSpotlight}
        aria-pressed={consent}
        style={{ marginBottom: 24 }}
      >
        <span className="checkbox-box">
          {consent && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        <span>I consent to receive communications regarding this visit by SMS and email.</span>
      </button>

      {formError && <div className="alert alert-error" style={{ marginBottom: 20 }}>{formError}</div>}

      <button className="btn btn-primary" onClick={handleContinue}>Save &amp; Continue</button>
    </div>
  );
}
