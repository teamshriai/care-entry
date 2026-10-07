import { Icon, IconBadge } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Badge } from '../ui/kit';
import { tintedSurface, toneOf } from '../ui/tones';

export type IdMethod = 'aadhaar' | 'abha' | 'manual';

const METHODS: {
  key: IdMethod;
  icon: IconName;
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

/** Three "doors" (DESIGN_SYSTEM §14 entry cards), each washed in its subject's hue. */
export function MethodChooser({ onPick }: { onPick: (m: IdMethod) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onPick(m.key)}
            style={tintedSurface(toneOf(m.icon), 0.045)}
            className="focus-ring group flex min-w-0 flex-col items-start gap-1 rounded-xl border bg-surface-1 p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-md sm:p-5"
          >
            <span className="mb-2 flex w-full items-start justify-between gap-2">
              <IconBadge name={m.icon} size={40} />
              {m.tag && <Badge tone={m.key === 'aadhaar' ? 'primary' : 'neutral'}>{m.tag}</Badge>}
            </span>

            <span className="text-base font-semibold text-ink">{m.title}</span>
            <span className="text-sm leading-relaxed text-ink-muted">{m.copy}</span>

            <span className="mt-3 flex flex-col gap-1.5 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Icon name="checkCircle" size={13} className="text-success-fg" />
                {m.need}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={13} className="text-ink-subtle" />
                {m.time}
              </span>
            </span>

            <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary-text">
              Continue
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-ink-muted">
        <Icon name="heartPulse" size={16} className="mt-0.5 text-ink-subtle" />
        <span>
          Without an ABHA account, one may be created free of charge on the ABDM portal and used to register here.{' '}
          <a
            className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-primary-text underline-offset-4 hover:underline"
            href={ABHA_PORTAL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Create an ABHA account
            <Icon name="external" size={13} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </span>
      </p>
    </>
  );
}
