import { useMemo, useState } from 'react'
import { ChevronDown, Stethoscope } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { cn } from '../../utils/cn'
import { DoctorTimeline, HourLegend } from './DoctorTimeline'
import type { DoctorStrip, DoctorTimeline as Timeline } from '../../domain/timelineSelectors'
import type { Provider } from '../../types/doctor'

const DEFAULT_ROWS = 8

/** Bookable doctors first (soonest free hour first), then the rest. */
function rank(strip: DoctorStrip): number {
  const open = strip.hours.find((h) => h.firstOpen)
  if (open) return open.hour
  if (strip.hours.length) return 100 // working, nothing open
  return 200 // on leave / not working today
}

/**
 * Doctor Availability (dashboard): every doctor's day hour by hour, with the
 * departments as filter chips — a sideways-scrolling row on a phone — and the
 * first eight shown until the desk asks for all of them.
 */
export function DoctorAvailability({
  timeline,
  onOpenProfile,
  onBookSlot,
  onViewAll,
}: {
  timeline: Timeline
  onOpenProfile: (provider: Provider) => void
  onBookSlot: (provider: Provider, slot: string | null) => void
  onViewAll: () => void
}) {
  const [department, setDepartment] = useState<string>('All')
  const [showAll, setShowAll] = useState(false)

  const departments = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of timeline.strips) counts.set(s.row.provider.department, (counts.get(s.row.provider.department) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [timeline.strips])

  const strips = useMemo(
    () =>
      timeline.strips
        .filter((s) => department === 'All' || s.row.provider.department === department)
        .sort((a, b) => rank(a) - rank(b) || a.row.provider.name.localeCompare(b.row.provider.name)),
    [timeline.strips, department],
  )
  const visible = showAll ? strips : strips.slice(0, DEFAULT_ROWS)
  const bookable = strips.filter((s) => s.hours.some((h) => h.firstOpen)).length

  const chip = (active: boolean) =>
    cn(
      'focus-ring tap-reach flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-all duration-200',
      active
        ? 'border-transparent bg-[image:var(--gradient-primary)] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
        : 'border-border-soft bg-surface-1 text-ink-muted hover:border-border-strong hover:text-ink',
    )

  return (
    <Card accentTone="indigo">
      <CardHeader
        icon={Stethoscope}
        iconTone="indigo"
        title="Doctor Availability"
        subtitle={`${bookable} of ${strips.length} with free time today · tap an hour to book it`}
        action={
          <Button size="sm" variant="ghost" onClick={onViewAll}>
            View all
          </Button>
        }
      />

      {/* Departments — wrap on a wide screen, scroll sideways on a phone. */}
      <div role="group" aria-label="Department" className="scrollbar-hide scroll-fade-x flex gap-1.5 overflow-x-auto overflow-y-hidden border-b border-border-soft px-3.5 py-2.5 sm:px-4 lg:flex-wrap lg:px-5 lg:[mask-image:none]">
        {[['All', timeline.strips.length] as const, ...departments].map(([name, count]) => (
          <button
            key={name}
            type="button"
            aria-pressed={department === name}
            onClick={() => {
              setDepartment(name)
              setShowAll(false)
            }}
            className={chip(department === name)}
          >
            {name}
            <span className={cn('tabular-nums', department === name ? 'rounded-full bg-black/20 px-1.5 text-on-primary' : 'text-ink-subtle')}>{count}</span>
          </button>
        ))}
      </div>

      {/* How to read it. */}
      <div className="scrollbar-hide overflow-x-auto overflow-y-hidden border-b border-border-soft bg-[color-mix(in_oklab,var(--color-hue-blue)_5%,var(--color-surface-1))] px-3.5 py-2 sm:px-4 lg:px-5">
        <HourLegend className="w-max lg:w-auto" />
      </div>

      <DoctorTimeline timeline={{ ...timeline, strips: visible }} maxRows={visible.length} onOpenProfile={onOpenProfile} onBookSlot={onBookSlot} />

      {strips.length > DEFAULT_ROWS ? (
        <div className="border-t border-border-soft px-3.5 py-2 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-primary-text hover:underline"
          >
            {showAll ? 'Show fewer' : `Show all ${strips.length} doctors`}
            <ChevronDown size={15} aria-hidden="true" className={cn('transition-transform', showAll && 'rotate-180')} />
          </button>
        </div>
      ) : null}
    </Card>
  )
}
