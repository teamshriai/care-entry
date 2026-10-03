import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BedDouble, BedSingle, Hourglass, LogOut } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { AdmissionIllustration } from '../components/ui/illustrations/AdmissionIllustration'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { WardIcon } from '../components/ui/WardIcon'
import { StatFilter } from '../components/ui/StatFilter'
import type { StatFilterItem } from '../components/ui/StatFilter'
import { BillStatusBadge } from '../components/payment/BillStatusBadge'
import { useStoreValue } from '../hooks/useStore'
import { useNow } from '../hooks/useNow'
import { useFlow } from '../flows/useFlow'
import { getAwaitingBed, getDischargedOn, getInpatientRows, getWardSummaries } from '../domain/admissionSelectors'
import { todayKey } from '../domain/time'
import { BILL_STATUS_TONE, formatRupees } from '../utils/billing'
import { formatClock } from '../utils/format'
import { formatDateKey } from '../utils/dates'
import { cn } from '../utils/cn'
import type { Admission, Bed, Ward } from '../types/admission'
import { PatientStatusIcons } from '../components/patient/PatientStatusIcons'
import { usePatientCareStatus } from '../hooks/useCareStatus'
import { PatientsTabs } from '../components/patient/PatientsTabs'

type InpatientFilter = 'admitted' | 'awaiting' | 'beds' | 'discharged'

const FILTERS: InpatientFilter[] = ['admitted', 'awaiting', 'beds', 'discharged']

function readFilter(search: string): InpatientFilter {
  const value = new URLSearchParams(search).get('filter')
  return FILTERS.includes(value as InpatientFilter) ? (value as InpatientFilter) : 'admitted'
}

function isCritical(ward: string | null): boolean {
  return ward === 'ICU' || ward === 'Emergency'
}

function at(timestamp: number): string {
  return `${formatDateKey(todayKey(new Date(timestamp)))} · ${formatClock(timestamp)}`
}

function payerOf(admission: Admission): string {
  return admission.paymentType === 'Self Pay' ? 'Self pay' : (admission.insuranceProvider ?? admission.paymentType)
}

/**
 * Patients › Inpatients: who is in a bed, who is waiting for one, which beds are free
 * and who went home today — each figure is also the filter for the list
 * under it. Discharge sits on the patient's row, and a requested admission
 * is given its bed on its own row. A new admission starts from the
 * patient's profile, never here.
 */
export function InpatientsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { openFlow } = useFlow()
  const now = useNow(60000)
  const filter = readFilter(location.search)

  const rows = useStoreValue(getInpatientRows, now)
  const awaiting = useStoreValue(getAwaitingBed)
  const wards = useStoreValue(getWardSummaries)
  const discharged = useStoreValue(getDischargedOn, now)
  const [wardChoice, setWardChoice] = useState<Ward | null>(null)
  const activeWard = wards.find((w) => w.ward === wardChoice) ?? wards[0] ?? null

  const bedsFree = wards.reduce((sum, w) => sum + w.available, 0)
  const bedsTotal = wards.reduce((sum, w) => sum + w.total, 0)

  function selectFilter(next: InpatientFilter) {
    const query = new URLSearchParams(location.search)
    query.set('filter', next)
    // A filter is a view of this page, not a place — don't fill history.
    navigate({ search: `?${query.toString()}` }, { replace: true })
  }

  const openProfile = (patientId: string) => navigate(`/patients/${patientId}`)

  const items: StatFilterItem<InpatientFilter>[] = [
    {
      key: 'admitted',
      label: 'Inpatients',
      value: rows.length,
      context: `${rows.filter((r) => isCritical(r.admission.wardLabel)).length} in ICU / Emergency`,
      tone: 'info',
      icon: BedDouble,
    },
    { key: 'awaiting', label: 'Awaiting bed', value: awaiting.length, context: 'Admission requested', tone: 'warning', icon: Hourglass },
    { key: 'beds', label: 'Beds free', value: bedsFree, context: `of ${bedsTotal} beds`, tone: 'stable', icon: BedSingle },
    { key: 'discharged', label: 'Discharged today', value: discharged.length, context: 'Beds released', tone: 'neutral', icon: LogOut },
  ]

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Inpatients — who is in a bed, who is waiting for one, which beds are free, and who went home today."
        illustration={<AdmissionIllustration className="h-8 w-8" />}
        illustrationTone="purple"
        tabs={<PatientsTabs />}
      />

      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <StatFilter label="Show" items={items} selected={filter} onSelect={selectFilter} />

        {filter === 'admitted' ? (
          <Card>
            {rows.length === 0 ? (
              <EmptyState icon={BedDouble} title="Nobody is admitted" description="Patients appear here the moment they are admitted." />
            ) : (
              <Table head={['Patient', 'Ward · bed', 'Day', 'Doctor', 'Bill', '']}>
                {rows.map(({ admission: a, billing, billStatus }) => (
                  <tr key={a.admissionId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2">
                    <PatientCell patientId={a.patientId} name={a.patientName} detail={`${a.patientId} · ${a.admissionNumber}`} onOpen={() => openProfile(a.patientId)} />
                    <td className="whitespace-nowrap px-5 py-3">
                      <WardLabel ward={a.wardLabel} bed={a.bedNumber} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink">Day {billing.days}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      <span className="block whitespace-nowrap">{a.doctorName}</span>
                      <span className="block text-xs text-ink-subtle">{a.department}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={BILL_STATUS_TONE[billStatus]}>
                        {billing.pending > 0 ? `${billStatus} · ${formatRupees(billing.pending)}` : billStatus}
                      </Badge>
                      <span className="mt-1 block text-xs text-ink-subtle">{payerOf(a)}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => openFlow('discharge', { uhid: a.patientId })}>
                        <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Discharge
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {filter === 'awaiting' ? (
          <Card>
            {awaiting.length === 0 ? (
              <EmptyState icon={Hourglass} title="Nobody is waiting for a bed" description="Admission requests appear here until a bed is given." />
            ) : (
              <Table head={['Patient', 'Requested', 'Doctor', 'Type', 'Reason', '']}>
                {awaiting.map((a) => (
                  <tr key={a.admissionId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2">
                    <PatientCell patientId={a.patientId} name={a.patientName} detail={`${a.patientId} · ${a.admissionNumber}`} onOpen={() => openProfile(a.patientId)} />
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{at(a.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.doctorName}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={a.admissionType === 'Emergency' ? 'critical' : 'neutral'}>{a.admissionType}</Badge>
                    </td>
                    <td className="max-w-56 truncate px-5 py-3 text-ink-muted" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Button size="sm" onClick={() => openFlow('admit', { uhid: a.patientId })}>
                        <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Allot bed
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {filter === 'beds' ? (
          <Card>
            <div className="flex flex-wrap gap-2 border-b border-border-soft px-5 py-4" role="group" aria-label="Ward">
              {wards.map((w) => {
                const active = w.ward === activeWard?.ward
                return (
                  <button
                    key={w.ward}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWardChoice(w.ward)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'border-primary-600 bg-primary-50 text-primary-text' : 'border-border bg-surface-1 text-ink-muted hover:bg-surface-2',
                    )}
                  >
                    <WardIcon ward={w.ward} className={cn('h-4 w-4', isCritical(w.ward) && 'text-critical')} />
                    {w.ward}
                    <span className={cn('text-xs tabular-nums', w.available > 0 ? 'text-stable' : 'text-critical')}>
                      {w.available}/{w.total} free
                    </span>
                  </button>
                )
              })}
            </div>
            {activeWard ? (
              <ul className="grid grid-cols-1 gap-2 px-5 py-4 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {activeWard.beds.map((bed) => (
                  <BedTile
                    key={bed.bedId}
                    bed={bed}
                    occupant={rows.find((r) => r.admission.admissionId === bed.currentAdmissionId)?.admission ?? null}
                    onOpen={openProfile}
                  />
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {filter === 'discharged' ? (
          <Card>
            {discharged.length === 0 ? (
              <EmptyState icon={LogOut} title="No discharges yet today" description="Patients appear here as they are discharged." />
            ) : (
              <Table head={['Patient', 'Ward · bed', 'Discharged', 'Type', 'Final bill']}>
                {discharged.map(({ admission: a, bill }) => (
                  <tr key={a.admissionId} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-2">
                    <PatientCell patientId={a.patientId} name={a.patientName} detail={`${a.patientId} · ${a.admissionNumber}`} onOpen={() => openProfile(a.patientId)} />
                    <td className="whitespace-nowrap px-5 py-3">
                      <WardLabel ward={a.wardLabel} bed={a.bedNumber} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.dischargedAt ? at(a.dischargedAt) : '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{a.dischargeType ?? 'Normal Discharge'}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {bill ? (
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-ink">{formatRupees(bill.totalAmount)}</span>
                          <BillStatusBadge payment={bill} />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-surface-2 text-left text-xs font-semibold text-ink-muted">
            {head.map((label, index) => (
              <th key={index} className="px-5 py-2 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function PatientCell({ patientId, name, detail, onOpen }: { patientId: string; name: string; detail: string; onOpen: () => void }) {
  const care = usePatientCareStatus()
  return (
    <td className="px-5 py-3">
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-sm text-left font-medium text-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          {name}
        </button>
        <PatientStatusIcons status={care[patientId]} />
      </span>
      <span className="block whitespace-nowrap text-xs text-ink-subtle">{detail}</span>
    </td>
  )
}

function WardLabel({ ward, bed }: { ward: string | null; bed: string | null }) {
  return (
    <span className={cn('flex items-center gap-1.5', isCritical(ward) ? 'font-medium text-critical' : 'text-ink')}>
      <WardIcon ward={ward} className="h-4 w-4 shrink-0" />
      {ward ?? '—'} · {bed ?? '—'}
    </span>
  )
}

/** One bed: who is in it (opens their profile), or whether it is free. */
function BedTile({ bed, occupant, onOpen }: { bed: Bed; occupant: Admission | null; onOpen: (patientId: string) => void }) {
  const free = bed.status === 'Available'
  const body = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{bed.bedNumber}</span>
        <span className="block truncate text-xs text-ink-subtle">
          {occupant ? occupant.patientName : free ? 'Free' : bed.status}
        </span>
      </span>
      <Badge tone={free ? 'stable' : bed.status === 'Occupied' ? 'info' : 'neutral'} className="text-2xs">
        {bed.status}
      </Badge>
    </>
  )
  const tileClass = 'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors'
  return (
    <li>
      {occupant ? (
        <button type="button" onClick={() => onOpen(occupant.patientId)} title={`${occupant.patientName} · open profile`} className={cn(tileClass, 'border-info-border bg-info-bg hover:border-primary-600')}>
          {body}
        </button>
      ) : (
        <div className={cn(tileClass, free ? 'border-stable-border bg-stable-bg' : 'border-border-soft bg-surface-2')}>{body}</div>
      )}
    </li>
  )
}
