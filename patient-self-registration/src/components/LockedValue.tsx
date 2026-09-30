import { Icon } from './Icon';

/**
 * A value retrieved from a verified source, shown read-only until the patient
 * chooses to correct it. Shared by the identity and address steps.
 */
export function LockedValue({ value }: { value: string }) {
  return (
    <div className="locked-field">
      <Icon name="lock" size={14} />
      <span>{value || 'Not provided'}</span>
    </div>
  );
}
