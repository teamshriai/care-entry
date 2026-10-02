import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, ClipboardList, Plus } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { AdmissionIllustration } from '../components/ui/illustrations/AdmissionIllustration'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { MetricCard } from '../components/frontoffice/MetricCard'
import { useStoreValue } from '../hooks/useStore'
import { getAdmissionOverview, getCurrentAdmissions, getWardSummaries } from '../domain/admissionSelectors'
import { cn } from '../utils/cn'
import type { Admission, Bed } from '../types/admission'

function formatAdmissionDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// IP Admission → Ward Status: who is admitted and which wards and
// beds are free. Admitting a patient is its own page (Admit Patient); it writes to
// the same linked records (a Bed points at its Admission), so every figure below
// updates the moment an admission is confirmed.
export function AdmissionsBedManagementPage() {
  const navigate = useNavigate()
  const [selectedWard, setSelectedWard] = useState<string | null>(null)

  const overview = useStoreValue(getAdmissionOverview)
  const wards = useStoreValue(getWardSummaries)
  const admitted = useStoreValue(getCurrentAdmissions)

  const activeWard = wards.find((w) => w.ward === selectedWard) ?? wards[0] ?? null

  function admissionForBed(bed: Bed): Admission | undefined {
    return bed.currentAdmissionId ? admitted.find((a) => a.admissionId === bed.currentAdmissionId) : undefined
  }

  return (
    <div>
      <PageHeader
        title="Ward Status"
        subtitle="Admitted patients, and which wards and beds are available."
        illustration={<AdmissionIllustration className="h-8 w-8" />}
        illustrationTone="purple"
      />

      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        {(
          <>
            {/* 1. Admission overview */}
            <section aria-label="Admission overview">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <MetricCard label="Total Admitted" value={overview.totalAdmitted} icon={ClipboardList} iconTone="purple" />
                <MetricCard label="Today's Admissions" value={overview.todaysAdmissions} icon={Plus} iconTone="info" />
                <MetricCard
                  label="Pending Admissions"
                  value={overview.pendingAdmissions}
                  icon={ClipboardList}
                  iconTone="warning"
                />
                <MetricCard
                  label="Available Beds"
                  value={overview.availableBeds}
                  icon={BedDouble}
                  iconTone="stable"
                  tone="stable"
                />
                <MetricCard label="Occupied Beds" value={overview.occupiedBeds} icon={BedDouble} iconTone="rose" />
              </div>
            </section>

            {/* 2. Ward & bed availability */}
            <section aria-label="Ward and bed availability">
              <Card accentTone="stable">
                <CardHeader
                  icon={BedDouble}
                  iconTone="stable"
                  title="Ward & Bed Availability"
                  subtitle="Select a ward to see each bed"
                />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
                        <th className="px-5 py-2 font-semibold">Ward</th>
                        <th className="px-5 py-2 font-semibold">Type</th>
                        <th className="px-5 py-2 text-right font-semibold">Total Beds</th>
                        <th className="px-5 py-2 text-right font-semibold">Occupied</th>
                        <th className="px-5 py-2 text-right font-semibold">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wards.map((w) => {
                        const active = w.ward === activeWard?.ward
                        return (
                          <tr
                            key={w.ward}
                            onClick={() => setSelectedWard(w.ward)}
                            className={cn(
                              'cursor-pointer border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2',
                              active && 'bg-primary-50 hover:bg-primary-50',
                            )}
                          >
                            <td className="px-5 py-3 font-medium text-ink">
                              <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => setSelectedWard(w.ward)}
                                className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                {w.ward}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-ink-muted">{w.type}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-ink-muted">{w.total}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-ink-muted">{w.occupied}</td>
                            <td className="px-5 py-3 text-right">
                              <Badge tone={w.available > 0 ? 'stable' : 'critical'} className="tabular-nums">
                                {w.available} available
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {activeWard ? (
                  <div className="border-t border-border-soft px-5 py-4">
                    <p className="mb-3 text-sm font-semibold text-ink">
                      {activeWard.ward} — {activeWard.available} of {activeWard.total} beds available
                    </p>
                    <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {activeWard.beds.map((bed) => {
                        const occupant = admissionForBed(bed)
                        return (
                          <li
                            key={bed.bedId}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface-1 px-3 py-2"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">{bed.bedNumber}</span>
                              {occupant ? (
                                <span className="block truncate text-xs text-ink-subtle" title={occupant.patientName}>
                                  {occupant.patientName}
                                </span>
                              ) : null}
                            </span>
                            <Badge
                              tone={bed.status === 'Available' ? 'stable' : bed.status === 'Occupied' ? 'critical' : 'neutral'}
                              className="text-2xs"
                            >
                              {bed.status}
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </Card>
            </section>

            {/* 3. Current admissions */}
            <section aria-label="Current admissions">
              <Card accentTone="purple">
                <CardHeader
                  icon={ClipboardList}
                  iconTone="purple"
                  title="Current Admissions"
                  subtitle={`${admitted.length} ${admitted.length === 1 ? 'patient' : 'patients'} admitted`}
                />
                {admitted.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No admitted patients"
                    description="Patients appear here once an admission is confirmed."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
                          <th className="px-5 py-2 font-semibold">Patient</th>
                          <th className="px-5 py-2 font-semibold">UHID</th>
                          <th className="px-5 py-2 font-semibold">Ward</th>
                          <th className="px-5 py-2 font-semibold">Bed</th>
                          <th className="px-5 py-2 font-semibold">Doctor</th>
                          <th className="px-5 py-2 font-semibold">Admission Date</th>
                          <th className="px-5 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admitted.map((a) => (
                          <tr
                            key={a.admissionId}
                            className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2"
                          >
                            <td className="px-5 py-3 font-medium text-ink">
                              <button
                                type="button"
                                onClick={() => navigate(`/admissions/${a.admissionId}`)}
                                className="rounded-sm text-left underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                {a.patientName}
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.patientId}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.wardLabel ?? '—'}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.bedNumber ?? '—'}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.doctorName}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                              {formatAdmissionDate(a.admittedAt ?? a.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3">
                              <Badge status={a.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
