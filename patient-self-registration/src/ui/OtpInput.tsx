import { useEffect, useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { cn } from './cn';

const LENGTH = 6;

/**
 * The six-digit code entry (DESIGN_SYSTEM §10.2 OTP cell). One box per digit,
 * sized to the space it has — six boxes always fit, down to a 320px phone.
 * Typing moves forward, Backspace moves back, and a pasted or autofilled code
 * fills every box at once. `onComplete` fires when the sixth digit lands.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  success = false,
  invalid = false,
  autoFocus = false,
  label = 'Verification code',
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  success?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
  className?: string;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const previous = useRef(value);

  // A rejected code is cleared by the caller: put the cursor back at the start.
  useEffect(() => {
    if (value === '' && previous.current !== '') boxes.current[0]?.focus();
    previous.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
    return clean;
  }

  function handleInput(index: number, raw: string) {
    let digits = raw.replace(/\D/g, '');
    // Typing into a box that already holds a digit: the new keystroke wins.
    if (digits.length === 2 && value[index]) digits = digits.startsWith(value[index]) ? digits.slice(1) : digits.slice(0, 1);
    if (digits.length > 1) {
      // Autofill or a multi-digit paste into one box.
      const clean = commit(value.slice(0, index) + digits);
      boxes.current[Math.min(clean.length, LENGTH - 1)]?.focus();
      return;
    }
    const digit = digits.slice(-1);
    const chars = value.padEnd(LENGTH, ' ').split('');
    chars[index] = digit || ' ';
    const next = chars.join('').replace(/\s+$/, '');
    // A gap left mid-code is not a valid code — keep only what is contiguous.
    commit(next.includes(' ') ? next.split(' ')[0] : next);
    if (digit && index < LENGTH - 1) boxes.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault();
      commit(value.slice(0, index - 1));
      boxes.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    event.preventDefault();
    const clean = commit(digits);
    boxes.current[Math.min(clean.length, LENGTH - 1)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className={cn('grid w-full max-w-[22rem] grid-cols-6 gap-1.5 min-[360px]:gap-2 sm:gap-2.5', className)}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={LENGTH}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-12 w-full min-w-0 rounded-xl border bg-surface-1 p-0 text-center text-xl font-semibold tabular-nums text-ink transition-all duration-150 sm:h-14',
            'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-focus/40',
            // A digit that has landed takes a breath of primary, so progress shows at a glance.
            success
              ? 'border-success-fg bg-success-bg text-success-fg'
              : invalid
                ? 'border-critical-fg/50'
                : value[index]
                  ? 'border-[color-mix(in_oklab,var(--color-primary-500)_45%,var(--color-border))] bg-[linear-gradient(180deg,var(--color-surface-1),color-mix(in_oklab,var(--color-primary-500)_9%,var(--color-surface-1)))]'
                  : 'border-border',
          )}
        />
      ))}
    </div>
  );
}
