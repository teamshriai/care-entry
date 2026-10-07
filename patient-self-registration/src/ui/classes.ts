// Shared class strings (DESIGN_SYSTEM §10.2). Kept apart from the components
// so component files export components only.

/** The standard field: 44px tall, a hairline edge that strengthens on hover,
 *  a focus ring rather than a border jump. */
export const inputClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-border-soft bg-surface-1 px-3.5 py-2 text-sm text-ink placeholder:text-ink-subtle transition-colors duration-150 hover:border-border focus:border-transparent focus:outline-none focus:ring-2 focus:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-60';

/** A value the patient cannot change here (shown, not edited). */
export const readOnlyClass = 'bg-surface-2 text-ink-muted hover:border-border-soft';

/** Two columns from 640px, one on phones. */
export const formGridClass = 'grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2';
