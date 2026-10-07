import { useId } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode, SelectHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Icon, IconBadge } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { cn } from './cn';
import { inputClass } from './classes';
import { TONE_HEX, figureStyle, personTone, toneOf, toneVar, washStyle, withoutHonorifics } from './tones';
import type { IconTone } from './tones';

/* ── Surfaces ────────────────────────────────────────────────────────────── */

/** A soft gradient line of the card's hue along its top edge (reads `--tone`). */
const ACCENT_EDGE =
  'before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-[2px] before:rounded-full before:[background-image:linear-gradient(90deg,transparent,var(--tone)_25%,color-mix(in_oklab,var(--tone)_40%,transparent)_75%,transparent)] print:before:hidden';

/** The step card (DESIGN_SYSTEM §10.5): white, a real edge, a shallow shadow,
 *  entering with the catalogue's slide-up (§11.2). `tone` gives it its
 *  subject's colour, as the front office's cards have: the hue in the edge, a
 *  gradient line along the top and a faint wash behind the heading. Without
 *  it the card stays plain. */
export function Card({
  children,
  className,
  center = false,
  tone,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
  tone?: IconTone;
}) {
  return (
    <section
      style={tone ? washStyle(tone) : undefined}
      className={cn(
        'surface-raised relative min-w-0 rounded-xl border border-border-soft bg-surface-1 p-4 sm:p-6 lg:p-7',
        'motion-safe:animate-[slideUp_400ms_var(--ease-premium)_both]',
        tone && ACCENT_EDGE,
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
          className={cn(
            'focus-ring inline-flex min-h-11 items-center gap-1 rounded-full border pl-4 pr-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
            SECONDARY,
          )}
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
      {icon ? <IconBadge name={icon} size={34} variant="solid" /> : null}
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

/** A light tint of the primary gradient, with primary ink (AA on it in both
 *  themes) — the secondary action, and the step's "Next". */
const SECONDARY =
  'text-primary-text border-[color-mix(in_oklab,var(--color-primary-500)_30%,var(--color-border-soft))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary-500)_6%,var(--color-surface-1)),color-mix(in_oklab,var(--color-primary-500)_14%,var(--color-surface-1)))] shadow-[inset_0_1px_0_var(--surface-highlight),0_1px_2px_rgba(16,34,76,0.06)] hover:border-[color-mix(in_oklab,var(--color-primary-500)_50%,var(--color-border-soft))] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary-500)_10%,var(--color-surface-1)),color-mix(in_oklab,var(--color-primary-500)_20%,var(--color-surface-1)))]';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[image:var(--gradient-primary)] text-on-primary border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(29,78,216,0.35),0_4px_12px_-4px_rgba(37,99,235,0.45)] hover:brightness-[1.08] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(29,78,216,0.3),0_10px_24px_-8px_rgba(37,99,235,0.55)]',
  secondary: SECONDARY,
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
        {icon ? <Icon name={icon} size={14} style={{ color: TONE_HEX[toneOf(icon)] }} /> : null}
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
    <span style={toneVar('green')} className={cn('ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold', TINT_PILL)}>
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
    <span
      style={toneVar('green')}
      className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-dashed border-[color-mix(in_oklab,var(--tone)_38%,var(--color-border))] bg-[color-mix(in_oklab,var(--tone)_6%,var(--color-surface-1))] px-3.5 py-2 text-sm text-ink-muted"
    >
      <Icon name="lock" size={14} className="ink-tone" />
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

/** Each status as its hue; neutral (none, optional, not yet) stays grey. */
const BADGE_HUE: Record<BadgeTone, string | null> = {
  success: 'var(--color-hue-green)',
  warning: 'var(--color-hue-amber)',
  info: 'var(--color-hue-cyan)',
  primary: 'var(--color-primary-500)',
  neutral: null,
};

/** A pill in a hue (reads `--tone`): a soft vertical gradient of it, the hue
 *  in the edge and its readable ink (AA) for the words. */
const TINT_PILL =
  'ink-tone border-[color-mix(in_oklab,var(--tone)_30%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--tone)_9%,var(--color-surface-1)),color-mix(in_oklab,var(--tone)_17%,var(--color-surface-1)))] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-none';

/** StatusBadge (DESIGN_SYSTEM §10.6) — words, never colour alone. A dot in
 *  the hue with a soft halo leads them. */
export function Badge({ tone = 'neutral', dot = true, children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  const hue = BADGE_HUE[tone];
  return (
    <span
      style={hue ? ({ '--tone': hue } as CSSProperties) : undefined}
      className={cn(
        'inline-flex max-w-full select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-semibold',
        hue ? TINT_PILL : 'border-border-soft bg-surface-2 text-ink-subtle',
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_oklab,currentColor_16%,transparent)]', hue ? 'bg-[var(--tone)]' : 'bg-ink-subtle')}
        />
      ) : null}
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
          ? 'border-primary-600 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary-500)_6%,var(--color-surface-1)),color-mix(in_oklab,var(--color-primary-500)_13%,var(--color-surface-1)))] text-ink shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary-500)_14%,transparent)]'
          : 'border-border-soft bg-surface-1 text-ink-muted hover:-translate-y-0.5 hover:border-border-strong hover:text-ink hover:shadow-card-md',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked
            ? 'border-transparent bg-[image:var(--gradient-primary)] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_6px_-2px_rgba(37,99,235,0.5)]'
            : 'border-border-strong bg-surface-1',
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
    <div
      style={toneVar('indigo')}
      className="tint-surface mt-5 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed text-ink-muted sm:mt-6 sm:px-3.5 sm:py-3"
    >
      <Icon name="lock" size={14} className="ink-tone mt-0.5" />
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
      className="focus-ring tap-reach inline-flex min-h-9 max-w-full items-center rounded-full border border-[color-mix(in_oklab,var(--color-hue-indigo)_26%,var(--color-border-soft))] bg-surface-1 px-3 text-xs font-medium text-ink shadow-card-sm transition-colors hover:border-[color-mix(in_oklab,var(--color-hue-indigo)_55%,var(--color-border-soft))]"
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

/* ── Read-only summaries ─────────────────────────────────────────────────── */

/** A read-only record on a pastel surface of its hue (blue, or green once
 *  something is complete), rows ruled in the same hue. */
export function SummaryList({ children, className, tone = 'blue' }: { children: ReactNode; className?: string; tone?: IconTone }) {
  return (
    <dl
      style={toneVar(tone)}
      className={cn('tint-surface divide-y divide-[color-mix(in_oklab,var(--tone)_16%,var(--color-border-soft))] overflow-hidden rounded-xl border text-left', className)}
    >
      {children}
    </dl>
  );
}

export function SummaryRow({ icon, label, value, mono }: { icon?: IconName; label: string; value?: ReactNode; mono?: boolean }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-ink-muted">
        {icon ? <Icon name={icon} size={14} style={{ color: TONE_HEX[toneOf(icon)] }} /> : null}
        {label}
      </dt>
      <dd className={cn('min-w-0 break-all text-right text-sm font-semibold', empty ? 'text-ink-subtle' : 'text-ink', mono && !empty && 'font-mono text-xs tabular-nums')}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

/* ── Side rail ───────────────────────────────────────────────────────────── */

/**
 * A panel in the side rail. `tone` colours it: with `accent` it is the pastel
 * figure surface of the hue (a note that should stand out), without it the
 * card treatment — the hue in the edge, a line along the top, a faint wash.
 */
export function RailPanel({
  title,
  aside,
  accent = false,
  tone,
  children,
}: {
  title: string;
  aside?: ReactNode;
  accent?: boolean;
  tone?: IconTone;
  children: ReactNode;
}) {
  const id = useId();
  const hue = tone ?? (accent ? 'blue' : undefined);
  return (
    <section
      aria-labelledby={id}
      style={hue ? (accent ? figureStyle(hue) : washStyle(hue)) : undefined}
      className={cn(
        'surface-raised relative min-w-0 rounded-xl border bg-surface-1 p-3.5 sm:p-4',
        hue ? !accent && ACCENT_EDGE : 'border-border-soft',
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
        <h2 id={id} className={cn('text-sm font-semibold', accent ? 'ink-tone' : 'text-ink')}>
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
        <Icon name={icon} size={13} style={{ color: TONE_HEX[toneOf(icon)] }} />
        {label}
      </span>
      <span className={cn('min-w-0 break-all text-right text-xs font-semibold', value ? 'text-ink' : 'text-ink-subtle', mono && value && 'font-mono tabular-nums')}>
        {value || '—'}
      </span>
    </div>
  );
}

/** A reassurance under the step card ("Encrypted end to end", …): a pastel
 *  tile in its subject's hue (or `tone`) with a solid chip. */
export function Assurance({ icon, title, copy, tone }: { icon: IconName; title: string; copy: string; tone?: IconTone }) {
  const hue = tone ?? toneOf(icon);
  return (
    <div style={figureStyle(hue, 0.8)} className="surface-raised flex min-w-0 items-start gap-2.5 rounded-xl border bg-surface-1 p-3 sm:gap-3 sm:p-3.5">
      <IconBadge name={icon} size={30} variant="solid" tone={hue} />
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
    <div className="scrollbar-hide -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-1 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start sm:mx-0 sm:mt-5 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:p-0 sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

/** The completion mark: a solid green chip in a soft halo pops in, the tick
 *  draws itself once. The green is deepened a step so the white tick holds
 *  3:1 on it. */
export function SuccessMark() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      style={{ '--tone': 'color-mix(in oklab, var(--color-hue-green) 88%, black)' } as CSSProperties}
      className="chip-solid mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full outline-8 outline-solid outline-[color-mix(in_oklab,var(--color-hue-green)_16%,transparent)]"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="motion-safe:animate-[draw-tick_500ms_var(--ease-premium)_250ms_both]" />
      </svg>
    </motion.div>
  );
}

/* ── People ──────────────────────────────────────────────────────────────── */

const AVATAR_SIZE = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
} as const;

/**
 * A person (DESIGN_SYSTEM §10.7, as the front office draws them): a pastel
 * gradient circle in the person's hue (a hash of the full name, so the same
 * person is always the same colour) with their initials in the hue's ink.
 * Without a name it holds the person glyph, in blue.
 */
export function Avatar({ name, size = 'sm', className }: { name?: string; size?: keyof typeof AVATAR_SIZE; className?: string }) {
  const clean = name ? withoutHonorifics(name) : '';
  const parts = clean.split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '';
  return (
    <span
      aria-hidden="true"
      style={toneVar(initials ? personTone(clean) : 'blue')}
      className={cn(
        'ink-tone inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold tracking-tight',
        'bg-[linear-gradient(145deg,color-mix(in_oklab,var(--tone)_26%,var(--color-surface-1)),color-mix(in_oklab,var(--tone)_12%,var(--color-surface-1)))]',
        'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--tone)_28%,transparent)]',
        AVATAR_SIZE[size],
        className,
      )}
    >
      {initials || <Icon name="userCheck" size={size === 'xs' ? 13 : 16} />}
    </span>
  );
}
