import { Icon, IconBadge, toneOf } from '../components/Icon';
import { trackSpotlight } from '../ui';
import './identity.css';

export type IdMethod = 'aadhaar' | 'abha' | 'manual';

const METHODS: {
  key: IdMethod;
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  copy: string;
  need: string;
  time: string;
  tag?: string;
}[] = [
  {
    key: 'aadhaar',
    icon: 'idCard',
    title: 'Aadhaar',
    copy: 'Name, date of birth and address are retrieved on verification.',
    need: 'Aadhaar number and registered mobile',
    time: 'Approx. 1 minute',
    tag: 'Recommended',
  },
  {
    key: 'abha',
    icon: 'heartPulse',
    title: 'ABHA',
    copy: 'Profile details are retrieved from your health account.',
    need: 'ABHA number or ABHA address',
    time: 'Approx. 1 minute',
  },
  {
    key: 'manual',
    icon: 'userCheck',
    title: 'Enter details manually',
    copy: 'Provide your details directly. No identity document required.',
    need: 'No document required',
    time: 'Approx. 3 minutes',
    tag: 'No document',
  },
];

/** Official ABDM portal where a patient without an ABHA can create one. */
const ABHA_PORTAL = 'https://abha.abdm.gov.in/';

export function MethodChooser({ onPick }: { onPick: (m: IdMethod) => void }) {
  return (
    <>
    <div className="method-grid">
      {METHODS.map((m) => (
        <button
          key={m.key}
          className={`method-card tone-${toneOf(m.icon)}`}
          onMouseMove={trackSpotlight}
          onClick={() => onPick(m.key)}
        >
          <span className="method-top">
            <IconBadge name={m.icon} size={34} />
            {m.tag && <span className="badge badge-draft">{m.tag}</span>}
          </span>

          <span className="method-title">{m.title}</span>
          <span className="method-copy">{m.copy}</span>

          <span className="method-meta">
            <span className="method-meta-row">
              <Icon name="checkCircle" size={13} />
              {m.need}
            </span>
            <span className="method-meta-row">
              <Icon name="clock" size={13} />
              {m.time}
            </span>
          </span>

          <span className="method-go">
            Continue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      ))}
    </div>

    <p className="method-note">
      <Icon name="heartPulse" size={15} />
      <span>
        Without an ABHA account, one may be created free of charge on the ABDM portal and used to register here.
        {' '}
        <a className="method-link" href={ABHA_PORTAL} target="_blank" rel="noopener noreferrer">
          Create an ABHA account
          <Icon name="external" size={13} />
        </a>
      </span>
    </p>
    </>
  );
}
