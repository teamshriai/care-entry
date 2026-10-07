import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { cn } from './cn';
import { Avatar, Badge } from './kit';
import { TONE_HEX, toneOf, toneVar } from './tones';
import { useSidebar } from './useSidebar';
import logo from '../logo.png';

/** A soft tile in a hue (reads `--tone`): its pastel gradient, the glyph in its ink. */
const SOFT_TILE =
  'ink-tone bg-[linear-gradient(145deg,color-mix(in_oklab,var(--tone)_22%,transparent),color-mix(in_oklab,var(--tone)_10%,transparent))] dark:bg-[linear-gradient(145deg,color-mix(in_oklab,var(--tone)_28%,transparent),color-mix(in_oklab,var(--tone)_14%,transparent))]';

/** The progress track (sunken, a breath of blue) and its blue-to-violet bar. */
const TRACK = 'bg-[color-mix(in_oklab,var(--color-hue-blue)_10%,var(--color-surface-3))]';
const BAR =
  'bg-[linear-gradient(90deg,var(--color-hue-blue),var(--color-hue-indigo)_55%,var(--color-hue-violet))] shadow-[0_0_8px_-1px_color-mix(in_oklab,var(--color-hue-violet)_55%,transparent)]';

export interface ShellNavItem {
  key: string;
  label: string;
  icon: IconName;
  active: boolean;
  /** Not reachable yet (a registration step not yet arrived at). */
  locked?: boolean;
  /** Already completed (a registration step behind the current one). */
  done?: boolean;
  onSelect: () => void;
}

export interface ShellUser {
  name: string;
  detail: string;
  badge: { label: string; done: boolean };
  /** `name` is a real person's (their initials in the avatar), not a
   *  placeholder such as "New patient". */
  person?: boolean;
}

export interface ShellAction {
  label: string;
  icon: IconName;
  onSelect?: () => void;
  href?: string;
}

/**
 * The patient-facing shell, following the SHRI HEALTH design system:
 *
 *   ≥ 1024px  full sidebar (brand · navigation · actions) | header | page | rail
 *   768–1023  72px icon rail                                | header | page, rail below
 *   < 768     header (with a step strip, or — for real sections, the patient
 *             portal — a sideways-scrolling row of them) | page | rail below.
 *
 * `navKind` says what the sidebar list is: 'steps' is a progress stepper
 * (registration), 'sections' is navigation between places (portal). Only
 * sections become the phone nav row — a stepper is not navigation.
 */
export function PatientShell({
  product,
  navLabel,
  navKind,
  nav,
  actions,
  note,
  heading,
  progress,
  headerExtra,
  user,
  theme,
  rail,
  children,
}: {
  product: string;
  navLabel: string;
  navKind: 'steps' | 'sections';
  nav: ShellNavItem[];
  actions: ShellAction[];
  note: string;
  heading: string;
  /** 0–100, for a stepper. */
  progress?: number;
  headerExtra?: ReactNode;
  user: ShellUser;
  theme: { dark: boolean; onToggle: () => void };
  rail?: ReactNode;
  children: ReactNode;
}) {
  const activeIndex = Math.max(0, nav.findIndex((item) => item.active));
  const active = nav[activeIndex];
  const sections = navKind === 'sections';
  const { expanded, isDesktop, toggle } = useSidebar();

  useEffect(() => {
    document.title = `${heading} · SHRI HEALTH`;
  }, [heading]);

  return (
    <div className="min-h-dvh text-ink md:flex">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Sidebar / icon rail (768px and up) ─────────────────────────── */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border-soft bg-surface-1 transition-[width] duration-200 ease-out md:flex print:hidden',
          // A faint wash of colour, blue at the top to violet at the foot (as the front office).
          'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-hue-blue)_6%,var(--color-surface-1))_0%,var(--color-surface-1)_38%,var(--color-surface-1)_62%,color-mix(in_oklab,var(--color-hue-violet)_6%,var(--color-surface-1))_100%)]',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-border-soft', expanded ? 'justify-start px-4' : 'justify-center px-2')}>
          <img src={logo} alt="" width={153} height={256} className="h-8 w-auto select-none" draggable={false} />
          <span className={cn('min-w-0', expanded ? 'block' : 'hidden')}>
            <span className="block whitespace-nowrap text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">SHRI Health</span>
            <span className="block truncate text-xs font-medium leading-tight text-ink-subtle">{product}</span>
          </span>
        </div>

        <nav aria-label={navLabel} className={cn('scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto py-3', expanded ? 'px-2.5' : 'px-2')}>
          {expanded ? <p className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">{navLabel}</p> : null}
          <ol className="flex flex-col gap-0.5">
            {nav.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.onSelect}
                  disabled={item.locked}
                  aria-current={item.active ? (sections ? 'page' : 'step') : undefined}
                  title={item.label}
                  className={cn(
                    'group focus-ring flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-medium transition-colors',
                    isDesktop ? 'min-h-10' : 'min-h-11',
                    expanded ? 'justify-start px-2.5' : 'justify-center px-0',
                    'relative',
                    item.active
                      ? cn(
                          'bg-primary-50 font-semibold text-primary-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary-500)_18%,transparent)]',
                          expanded && 'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[image:var(--gradient-primary)]',
                        )
                      : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                    item.locked && 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-ink-muted',
                  )}
                >
                  {/* The tile: the gradient when current, green when done, grey while
                      locked, otherwise a soft tint of the place's own hue. */}
                  <span
                    style={toneVar(item.done && !item.active ? 'green' : toneOf(item.icon))}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                      item.active
                        ? 'bg-[image:var(--gradient-primary)] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_3px_8px_-3px_rgba(37,99,235,0.55)]'
                        : item.locked
                          ? 'bg-surface-2 text-ink-subtle'
                          : SOFT_TILE,
                    )}
                  >
                    {item.done && !item.active ? <Icon name="checkCircle" size={15} strokeWidth={2.4} /> : <Icon name={item.icon} size={15} />}
                  </span>
                  <span className={expanded ? 'min-w-0 flex-1 truncate' : 'sr-only'}>
                    {sections ? null : <span className="sr-only">Step {index + 1}: </span>}
                    {item.label}
                  </span>
                  {item.done ? <span className="sr-only">(completed)</span> : null}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className={cn('flex shrink-0 flex-col gap-0.5 border-t border-border-soft py-2', expanded ? 'px-2.5' : 'px-2')}>
          {actions.map((action) => (
            <ShellActionButton key={action.label} action={action} expanded={expanded} />
          ))}
          {isDesktop ? (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className={cn(
                'focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-lg text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink',
                expanded ? 'justify-start px-2.5' : 'justify-center',
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d={expanded ? 'M16 15l-3-3 3-3' : 'M14 9l3 3-3 3'} />
              </svg>
              {expanded ? 'Collapse' : null}
            </button>
          ) : null}
          <p className={cn('mt-1 items-center gap-2 px-2.5 text-2xs font-medium text-ink-subtle', expanded ? 'flex' : 'hidden')}>
            <span className="h-1.5 w-1.5 rounded-full bg-success-fg" aria-hidden="true" />
            {note}
          </p>
        </div>
      </aside>

      {/* ── Header + page ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border-soft bg-surface-1/80 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-hue-blue)_6%,transparent)_0%,transparent_38%,transparent_62%,color-mix(in_oklab,var(--color-hue-violet)_6%,transparent)_100%)] shadow-[0_1px_0_0_var(--surface-highlight)_inset] backdrop-blur-xl backdrop-saturate-150 print:hidden">
          <div className="flex h-14 items-center gap-2 px-4 min-[360px]:gap-3 sm:h-16 sm:px-5 xl:px-6">
            <img src={logo} alt="" width={153} height={256} className="h-7 w-auto shrink-0 select-none md:hidden" draggable={false} />
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-ink sm:text-xl">{heading}</h1>

            {progress !== undefined ? (
              <div className="hidden items-center gap-2.5 lg:flex" title={`${progress}% complete`}>
                <div
                  role="progressbar"
                  aria-label="Registration progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className={cn('h-2 w-28 overflow-hidden rounded-full', TRACK)}
                >
                  <div className={cn('h-full rounded-full transition-[width] duration-300 ease-out', BAR)} style={{ width: `${progress}%` }} />
                </div>
                <span className="w-9 text-xs font-semibold tabular-nums text-ink-muted">{progress}%</span>
              </div>
            ) : null}

            <div className="flex shrink-0 items-center gap-0.5 min-[360px]:gap-1.5">
              {headerExtra}
              <ThemeSwitch dark={theme.dark} onToggle={theme.onToggle} />
              <AccountMenu user={user} actions={actions} note={note} />
            </div>
          </div>

          {/* Phones and tablets: where the patient is in the registration. */}
          {!sections && active ? (
            <div className="flex items-center gap-3 border-t border-border-soft px-4 py-2 sm:px-5 lg:hidden">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
                Step {activeIndex + 1} of {nav.length} · <span className="font-semibold text-ink">{active.label}</span>
              </span>
              {progress !== undefined ? (
                <span className={cn('h-1.5 w-20 shrink-0 overflow-hidden rounded-full sm:w-32', TRACK)} aria-hidden="true">
                  <span className={cn('block h-full rounded-full transition-[width] duration-300 ease-out', BAR)} style={{ width: `${progress}%` }} />
                </span>
              ) : null}
            </div>
          ) : null}
          {/* Phones: real sections (the portal) as a compact row that scrolls sideways. */}
          {sections ? <SectionRow nav={nav} label={navLabel} /> : null}
        </header>

        <div
          className={cn(
            'mx-auto grid w-full max-w-[100rem] flex-1 grid-cols-1 content-start gap-4 px-4 pt-4 sm:gap-5 sm:px-5 sm:pt-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:px-6',
            'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8',
          )}
        >
          <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-4xl focus:outline-none xl:mx-0 xl:max-w-none">
            {children}
          </main>
          {rail ? (
            <aside aria-label="Summary" className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-1 print:hidden">
              {rail}
            </aside>
          ) : null}
        </div>
      </div>

    </div>
  );
}

function ShellActionButton({ action, expanded }: { action: ShellAction; expanded: boolean }) {
  const className = cn(
    'focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-lg text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink',
    expanded ? 'justify-start px-2.5' : 'justify-center',
  );
  const body = (
    <>
      <Icon name={action.icon} size={17} style={{ color: TONE_HEX[toneOf(action.icon)] }} />
      <span className={expanded ? 'truncate' : 'sr-only'}>{action.label}</span>
    </>
  );
  return action.href ? (
    <a href={action.href} title={action.label} className={className}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={action.onSelect} title={action.label} className={className}>
      {body}
    </button>
  );
}

/** The sun/moon switch (DESIGN_SYSTEM §6.3); a plain icon button on phones. */
function ThemeSwitch({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="focus-ring tap-target rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink sm:hidden"
      >
        <Icon name={dark ? 'sun' : 'moon'} size={19} />
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={onToggle}
        className="focus-ring tap-target relative hidden items-center rounded-full border border-border bg-surface-2 transition-colors hover:border-border-strong sm:inline-flex"
      >
        <span aria-hidden="true" className="relative m-1 flex h-8 w-14 items-center rounded-full">
          <span
            className={cn(
              'absolute z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-1 shadow-card transition-transform duration-200 ease-out',
              dark ? 'translate-x-7 text-primary-500' : 'translate-x-1 text-warning-fg',
            )}
          >
            <Icon name={dark ? 'moon' : 'sun'} size={13} strokeWidth={2.5} />
          </span>
          <span className={cn('absolute left-1.5 text-ink-subtle transition-opacity', dark ? 'opacity-40' : 'opacity-0')}>
            <Icon name="sun" size={12} />
          </span>
          <span className={cn('absolute right-1.5 text-ink-subtle transition-opacity', dark ? 'opacity-0' : 'opacity-40')}>
            <Icon name="moon" size={12} />
          </span>
        </span>
      </button>
    </>
  );
}

/** Who this is, the record's state, and — on every screen size — the
 *  sidebar's actions, so a phone loses nothing (DESIGN_SYSTEM §8.6). */
function AccountMenu({
  user,
  actions,
  note,
}: {
  user: ShellUser;
  actions: ShellAction[];
  note: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) close();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={root} className="relative min-w-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu, ${user.name}`}
        className="focus-ring flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2"
      >
        <Avatar name={user.person ? user.name : undefined} />
        <span className="hidden min-w-0 max-w-[160px] text-left xl:block">
          <span className="block truncate text-sm font-medium leading-tight text-ink">{user.name}</span>
          <span className="block truncate text-xs leading-tight text-ink-subtle">{user.detail}</span>
        </span>
        <Icon name="chevron" size={15} className={cn('hidden text-ink-subtle transition-transform sm:block', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="fixed inset-x-4 top-[3.75rem] z-40 overflow-hidden rounded-xl border border-border-soft bg-surface-1 shadow-card-lg motion-safe:animate-[slideUp_180ms_var(--ease-premium)_both] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-64"
        >
          <div className="border-b border-border-soft px-3.5 py-3">
            <p className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-ink">{user.name}</span>
              <Badge tone={user.badge.done ? 'success' : 'warning'} className="shrink-0">
                {user.badge.label}
              </Badge>
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-ink-subtle">{user.detail}</p>
          </div>
          {actions.map((action) => {
            const className = 'focus-ring flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink';
            return action.href ? (
              <a key={action.label} role="menuitem" href={action.href} className={className}>
                <Icon name={action.icon} size={16} style={{ color: TONE_HEX[toneOf(action.icon)] }} />
                {action.label}
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  action.onSelect?.();
                }}
                className={className}
              >
                <Icon name={action.icon} size={16} style={{ color: TONE_HEX[toneOf(action.icon)] }} />
                {action.label}
              </button>
            );
          })}
          <p className="flex items-center gap-2 border-t border-border-soft px-3.5 py-2.5 text-2xs font-medium text-ink-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-success-fg" aria-hidden="true" />
            {note}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The portal's sections on a phone: a compact pill row under the header that
 *  scrolls sideways, the current one filled and kept in view, a fade on the
 *  side that has more. */
function SectionRow({ nav, label }: { nav: ShellNavItem[]; label: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: true });
  const activeKey = nav.find((item) => item.active)?.key;

  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((c) => (c.start === start && c.end === end ? c : { start, end }));
  }, []);

  useEffect(() => {
    const el = row.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && active) el.scrollTo({ left: Math.max(0, active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2), behavior: 'smooth' });
    measure();
  }, [activeKey, measure]);

  const fade = `linear-gradient(to right, ${edges.start ? 'transparent 0, #000 1.5rem' : '#000 0'}, ${edges.end ? '#000 calc(100% - 1.75rem), transparent 100%' : '#000 100%'})`;

  return (
    <nav aria-label={label} className="border-t border-border-soft md:hidden print:hidden">
      <ul
        ref={row}
        onScroll={measure}
        style={{ WebkitMaskImage: fade, maskImage: fade } as CSSProperties}
        className="scrollbar-hide flex snap-x scroll-px-4 items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-2"
      >
        {nav.map((item) => (
          <li key={item.key} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={item.onSelect}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'focus-ring tap-reach flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-all duration-200 active:scale-[0.97]',
                item.active
                  ? 'border-transparent bg-[image:var(--gradient-primary)] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_12px_-4px_rgba(37,99,235,0.5)]'
                  : 'border-border-soft bg-surface-1 text-ink-muted shadow-card-sm hover:text-ink',
              )}
            >
              <Icon name={item.icon} size={15} strokeWidth={item.active ? 2.2 : 1.9} style={item.active ? undefined : { color: TONE_HEX[toneOf(item.icon)] }} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
