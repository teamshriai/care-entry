import { useEffect, useRef, useState } from 'react';
import '../App.css';
import './portal.css';
import { Icon, IconBadge, toneOf } from '../components/Icon';
import { trackSpotlight } from '../ui';
import { maskMobile } from '../data';
import {
  CONTACTS,
  DOCUMENTS,
  FAQ,
  MEDICATIONS,
  NOTICES,
  UPCOMING,
  VISITS,
  daysUntil,
  formatDate,
  greeting,
} from './portalData';
import type { Notice } from './portalData';
import type { MockPatient } from '../types';

type Section = 'overview' | 'appointments' | 'records' | 'medications' | 'assistance';

const NAV: { key: Section; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'overview', label: 'Overview', icon: 'activity' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar' },
  { key: 'records', label: 'Records', icon: 'file' },
  { key: 'medications', label: 'Medications', icon: 'pill' },
  { key: 'assistance', label: 'Assistance', icon: 'message' },
];

export function PatientPortal({
  patient,
  dark,
  onToggleTheme,
  onSignOut,
}: {
  patient: MockPatient;
  dark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const [section, setSection] = useState<Section>('overview');
  const next = UPCOMING[0];
  const firstName = patient.name.split(' ')[0];

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <span className="brand-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2 8 4-16 2 8h6" />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">SHRI HEALTH</span>
            <span className="brand-sub">Patient portal</span>
          </span>
        </div>

        <nav className="rail" aria-label="Portal sections">
          <p className="rail-head">Your care</p>
          <ol className="rail-list">
            {NAV.map((n) => (
              <li key={n.key}>
                <button
                  className={`rail-item ${section === n.key ? 'rail-item--active' : ''}`}
                  onClick={() => setSection(n.key)}
                  aria-current={section === n.key ? 'page' : undefined}
                >
                  <span className="rail-icon">
                    <Icon name={n.icon} size={16} />
                  </span>
                  <span className="rail-label">{n.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="side-foot">
          <button className="side-action" onClick={onSignOut}>
            <Icon name="logout" size={15} />
            Sign out
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
              {section === 'overview' ? `${greeting()}, ${firstName}` : NAV.find((n) => n.key === section)?.label}
            </h1>
          </div>

          <div className="top-actions">
            <NoticeBell />

            <button
              className="theme-toggle"
              onClick={onToggleTheme}
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
                <span className="user-name">{patient.name}</span>
                <span className="user-role">{patient.systemId}</span>
              </span>
              <span className="badge badge-complete">Signed in</span>
            </div>
          </div>
        </header>

        <div className="stage-grid">
          <main className="app-main">
            {section === 'overview' && (
              <div className="portal-stack step-enter">
                {next && (
                  <section className="card portal-feature" onMouseMove={trackSpotlight}>
                    <div className="feature-head">
                      <span className="feature-label">
                        <Icon name="calendar" size={14} /> Next appointment
                      </span>
                      <span className="badge badge-draft">{daysUntil(next.date) ?? 'Scheduled'}</span>
                    </div>

                    <p className="feature-when">
                      {formatDate(next.date)} · {next.time}
                    </p>
                    <p className="feature-where">
                      {next.department} · {next.clinician}
                    </p>
                    <p className="feature-room">
                      <Icon name="mapPin" size={13} /> {next.location}
                    </p>

                    <div className="btn-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
                      <button className="btn btn-primary" onClick={() => setSection('appointments')}>
                        View appointments
                      </button>
                      <button className="btn btn-secondary" onClick={() => setSection('assistance')}>
                        Request a change
                      </button>
                    </div>
                  </section>
                )}

                <div className="quick-grid">
                  <QuickTile icon="calendar" label="Appointments" value={`${UPCOMING.length} upcoming`} onClick={() => setSection('appointments')} />
                  <QuickTile icon="file" label="Records" value={`${DOCUMENTS.length} available`} onClick={() => setSection('records')} />
                  <QuickTile icon="pill" label="Medications" value={`${MEDICATIONS.length} active`} onClick={() => setSection('medications')} />
                  <QuickTile icon="message" label="Assistance" value="Help & contacts" onClick={() => setSection('assistance')} />
                </div>

                <section className="card">
                  <div className="portal-head">
                    <IconBadge name="clock" size={30} />
                    <h2 className="portal-title">Recent visits</h2>
                  </div>
                  <ul className="line-list">
                    {VISITS.map((v) => (
                      <li key={v.id} className="line-row">
                        <span className="line-date">{formatDate(v.date)}</span>
                        <span className="line-main">
                          <span className="line-title">{v.department}</span>
                          <span className="line-sub">{v.clinician} · {v.summary}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {section === 'appointments' && (
              <section className="card step-enter">
                <div className="portal-head">
                  <IconBadge name="calendar" size={30} />
                  <h2 className="portal-title">Appointments</h2>
                </div>
                <p className="step-sub">Upcoming bookings. Changes are confirmed by reception.</p>

                <ul className="line-list">
                  {UPCOMING.map((a) => (
                    <li key={a.id} className="line-row line-row--wide">
                      <span className="line-date">
                        {formatDate(a.date)}
                        <span className="line-time">{a.time}</span>
                      </span>
                      <span className="line-main">
                        <span className="line-title">{a.department}</span>
                        <span className="line-sub">{a.clinician} · {a.location}</span>
                      </span>
                      <span className={`badge ${a.status === 'confirmed' ? 'badge-complete' : 'badge-draft'}`}>
                        {a.status === 'confirmed' ? 'Confirmed' : 'Awaiting'}
                      </span>
                    </li>
                  ))}
                </ul>

                <hr className="rule" />
                <h3 className="section-title">Past visits</h3>
                <p className="section-sub">The two most recent consultations.</p>
                <ul className="line-list">
                  {VISITS.map((v) => (
                    <li key={v.id} className="line-row">
                      <span className="line-date">{formatDate(v.date)}</span>
                      <span className="line-main">
                        <span className="line-title">{v.department}</span>
                        <span className="line-sub">{v.clinician} · {v.summary}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {section === 'records' && (
              <section className="card step-enter">
                <div className="portal-head">
                  <IconBadge name="file" size={30} />
                  <h2 className="portal-title">Records</h2>
                </div>
                <p className="step-sub">Reports released to you. Anyone collecting on your behalf needs your patient ID and their own photo identity.</p>

                <ul className="line-list">
                  {DOCUMENTS.map((d) => (
                    <li key={d.id} className="line-row line-row--wide">
                      <span className="doc-icon">
                        <Icon name="file" size={16} />
                      </span>
                      <span className="line-main">
                        <span className="line-title">{d.title}</span>
                        <span className="line-sub">{d.kind} · {formatDate(d.date)} · {d.size}</span>
                      </span>
                      <button className="icon-btn" aria-label={`Download ${d.title}`} title="Download">
                        <Icon name="download" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {section === 'medications' && (
              <section className="card step-enter">
                <div className="portal-head">
                  <IconBadge name="pill" size={30} />
                  <h2 className="portal-title">Medications</h2>
                </div>
                <p className="step-sub">Current prescriptions. Refill requests are reviewed by the prescribing clinician.</p>

                <ul className="line-list">
                  {MEDICATIONS.map((m) => (
                    <li key={m.id} className="line-row line-row--wide">
                      <span className="doc-icon">
                        <Icon name="pill" size={16} />
                      </span>
                      <span className="line-main">
                        <span className="line-title">{m.name} · {m.dose}</span>
                        <span className="line-sub">{m.schedule} · {m.prescribedBy}</span>
                      </span>
                      <span className={`badge ${m.refillsLeft > 1 ? 'badge-complete' : 'badge-draft'}`}>
                        {m.refillsLeft} refills
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {section === 'assistance' && (
              <section className="card step-enter">
                <div className="portal-head">
                  <IconBadge name="message" size={30} />
                  <h2 className="portal-title">Assistance</h2>
                </div>
                <p className="step-sub">Ask the assistant, browse common questions, or contact the hospital.</p>

                <Assistant patientName={firstName} />

                <hr className="rule" />
                <h3 className="section-title">Common questions</h3>
                <p className="section-sub">Answers to what patients ask most often.</p>

                <div className="faq">
                  {FAQ.map((item) => (
                    <FaqRow key={item.q} question={item.q} answer={item.a} />
                  ))}
                </div>

                <hr className="rule" />
                <h3 className="section-title">Contact</h3>
                <p className="section-sub">Reception is open 08:00–20:00. The helpline runs 24 hours.</p>

                <div className="contact-grid">
                  <ContactTile icon="phone" label="Reception" value={CONTACTS.reception} />
                  <ContactTile icon="message" label="24-hour helpline" value={CONTACTS.helpline} />
                </div>
              </section>
            )}
          </main>

          <aside className="side-rail">
            <section className="rail-panel">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">Your details</h2>
                <span className="badge badge-complete">Verified</span>
              </div>
              <RailRow icon="userCheck" label="Name" value={patient.name} />
              <RailRow icon="idCard" label="Patient ID" value={patient.systemId} mono />
              <RailRow icon="phone" label="Mobile" value={maskMobile(patient.mobile)} />
              <RailRow icon="calendar" label="Date of birth" value={patient.dob ?? '—'} last />
            </section>

            <section className="rail-panel rail-panel--accent">
              <div className="rail-panel-head">
                <h2 className="rail-panel-title">AI assistant</h2>
                <Icon name="brainPulse" size={16} />
              </div>
              <p className="rail-accent-copy">
                Ask about your appointments, medicines or reports and get an answer drawn from your record.
              </p>
              <button className="btn btn-secondary rail-accent-btn" onClick={() => setSection('assistance')}>
                <span className="btn-ico"><Icon name="message" size={14} /></span>
                Open the assistant
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuickTile({
  icon,
  label,
  value,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button className={`quick-tile tone-${toneOf(icon)}`} onClick={onClick} onMouseMove={trackSpotlight}>
      <span className="quick-icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="quick-label">{label}</span>
      <span className="quick-value">{value}</span>
      <span className="quick-go">
        <Icon name="chevron" size={14} />
      </span>
    </button>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-row ${open ? 'faq-row--open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>{question}</span>
        <span className="faq-chevron">
          <Icon name="chevron" size={15} />
        </span>
      </button>
      {open && <p className="faq-a">{answer}</p>}
    </div>
  );
}

function ContactTile({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}) {
  return (
    <a className="contact-tile" href={`tel:${value.replace(/\s/g, '')}`}>
      <span className="contact-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="contact-meta">
        <span className="contact-label">{label}</span>
        <span className="contact-value">{value}</span>
      </span>
    </a>
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
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`rail-row ${last ? 'rail-row--last' : ''}`}>
      <span className="rail-row-label">
        <Icon name={icon} size={13} />
        {label}
      </span>
      <span className={`rail-row-value ${mono ? 'rail-row-value--mono' : ''}`}>{value}</span>
    </div>
  );
}


/** Notification bell and its drop-down panel. */
function NoticeBell() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>(NOTICES);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = notices.filter((n) => n.unread).length;

  // A panel anchored to the header should close on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="notice-wrap" ref={wrapRef}>
      <button
        className={`theme-toggle notice-bell ${unread ? 'notice-bell--unread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
      >
        <Icon name="bell" size={16} />
        {unread > 0 && <span className="notice-count">{unread}</span>}
      </button>

      {open && (
        <div className="notice-panel step-enter">
          <div className="notice-panel-head">
            <span className="notice-panel-title">Notifications</span>
            {unread > 0 && (
              <button
                className="btn-text"
                onClick={() => setNotices((list) => list.map((n) => ({ ...n, unread: false })))}
              >
                Mark all as read
              </button>
            )}
          </div>

          <ul className="notice-list">
            {notices.map((n) => (
              <li key={n.id}>
                <button
                  className={`notice-row ${n.unread ? 'notice-row--unread' : ''}`}
                  onClick={() =>
                    setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
                  }
                >
                  <span className="notice-icon">
                    <Icon name={n.icon} size={15} />
                  </span>
                  <span className="notice-body">
                    <span className="notice-title">{n.title}</span>
                    <span className="notice-copy">{n.body}</span>
                    <span className="notice-when">{n.when}</span>
                  </span>
                  {n.unread && <span className="notice-dot" />}
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
      return `${a.department} with ${a.clinician} on ${formatDate(a.date)} at ${a.time}. Location: ${a.location}. Status: ${a.status === 'confirmed' ? 'confirmed' : 'awaiting confirmation'}.`;
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
      `Reception is ${CONTACTS.reception}, open 08:00–20:00. The 24-hour helpline is ${CONTACTS.helpline}.`,
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [turns]);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setInput('');
    setTurns((t) => [
      ...t,
      { id: t.length, role: 'you', text },
      { id: t.length + 1, role: 'bot', text: answerFor(text) },
    ]);
  }

  return (
    <div className="assistant">
      <div className="assistant-head">
        <span className="assistant-avatar">
          <Icon name="brainPulse" size={16} />
        </span>
        <span className="assistant-head-text">
          <span className="assistant-name">Care assistant</span>
          <span className="assistant-note">Answers drawn from your record. Not a substitute for clinical advice.</span>
        </span>
      </div>

      <div className="assistant-thread">
        {turns.map((t) => (
          <div key={t.id} className={`bubble bubble--${t.role}`}>
            {t.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="assistant-chips">
        {TOPICS.map((t) => (
          <button key={t.label} className="assistant-chip" onClick={() => ask(t.label)}>
            {t.label}
          </button>
        ))}
      </div>

      <form
        className="assistant-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="field-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an appointment, medicine or report"
          aria-label="Ask the assistant"
        />
        <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}
