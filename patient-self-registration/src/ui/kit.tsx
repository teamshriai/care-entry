import { useId } from 'react';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Icon, IconBadge } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { cn } from './cn';
import { inputClass } from './classes';

/* ── Surfaces ────────────────────────────────────────────────────────────── */

/** The step card (DESIGN_SYSTEM §10.5): white, a real edge, a shallow shadow,
 *  entering with the catalogue's slide-up (§11.2). */
export function Card({ children, className, center = false }: { children: ReactNode; className?: string; center?: boolean }) {
  return (
    <section
      className={cn(
        'surface-raised relative min-w-0 rounded-xl border border-border-soft bg-surface-1 p-4 sm:p-6 lg:p-7',
        'motion-safe:animate-[slideUp_400ms_var(--ease-premium)_both]',
        center && 'overflow-hidden text-center',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Content that appears inside a card after an interaction. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('motion-safe:animate-[slideUp_250ms_var(--ease-premium)_both]', className)}>{children}</div>;
}

/* ── Step chrome ─────────────────────────────────────────────────────────── */

/** "← Back" on the left, "Next ›" on the right. Next stays disabled until the
 *  step has been reached once, so it never skips a step's own validation. */
export function StepNav({ onBack, onNext, nextDisabled }: { onBack?: () => void; onNext?: () => void; nextDisabled?: boolean }) {
  if (!onBack && !onNext) return null;
  return (
    <div className="-mt-1 mb-4 flex items-center justify-between gap-3">
      {onBack ? <BackButton onClick={onBack} /> : <span />}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          title={nextDisabled ? 'Complete this step to continue' : 'Go to the next step'}
          className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-full border border-border-soft bg-surface-2 pl-4 pr-3 text-sm font-semibold text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <Icon name="chevron" size={15} className="-rotate-90" />
        </button>
      ) : null}
    </div>
  );
}

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring -ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <Icon name="chevron" size={16} className="rotate-90" />
      {label}
    </button>
  );
}

export function StepHeader({ icon, title, badge, center = false }: { icon?: IconName; title: ReactNode; badge?: ReactNode; center?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-3', center && 'justify-center')}>
      {icon ? <IconBadge name={icon} size={34} /> : null}
      <h2 className="min-w-0 text-balance text-lg font-bold tracking-[-0.025em] text-ink sm:text-2xl">{title}</h2>
      {badge}
    </div>
  );
}

export function StepSub({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2 sm:text-base', className)}>{children}</p>;
}

/** A titled block inside a step card, ruled off from the one above. */
export function Section({ title, sub, children, className }: { title: string; sub?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-6 border-t border-border-soft pt-6 sm:mt-7 sm:pt-7', className)}>
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      {sub ? <p className="mt-1 text-sm text-ink-muted">{sub}</p> : null}
      {children ? <div className="mt-3.5 sm:mt-4">{children}</div> : null}
    </div>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[image:var(--gradient-primary)] text-on-primary border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(29,78,216,0.35),0_4px_12px_-4px_rgba(37,99,235,0.45)] hover:brightness-[1.08] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(29,78,216,0.3),0_10px_24px_-8px_rgba(37,99,235,0.55)]',
  secondary: 'bg-primary-50 text-primary-text border-primary-200 dark:border-primary-500/35 hover:bg-primary-100 hover:border-primary-300 dark:hover:border-primary-500/60',
  ghost: 'bg-transparent text-ink-subtle border-transparent hover:bg-surface-2 hover:text-ink',
  outline: 'bg-surface-1 text-ink border-border shadow-card-sm hover:bg-surface-2 hover:border-border-strong',
};

/** DESIGN_SYSTEM §10.1 — every size has a min height; 48px is the default
 *  here, a comfortable public-facing target. */
export function Button({
  variant = 'primary',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: IconName }) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={cn(
        'focus-ring inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-xl border px-4 py-2 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.97] sm:min-h-12 sm:px-5 sm:py-2.5',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

/** A row of actions. On a phone the buttons stack full-width with the
 *  primary one first, where the thumb reaches it. */
export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3',
        'max-sm:[&>*]:w-full max-sm:[&>[data-variant=primary]]:order-first',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** An inline text action ("Request a new code", "Read the notice"). */
export function TextButton({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring -mx-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-primary-text underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────────── */

/** Label, the control, and an optional hint (DESIGN_SYSTEM §10.2). */
export function Field({
  label,
  icon,
  required,
  optional,
  verified,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  icon?: IconName;
  required?: boolean;
  optional?: boolean;
  verified?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('flex min-w-0 flex-col', className)}>
      <span className="mb-1.5 flex min-h-5 flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium text-ink-muted">
        {icon ? <Icon name={icon} size={14} className="text-ink-subtle" /> : null}
        {label}
        {required ? (
          <span className="text-critical-fg" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">(required)</span> : null}
        {optional ? <span className="text-xs font-normal text-ink-subtle">(optional)</span> : null}
        {verified ? <VerifiedTag /> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 text-xs text-ink-subtle">{hint}</span> : null}
    </label>
  );
}

export function VerifiedTag() {
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success-fg">
      <Icon name="checkCircle" size={11} strokeWidth={2.4} />
      Verified
    </span>
  );
}

/** A native select with the design system's field look and its own chevron. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block min-w-0">
      <select className={cn(inputClass, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
    </span>
  );
}

/** A value retrieved from a verified source, read-only until the patient
 *  chooses to correct it. */
export function LockedValue({ value }: { value: string }) {
  return (
    <span className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 px-3.5 py-2 text-sm text-ink-muted">
      <Icon name="lock" size={14} className="text-success-fg" />
      <span className="min-w-0 break-words">{value || 'Not provided'}</span>
    </span>
  );
}

/* ── Feedback ────────────────────────────────────────────────────────────── */

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const ALERT_STYLE: Record<AlertTone, { box: string; icon: IconName }> = {
  error: { box: 'border-critical-fg/30 bg-critical-bg text-critical-fg', icon: 'alert' },
  success: { box: 'border-success-fg/30 bg-success-bg text-success-fg', icon: 'checkCircle' },
  info: { box: 'border-info-fg/30 bg-info-bg text-info-fg', icon: 'shieldCheck' },
  warning: { box: 'border-warning-fg/30 bg-warning-bg text-warning-fg', icon: 'clock' },
};

/** The banner (DESIGN_SYSTEM §10.10). Errors announce assertively. */
export function Alert({
  tone = 'info',
  icon,
  children,
  className,
}: {
  tone?: AlertTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  const style = ALERT_STYLE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed', style.box, className)}
    >
      <Icon name={icon ?? style.icon} size={16} className="mt-0.5" />
      <div className="min-w-0 [&_strong]:font-semibold">{children}</div>
    </div>
  );
}

type BadgeTone = 'success' | 'warning' | 'info' | 'neutral' | 'primary';

const BADGE: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-fg border-success-fg/25',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg/25',
  info: 'bg-info-bg text-info-fg border-info-fg/25',
  neutral: 'bg-surface-2 text-ink-subtle border-border-soft',
  primary: 'bg-primary-50 text-primary-text border-primary-200 dark:border-primary-500/35',
};

/** StatusBadge (DESIGN_SYSTEM §10.6) — words, never colour alone. */
export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full select-none items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-2xs font-semibold',
        BADGE[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ── Choices ─────────────────────────────────────────────────────────────── */

/** A checkbox as a whole card — the full card is the target. */
export function CheckCard({
  checked,
  onToggle,
  children,
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'focus-ring flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm leading-snug transition-all duration-200 sm:min-h-12 sm:px-4 sm:py-3',
        checked
          ? 'border-primary-600 bg-primary-50 text-ink shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary-500)_14%,transparent)]'
          : 'border-border-soft bg-surface-1 text-ink-muted hover:-translate-y-0.5 hover:border-border-strong hover:text-ink hover:shadow-card-md',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked ? 'border-primary-600 bg-primary-600 text-on-primary' : 'border-border-strong bg-surface-1',
        )}
      >
        {checked ? (
          <motion.svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <path d="M20 6L9 17l-5-5" />
          </motion.svg>
        ) : null}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

/** Radio chips (DESIGN_SYSTEM §9.3) with arrow-key movement. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  function move(index: number) {
    const next = options[(index + options.length) % options.length];
    onChange(next.value);
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index + 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index - 1);
              }
            }}
            className={cn(
              'focus-ring min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
              on ? 'border-transparent bg-[image:var(--gradient-primary)] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_12px_-4px_rgba(37,99,235,0.45)]' : 'border-border-soft bg-surface-1 text-ink-muted hover:border-border-strong hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Sample-data helper (this build only) ────────────────────────────────── */

/** The note listing sample values; each chip fills them in. */
export function SampleHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-muted sm:mt-6 sm:px-3.5 sm:py-3">
      <Icon name="lock" size={14} className="mt-0.5 text-ink-subtle" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <strong className="font-semibold text-ink">{label}</strong>
        {children}
      </div>
    </div>
  );
}

export function SampleChip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring tap-reach inline-flex min-h-9 max-w-full items-center rounded-full border border-border-soft bg-surface-1 px-3 text-xs font-medium text-ink transition-colors hover:border-border-strong"
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

/* ── Read-only summaries ─────────────────────────────────────────────────── */

export function SummaryList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft bg-surface-2/60 text-left', className)}>{children}</dl>;
}

export function SummaryRow({ icon, label, value, mono }: { icon?: IconName; label: string; value?: ReactNode; mono?: boolean }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-ink-muted">
        {icon ? <Icon name={icon} size={14} className="text-ink-subtle" /> : null}
        {label}
      </dt>
      <dd className={cn('min-w-0 break-all text-right text-sm font-semibold', empty ? 'text-ink-subtle' : 'text-ink', mono && !empty && 'font-mono text-xs tabular-nums')}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

/* ── Side rail ───────────────────────────────────────────────────────────── */

export function RailPanel({
  title,
  aside,
  accent = false,
  children,
}: {
  title: string;
  aside?: ReactNode;
  accent?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'surface-raised min-w-0 rounded-xl border p-3.5 sm:p-4',
        accent
          ? 'border-primary-200 bg-primary-50 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--color-primary-500)_12%,transparent),transparent_60%)] dark:border-primary-500/35'
          : 'border-border-soft bg-surface-1',
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
        <h2 id={id} className={cn('text-sm font-semibold', accent ? 'text-primary-text' : 'text-ink')}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function RailRow({ icon, label, value, mono }: { icon: IconName; label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-t border-border-soft py-2.5 first-of-type:border-t-0">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-subtle">
        <Icon name={icon} size={13} />
        {label}
      </span>
      <span className={cn('min-w-0 break-all text-right text-xs font-semibold', value ? 'text-ink' : 'text-ink-subtle', mono && value && 'font-mono tabular-nums')}>
        {value || '—'}
      </span>
    </div>
  );
}

/** A reassurance under the step card ("Encrypted end to end", …). */
export function Assurance({ icon, title, copy }: { icon: IconName; title: string; copy: string }) {
  return (
    <div className="surface-raised flex min-w-0 items-start gap-2.5 rounded-xl border border-border-soft bg-surface-1 p-3 sm:gap-3 sm:p-3.5">
      <IconBadge name={icon} size={30} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{copy}</span>
      </span>
    </div>
  );
}

export function AssuranceStrip({ children }: { children: ReactNode }) {
  // A phone gets a horizontal scroll row (the next card peeking in); 640px up, three across.
  return (
    <div className="scrollbar-hide -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-1 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start sm:mx-0 sm:mt-5 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:p-0 sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

/** The completion mark: the ring pops in, the tick draws itself once. */
export function SuccessMark() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success-fg ring-8 ring-success-bg/50"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="motion-safe:animate-[draw-tick_500ms_var(--ease-premium)_250ms_both]" />
      </svg>
    </motion.div>
  );
}
