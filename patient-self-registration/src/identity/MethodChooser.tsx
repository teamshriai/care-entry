import { Icon, IconBadge } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Badge } from '../ui/kit';
import { TONE_HEX, figureStyle, toneOf, toneVar } from '../ui/tones';

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

/** Three "doors" (DESIGN_SYSTEM §14 entry cards), each the pastel figure
 *  surface of its subject's hue with a solid chip — the front office's
 *  dashboard figures. */
export function MethodChooser({ onPick }: { onPick: (m: IdMethod) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onPick(m.key)}
            style={figureStyle(toneOf(m.icon))}
            className="focus-ring surface-raised surface-raised-hover group relative flex min-w-0 flex-col items-start gap-1 overflow-hidden rounded-xl border bg-surface-1 p-4 text-left sm:p-5"
          >
            {/* A large, faint watermark of the icon in the card's hue. */}
            <Icon
              name={m.icon}
              strokeWidth={1.5}
              className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 text-[var(--tone)] opacity-[0.07] dark:opacity-[0.1]"
            />
            <span className="relative mb-2 flex w-full items-start justify-between gap-2">
              <span className="transition-transform duration-200 group-hover:scale-105">
                <IconBadge name={m.icon} size={40} variant="solid" />
              </span>
              {m.tag && <Badge tone={m.key === 'aadhaar' ? 'primary' : 'neutral'}>{m.tag}</Badge>}
            </span>

            <span className="relative text-base font-semibold text-ink">{m.title}</span>
            <span className="relative text-sm leading-relaxed text-ink-muted">{m.copy}</span>

            <span className="relative mt-3 flex flex-col gap-1.5 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Icon name="checkCircle" size={13} className="text-success-fg" />
                {m.need}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={13} style={{ color: TONE_HEX.orange }} />
                {m.time}
              </span>
            </span>

            <span className="ink-tone relative mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold">
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

      <p
        style={toneVar('pink')}
        className="tint-surface mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed text-ink-muted"
      >
        <Icon name="heartPulse" size={16} className="ink-tone mt-0.5" />
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
