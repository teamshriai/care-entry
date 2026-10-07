import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon, IconBadge } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { maskMobile } from '../data';
import { CONTACTS, DOCUMENTS, FAQ, MEDICATIONS, NOTICES, UPCOMING, VISITS, daysUntil, formatDate, formatTime, greeting } from './portalData';
import type { Notice } from './portalData';
import type { MockPatient } from '../types';
import { PatientShell } from '../ui/PatientShell';
import { Badge, Button, ButtonRow, Card, RailPanel, RailRow, Reveal, Section, StepSub } from '../ui/kit';
import { inputClass } from '../ui/classes';
import { cn } from '../ui/cn';
import { TONE_HEX, tintedSurface, toneOf } from '../ui/tones';

type SectionKey = 'overview' | 'appointments' | 'records' | 'medications' | 'assistance';

const NAV: { key: SectionKey; label: string; icon: IconName }[] = [
  { key: 'overview', label: 'Overview', icon: 'activity' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar' },
  { key: 'records', label: 'Records', icon: 'file' },
  { key: 'medications', label: 'Medications', icon: 'pill' },
  { key: 'assistance', label: 'Assistance', icon: 'message' },
];

const TITLES: Record<SectionKey, string> = {
  overview: 'Overview',
  appointments: 'Appointments',
  records: 'Records',
  medications: 'Medications',
  assistance: 'Assistance',
};

export function PatientPortal({
  patient,
  theme,
  onSignOut,
}: {
  patient: MockPatient;
  theme: { dark: boolean; toggle: () => void };
  onSignOut: () => void;
}) {
  const [section, setSection] = useState<SectionKey>('overview');
  const next = UPCOMING[0];
  const firstName = patient.name.split(' ')[0];

  function go(key: SectionKey) {
    setSection(key);
    window.scrollTo({ top: 0 });
  }

  return (
    <PatientShell
      product="Patient portal"
      navLabel="Your care"
      navKind="sections"
      nav={NAV.map((n) => ({ key: n.key, label: n.label, icon: n.icon, active: section === n.key, onSelect: () => go(n.key) }))}
      actions={[{ label: 'Sign out', icon: 'logout', onSelect: onSignOut }]}
      note="Sample data"
      heading={section === 'overview' ? `${greeting()}, ${firstName}` : TITLES[section]}
      headerExtra={<NoticeBell />}
      user={{ name: patient.name, detail: patient.systemId, badge: { label: 'Signed in', done: true } }}
      theme={{ dark: theme.dark, onToggle: theme.toggle }}
      rail={
        <>
          <RailPanel title="Your details" aside={<Badge tone="success">Verified</Badge>}>
            <RailRow icon="userCheck" label="Name" value={patient.name} />
            <RailRow icon="idCard" label="Patient ID" value={patient.systemId} mono />
            <RailRow icon="phone" label="Mobile" value={maskMobile(patient.mobile)} />
            <RailRow icon="calendar" label="Date of birth" value={patient.dob} />
          </RailPanel>

          <RailPanel title="Care assistant" accent aside={<span className="text-primary-text"><Icon name="brainPulse" size={16} /></span>}>
            <p className="text-sm leading-relaxed text-ink-muted">
              Ask about your appointments, medicines or reports and get an answer drawn from your record.
            </p>
            <Button variant="secondary" icon="message" className="mt-3 min-h-11 w-full" onClick={() => go('assistance')}>
              Open the assistant
            </Button>
          </RailPanel>
        </>
      }
    >
      {section === 'overview' && (
        <div className="flex flex-col gap-4 sm:gap-5">
          {next && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  <Icon name="calendar" size={14} /> Next appointment
                </span>
                <Badge tone="primary">{daysUntil(next.date) ?? 'Scheduled'}</Badge>
              </div>

              <div className="mt-4 flex items-start gap-4">
                <DateBlock date={next.date} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                    {formatDate(next.date)} · {formatTime(next.time)}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {next.department} · {next.clinician}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-subtle">
                    <Icon name="mapPin" size={13} /> {next.location}
                  </p>
                </div>
              </div>

              <ButtonRow className="mt-5">
                <Button onClick={() => go('appointments')}>View appointments</Button>
                <Button variant="outline" onClick={() => go('assistance')}>
                  Request a change
                </Button>
              </ButtonRow>
            </Card>
          )}

          <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-1 [&>*]:w-[42%] [&>*]:min-w-[8.5rem] [&>*]:shrink-0 [&>*]:snap-start sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:p-0 sm:[&>*]:w-auto sm:[&>*]:min-w-0 lg:grid-cols-4">
            <QuickTile icon="calendar" label="Appointments" value={`${UPCOMING.length} upcoming`} onClick={() => go('appointments')} />
            <QuickTile icon="file" label="Records" value={`${DOCUMENTS.length} available`} onClick={() => go('records')} />
            <QuickTile icon="pill" label="Medications" value={`${MEDICATIONS.length} active`} onClick={() => go('medications')} />
            <QuickTile icon="message" label="Assistance" value="Help & contacts" onClick={() => go('assistance')} />
          </div>

          <Card>
            <PortalHeading icon="clock" title="Recent visits" />
            <LineList>
              {VISITS.map((v) => (
                <LineRow key={v.id} lead={<LineDate>{formatDate(v.date)}</LineDate>} title={v.department} sub={`${v.clinician} · ${v.summary}`} />
              ))}
            </LineList>
          </Card>
        </div>
      )}

      {section === 'appointments' && (
        <Card>
          <PortalHeading icon="calendar" title="Appointments" />
          <StepSub>Upcoming bookings. Changes are confirmed by reception.</StepSub>

          <LineList>
            {UPCOMING.map((a) => (
              <LineRow
                key={a.id}
                lead={
                  <LineDate>
                    {formatDate(a.date)}
                    <span className="block font-normal text-ink-subtle">{formatTime(a.time)}</span>
                  </LineDate>
                }
                title={a.department}
                sub={`${a.clinician} · ${a.location}`}
                aside={<Badge tone={a.status === 'confirmed' ? 'success' : 'warning'}>{a.status === 'confirmed' ? 'Confirmed' : 'Awaiting'}</Badge>}
              />
            ))}
          </LineList>

          <Section title="Past visits" sub="The two most recent consultations.">
            <LineList flush>
              {VISITS.map((v) => (
                <LineRow key={v.id} lead={<LineDate>{formatDate(v.date)}</LineDate>} title={v.department} sub={`${v.clinician} · ${v.summary}`} />
              ))}
            </LineList>
          </Section>
        </Card>
      )}

      {section === 'records' && (
        <Card>
          <PortalHeading icon="file" title="Records" />
          <StepSub>Reports released to you. Anyone collecting on your behalf needs your patient ID and their own photo identity.</StepSub>

          <LineList>
            {DOCUMENTS.map((d) => (
              <LineRow
                key={d.id}
                lead={<DocIcon name="file" />}
                title={d.title}
                sub={`${d.kind} · ${formatDate(d.date)} · ${d.size}`}
                aside={
                  <button
                    type="button"
                    className="focus-ring tap-target rounded-lg border border-border-soft text-ink-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-ink"
                    aria-label={`Download ${d.title}`}
                    title="Download"
                  >
                    <Icon name="download" size={16} />
                  </button>
                }
              />
            ))}
          </LineList>
        </Card>
      )}

      {section === 'medications' && (
        <Card>
          <PortalHeading icon="pill" title="Medications" />
          <StepSub>Current prescriptions. Refill requests are reviewed by the prescribing clinician.</StepSub>

          <LineList>
            {MEDICATIONS.map((m) => (
              <LineRow
                key={m.id}
                lead={<DocIcon name="pill" />}
                title={`${m.name} · ${m.dose}`}
                sub={`${m.schedule} · ${m.prescribedBy}`}
                aside={<Badge tone={m.refillsLeft > 1 ? 'success' : 'warning'}>{m.refillsLeft} refills</Badge>}
              />
            ))}
          </LineList>
        </Card>
      )}

      {section === 'assistance' && (
        <Card>
          <PortalHeading icon="message" title="Assistance" />
          <StepSub>Ask the assistant, browse common questions, or contact the hospital.</StepSub>

          <Assistant patientName={firstName} />

          <Section title="Common questions" sub="Answers to what patients ask most often.">
            <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
              {FAQ.map((item) => (
                <FaqRow key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </Section>

          <Section title="Contact" sub="Reception is open 8:00 AM – 8:00 PM. The helpline runs 24 hours.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ContactTile icon="phone" label="Reception" value={CONTACTS.reception} />
              <ContactTile icon="message" label="24-hour helpline" value={CONTACTS.helpline} />
            </div>
          </Section>
        </Card>
      )}
    </PatientShell>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function PortalHeading({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <IconBadge name={icon} size={36} />
      <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>
    </div>
  );
}

/** The solid date block (DESIGN_SYSTEM §9.3 "next item" card). */
function DateBlock({ date }: { date: string }) {
  const d = new Date(date);
  const valid = !isNaN(d.getTime());
  return (
    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-tile-blue shadow-card" aria-hidden="true">
      <span className="text-2xs font-semibold uppercase tracking-wide text-tile-blue-fg/85">{valid ? d.toLocaleDateString('en-IN', { month: 'short' }) : ''}</span>
      <span className="text-2xl font-semibold leading-none text-tile-blue-fg">{valid ? d.getDate() : '—'}</span>
    </span>
  );
}

function LineList({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return <ul className={cn('divide-y divide-border-soft', !flush && 'mt-5 border-t border-border-soft')}>{children}</ul>;
}

function LineDate({ children }: { children: ReactNode }) {
  return <span className="w-24 shrink-0 text-sm font-semibold tabular-nums text-ink sm:w-28">{children}</span>;
}

function LineRow({ lead, title, sub, aside }: { lead: ReactNode; title: string; sub: string; aside?: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
      {lead}
      <span className="min-w-0 flex-1 basis-48">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{sub}</span>
      </span>
      {aside ? <span className="ml-auto shrink-0">{aside}</span> : null}
    </li>
  );
}

function DocIcon({ name }: { name: IconName }) {
  return <IconBadge name={name} size={36} />;
}

function QuickTile({ icon, label, value, onClick }: { icon: IconName; label: string; value: string; onClick: () => void }) {
  const tone = toneOf(icon);
  return (
    <button
      type="button"
      onClick={onClick}
      style={tintedSurface(tone, 0.045)}
      className="focus-ring group flex min-h-24 min-w-0 flex-col items-start gap-1.5 rounded-xl border bg-surface-1 p-3 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-md sm:min-h-28 sm:gap-2 sm:p-4"
    >
      <span className="transition-transform group-hover:scale-105">
        <IconBadge name={icon} size={36} />
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span className="flex w-full items-center justify-between gap-1 text-xs text-ink-muted">
        {value}
        <span style={{ color: TONE_HEX[tone] }} className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
          <Icon name="chevron" size={14} className="-rotate-90" />
        </span>
      </span>
    </button>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('bg-surface-1', open && 'bg-surface-2/50')}>
      <button
        type="button"
        className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <Icon name="chevron" size={16} className={cn('text-ink-subtle transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-ink-muted motion-safe:animate-[fadeIn_200ms_ease-out]">{answer}</p>}
    </div>
  );
}

function ContactTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <a
      className="focus-ring flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-border-soft bg-surface-1 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-md"
      href={`tel:${value.replace(/\s/g, '')}`}
    >
      <IconBadge name={icon} size={36} />
      <span className="min-w-0">
        <span className="block text-xs text-ink-subtle">{label}</span>
        <span className="block truncate text-sm font-semibold tabular-nums text-ink">{value}</span>
      </span>
    </a>
  );
}

/** Notification bell and its panel (DESIGN_SYSTEM §8.7). */
function NoticeBell() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>(NOTICES);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unread = notices.filter((n) => n.unread).length;

  // A panel anchored to the header closes on an outside press or Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="focus-ring tap-target relative rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-2xs font-semibold leading-none tabular-nums text-on-danger">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[3.75rem] z-40 overflow-hidden rounded-xl border border-border-soft bg-surface-1 shadow-card-lg motion-safe:animate-[slideUp_180ms_var(--ease-premium)_both] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-[calc(100vw-2rem)] sm:max-w-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border-soft px-3.5 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="focus-ring inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-primary-text hover:underline"
                onClick={() => setNotices((list) => list.map((n) => ({ ...n, unread: false })))}
              >
                Mark all as read
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto overscroll-contain">
            {notices.map((n) => (
              <li key={n.id} className="border-b border-border-soft last:border-b-0">
                <button
                  type="button"
                  className={cn(
                    'focus-ring flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-surface-2',
                    n.unread && 'bg-primary-50/40',
                  )}
                  onClick={() => setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                >
                  <IconBadge name={n.icon} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-muted">{n.body}</span>
                    <span className="mt-1 block text-xs text-ink-subtle">{n.when}</span>
                  </span>
                  {n.unread && (
                    <span className="shrink-0 rounded-full bg-primary-100 px-1.5 py-0.5 text-2xs font-semibold text-primary-text">New</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface Turn {
  id: number;
  role: 'you' | 'bot';
  text: string;
}

/**
 * A guided assistant. Every answer is composed from the record already on this
 * page — there is no model behind it and no free-form medical advice. Anything
 * it cannot answer is handed to the helpline rather than guessed at.
 */
const TOPICS: { label: string; match: string[]; answer: () => string }[] = [
  {
    label: 'When is my next appointment?',
    match: ['appointment', 'visit', 'booking', 'when'],
    answer: () => {
      const a = UPCOMING.find((x) => x.status !== 'completed');
      if (!a) return 'You have no upcoming appointments booked.';
      return `${a.department} with ${a.clinician} on ${formatDate(a.date)} at ${formatTime(a.time)}. Location: ${a.location}. Status: ${a.status === 'confirmed' ? 'confirmed' : 'awaiting confirmation'}.`;
    },
  },
  {
    label: 'What medicines am I taking?',
    match: ['medicine', 'medication', 'tablet', 'drug', 'dose'],
    answer: () =>
      'Currently prescribed: ' +
      MEDICATIONS.map((m) => `${m.name} ${m.dose}, ${m.schedule.toLowerCase()}`).join('; ') +
      '. Full details are under Medications.',
  },
  {
    label: 'Are my reports ready?',
    match: ['report', 'record', 'result', 'scan', 'document'],
    answer: () =>
      `${DOCUMENTS.length} documents have been released, the most recent being ${DOCUMENTS[0].title} on ${formatDate(DOCUMENTS[0].date)}. All of them are under Records.`,
  },
  {
    label: 'How do I request a refill?',
    match: ['refill', 'renew', 'repeat', 'prescription'],
    answer: () => {
      const low = MEDICATIONS.reduce((a, b) => (a.refillsLeft <= b.refillsLeft ? a : b));
      return `Open Medications and use Request refill on the item you need. The prescribing clinician reviews every request before it is dispensed. ${low.name} is lowest, with ${low.refillsLeft} refill${low.refillsLeft === 1 ? '' : 's'} remaining.`;
    },
  },
  {
    label: 'I need urgent help',
    match: ['urgent', 'emergency', 'stroke', 'pain', 'chest', 'help now', 'ambulance'],
    answer: () =>
      `For sudden facial droop, arm weakness or slurred speech, call ${CONTACTS.emergency} immediately — do not wait for an appointment. For anything else outside clinic hours, the 24-hour helpline is ${CONTACTS.helpline}.`,
  },
  {
    label: 'How do I reach the hospital?',
    match: ['contact', 'phone', 'call', 'reception', 'number', 'reach'],
    answer: () =>
      `Reception is ${CONTACTS.reception}, open 8:00 AM – 8:00 PM. The 24-hour helpline is ${CONTACTS.helpline}.`,
  },
];

function answerFor(question: string) {
  const q = question.toLowerCase();
  const hit = TOPICS.find((t) => t.match.some((m) => q.includes(m)));
  if (hit) return hit.answer();
  return `That is outside what I can answer from your record. For anything clinical, please call the helpline on ${CONTACTS.helpline}, and a member of staff will help.`;
}

function Assistant({ patientName }: { patientName: string }) {
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: 0,
      role: 'bot',
      text: `Hello ${patientName}. I can answer questions about your appointments, medicines and reports. Choose one below or type your own.`,
    },
  ]);
  const [input, setInput] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the newest answer in view inside the transcript — never scroll the page.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setInput('');
    setTurns((t) => [...t, { id: t.length, role: 'you', text }, { id: t.length + 1, role: 'bot', text: answerFor(text) }]);
  }

  return (
    <Reveal className="mt-5 overflow-hidden rounded-xl border border-border-soft bg-surface-1">
      <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-sky text-accent-sky-fg">
          <Icon name="brainPulse" size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Care assistant</span>
          <span className="block text-xs text-ink-subtle">Answers drawn from your record. Not a substitute for clinical advice.</span>
        </span>
      </div>

      <div ref={threadRef} role="log" aria-live="polite" className="flex max-h-80 flex-col gap-2.5 overflow-y-auto overscroll-contain bg-surface-2/50 p-4">
        {turns.map((t) => (
          <div
            key={t.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed motion-safe:animate-[slideUp_220ms_var(--ease-premium)_both]',
              t.role === 'you' ? 'self-end rounded-br-md bg-primary-600 text-on-primary' : 'self-start rounded-bl-md border border-border-soft bg-surface-1 text-ink',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border-soft p-3">
        {TOPICS.map((t) => (
          <button
            key={t.label}
            type="button"
            className="focus-ring min-h-11 rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            onClick={() => ask(t.label)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 border-t border-border-soft p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className={inputClass}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an appointment, medicine or report"
          aria-label="Ask the assistant"
        />
        <Button type="submit" className="min-h-11 shrink-0 px-4" disabled={!input.trim()}>
          Ask
        </Button>
      </form>
    </Reveal>
  );
}
