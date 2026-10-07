import { useState } from 'react';
import { INDIAN_STATES, MOBILE_ERROR, isValidMobile } from '../data';
import type { DetailsDraft } from '../drafts';
import type { RegistrationOrigin } from '../identity/identityData';
import { Alert, Button, ButtonRow, Card, CheckCard, Field, LockedValue, Section, Select, StepHeader, StepNav, StepSub } from '../ui/kit';
import { formGridClass, inputClass, readOnlyClass } from '../ui/classes';
import { cn } from '../ui/cn';

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
    if (!isValidMobile(ecMobile)) {
      setFormError('Emergency contact: ' + MOBILE_ERROR.charAt(0).toLowerCase() + MOBILE_ERROR.slice(1));
      return;
    }
    setFormError('');
    onContinue();
  }

  return (
    <Card>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
      <StepHeader icon="mapPin" title="Contact & address" />
      <StepSub>Contact details for your record.</StepSub>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <div className={`mt-6 ${formGridClass}`}>
          <Field label="Full name">
            <input className={cn(inputClass, readOnlyClass)} value={patientName} readOnly />
          </Field>
          <Field label="Mobile number">
            <input className={cn(inputClass, readOnlyClass)} value={patientMobile} readOnly />
          </Field>
          <Field label="Email address" icon="mail" optional>
            <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => onChange({ email: e.target.value })} />
          </Field>
        </div>

        <Section title="Your address" sub={hasVerifiedAddress ? `Retrieved from ${sourceLabel}.` : 'Optional.'}>
          <div className={formGridClass}>
            <Field label="Address line 1" verified={locked && !!verified?.address} className="sm:col-span-2">
              {locked ? (
                <LockedValue value={addressLine1} />
              ) : (
                <input className={inputClass} autoComplete="address-line1" value={addressLine1} onChange={(e) => onChange({ addressLine1: e.target.value })} placeholder="House, street, area" />
              )}
            </Field>
            <Field label="Address line 2" optional={!locked} className="sm:col-span-2">
              {locked ? (
                <LockedValue value={addressLine2} />
              ) : (
                <input className={inputClass} autoComplete="address-line2" value={addressLine2} onChange={(e) => onChange({ addressLine2: e.target.value })} />
              )}
            </Field>
            <Field label="City / Town" verified={locked && !!verified?.city}>
              {locked ? (
                <LockedValue value={city} />
              ) : (
                <input className={inputClass} autoComplete="address-level2" value={city} onChange={(e) => onChange({ city: e.target.value })} />
              )}
            </Field>
            <Field label="State" verified={locked && !!verified?.state}>
              {locked ? (
                <LockedValue value={state} />
              ) : (
                <Select value={state} onChange={(e) => onChange({ state: e.target.value })}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Pincode" verified={locked && !!verified?.pincode}>
              {locked ? (
                <LockedValue value={pincode} />
              ) : (
                <input
                  className={inputClass}
                  value={pincode}
                  onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="6-digit PIN"
                />
              )}
            </Field>
            <Field label="Country">
              {locked ? (
                <LockedValue value={country} />
              ) : (
                <Select value={country} onChange={(e) => onChange({ country: e.target.value })}>
                  <option value="India">India</option>
                  <option value="Other">Other</option>
                </Select>
              )}
            </Field>
          </div>

          {hasVerifiedAddress && (
            <ButtonRow className="mt-4">
              <Button variant="outline" icon={editingAddress ? 'checkCircle' : 'edit'} onClick={() => setEditingAddress((v) => !v)}>
                {editingAddress ? 'Done editing' : 'Edit address'}
              </Button>
            </ButtonRow>
          )}
        </Section>

        <Section title="Emergency contact" sub="The person to be contacted in an emergency.">
          <div className={formGridClass}>
            <Field label="Emergency contact name" required>
              <input
                className={inputClass}
                value={ecName}
                onChange={(e) => {
                  onChange({ ecName: e.target.value });
                  setFormError('');
                }}
              />
            </Field>
            <Field label="Emergency contact mobile number" required>
              <input
                className={inputClass}
                value={ecMobile}
                onChange={(e) => {
                  onChange({ ecMobile: e.target.value.replace(/\D/g, '').slice(0, 10) });
                  setFormError('');
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
              />
            </Field>
          </div>
        </Section>

        <Section title="Consent" sub="This preference may be withdrawn at any time.">
          <CheckCard checked={consent} onToggle={() => onChange({ consent: !consent })}>
            I consent to receive communications regarding this visit by SMS and email.
          </CheckCard>
        </Section>

        {formError && <Alert tone="error" className="mt-6">{formError}</Alert>}

        <ButtonRow>
          <Button type="submit">Save &amp; continue</Button>
        </ButtonRow>
      </form>
    </Card>
  );
}
