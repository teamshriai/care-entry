const PATHS: Record<string, string> = {
  userCheck: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 11l2 2 4-4',
  shieldCheck: 'M12 3l8 3v6c0 4.8-3.4 8.4-8 9-4.6-.6-8-4.2-8-9V6l8-3z M9 12l2 2 4-4',
  mapPin: 'M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  heartPulse: 'M20.8 8.5c0 5-8.8 10.5-8.8 10.5S3.2 13.5 3.2 8.5a4.7 4.7 0 0 1 8.8-2.3A4.7 4.7 0 0 1 20.8 8.5z M3 11h3.5l1.5-3 2 5 1.5-2.5h9',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2',
  checkCircle: 'M21 12a9 9 0 1 1-5.3-8.2 M22 4L12 14.5l-3-3',
  activity: 'M22 12h-4l-3 8-6-16-3 8H2',
  idCard: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M5 17c.4-2 1.8-3 4-3s3.6 1 4 3 M15 9h4 M15 13h4',
  calendar: 'M7 3v3 M17 3v3 M4 8h16 M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  phone: 'M4.5 4h3.6l1.6 4.4-2 1.5a12 12 0 0 0 5.4 5.4l1.5-2 4.4 1.6v3.6a1 1 0 0 1-1.1 1A17.5 17.5 0 0 1 3.5 5.1 1 1 0 0 1 4.5 4z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3.5 6.5l8.5 6 8.5-6',
  brainPulse: 'M9 4a4 4 0 0 0-4 4c-1.4.4-2 1.7-2 3s.7 2.7 2 3v1a4 4 0 0 0 4 4 M9 4a4 4 0 0 1 4-1 M13 3c2 0 4 1.5 4 4 1.4.4 2 1.7 2 3s-.7 2.7-2 3v1a4 4 0 0 1-4 4 M9 4v15 M2.5 11H6l1.3-2.6L9 12l1.3-2 .9 1h5.3',
  lock: 'M5 10.5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1z M8 10.5V7a4 4 0 0 1 8 0v3.5 M12 15v2.5',
  stethoscope: 'M6 3v5.5a4 4 0 0 0 8 0V3 M6 3H4.2 M14 3h1.8 M10 12.5v1.5a5 5 0 0 0 10 0v-1.2 M20 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 2.5v2 M12 19.5v2 M4.6 4.6l1.4 1.4 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4l1.4-1.4 M18 6l1.4-1.4',
  moon: 'M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3z',
  upload: 'M12 16.5V3.5 M7.5 8L12 3.5 16.5 8 M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15',
  file: 'M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z M14 3v5h5',
  hospital: 'M4 21V8.5L12 3l8 5.5V21 M9.5 21v-5.5h5V21 M12 7.5v4 M10 9.5h4 M2.5 21h19',
  close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
  pill: 'M16.5 3.4a5.1 5.1 0 0 1 0 7.2l-5.9 5.9a5.1 5.1 0 1 1-7.2-7.2l5.9-5.9a5.1 5.1 0 0 1 7.2 0z M6.8 6.8l7.2 7.2',
  chevron: 'M6.5 9.5l5.5 5.5 5.5-5.5',
  logout: 'M9.5 21H5.6A1.6 1.6 0 0 1 4 19.4V4.6A1.6 1.6 0 0 1 5.6 3h3.9 M16 16.5l4.5-4.5L16 7.5 M20.5 12H9.5',
  message: 'M21 11.6a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-3.9-.9L3.2 20.8l1.7-4.1A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.4z',
  alert: 'M12 3.6 2.7 20h18.6L12 3.6z M12 10v4.2 M12 17.2v.6',
  login: 'M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z M13.7 20a2 2 0 0 1-3.4 0',
  external: 'M14 4h6v6 M20 4l-8.5 8.5 M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10',
  edit: 'M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17V20z M14.5 6.5l3 3',
  download: 'M12 3.5v11 M7.8 10.3 12 14.5l4.2-4.2 M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2',
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
}: {
  name: keyof typeof PATHS;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].split(' M').map((d, i) => (
        <path key={i} d={i === 0 ? d : 'M' + d} />
      ))}
    </svg>
  );
}

/**
 * Each subject keeps one accent everywhere it appears — identity is violet,
 * health is rose, place is teal, dates are sky, time is orange, documents are
 * fuchsia, verification is green — so a patient can tell sections apart by
 * colour as well as by title. Anything not listed falls back to blue.
 */
type Tone = 'blue' | 'teal' | 'violet' | 'rose' | 'amber' | 'green' | 'sky' | 'fuchsia' | 'orange';

const TONE: Partial<Record<keyof typeof PATHS, Tone>> = {
  idCard: 'violet',
  brainPulse: 'violet',
  message: 'violet',
  heartPulse: 'rose',
  pill: 'rose',
  activity: 'rose',
  mapPin: 'teal',
  calendar: 'sky',
  hospital: 'teal',
  clock: 'orange',
  file: 'fuchsia',
  shieldCheck: 'green',
  checkCircle: 'green',
  lock: 'green',
};

/** The accent for an icon, so a card can take on the colour of the badge it carries. */
export function toneOf(name: keyof typeof PATHS) {
  return TONE[name] ?? 'blue';
}

/** A small circular tinted badge wrapping an Icon — the recurring per-section motif. */
export function IconBadge({ name, size = 30 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <span className={`icon-badge icon-badge--${toneOf(name)}`} style={{ width: size, height: size, minWidth: size }}>
      <Icon name={name} size={Math.round(size * 0.5)} />
    </span>
  );
}
