import { useMemo, useState } from 'react'
import { Receipt, Plus, Minus, Trash2, Search, IndianRupee, CalendarPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PatientPickField } from '../components/patient/PatientPickField'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { useFlow } from '../flows/useFlow'
import { getTariffs, getDepartments, getActiveEstimateForPatient, getBillForEstimate, getPatientById } from '../domain/selectors'
import { addEstimateItem, updateEstimateItemQuantity, removeEstimateItem, saveEstimate } from '../domain/actions'
import { billNumberFor, formatRupees } from '../utils/billing'
import type { Tariff } from '../types/frontDesk'


/** An estimate always belongs to exactly one patient — the patient chosen
 *  here gates every "Add", so there is no anonymous/global estimate to
 *  accidentally add a service into. */
export function EnquiryEstimatePage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { openFlow } = useFlow()
  const [patientId, setPatientId] = useState('')
  const patient = useStoreValue(getPatientById, patientId)

  const tariffs = useStoreValue(getTariffs)
  const departments = useStoreValue(getDepartments)
  const estimate = useStoreValue(getActiveEstimateForPatient, patient?.patientId ?? '')
  const estimateBill = useStoreValue(getBillForEstimate, estimate?.estimateId ?? '')

  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All departments')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tariffs.filter((tariff) => {
      const matchesTerm = term.length === 0 || tariff.name.toLowerCase().includes(term) || tariff.code.toLowerCase().includes(term)
      const matchesDept = department === 'All departments' || tariff.department === department
      return matchesTerm && matchesDept
    })
  }, [tariffs, query, department])

  function handleAdd(tariff: Tariff) {
    if (!patient) {
      notify('Select a patient first', { tone: 'error', detail: 'An estimate must be linked to a patient before adding a service.' })
      return
    }
    try {
      addEstimateItem({
        patientId: patient.patientId,
        patientName: patient.name,
        item: { code: tariff.code, name: tariff.name, rate: tariff.rate, quantity: 1 },
      })
    } catch (err) {
      notify('Could not add service', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleQuantity(code: string, quantity: number) {
    if (!estimate) return
    try {
      updateEstimateItemQuantity({ estimateId: estimate.estimateId, code, quantity })
    } catch (err) {
      notify('Could not update quantity', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleRemove(code: string) {
    if (!estimate) return
    removeEstimateItem({ estimateId: estimate.estimateId, code })
  }

  function handleSave() {
    if (!estimate) return
    try {
      const saved = saveEstimate(estimate.estimateId)
      notify('Estimate saved', { detail: `${saved.estimateId} · ${formatRupees(saved.total)}` })
    } catch (err) {
      notify('Could not save estimate', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  // No pay-later: the estimate becomes a bill only as it is paid, in the
  // billing flow, so there is never an unpaid estimate bill.
  function handleCollect() {
    if (!estimate || !patient) return
    openFlow('billing', { uhid: patient.uhid, estimate: estimate.estimateId })
  }

  const hasItems = Boolean(estimate && estimate.items.length > 0)
  const canCollect = Boolean(estimate && estimate.status !== 'Cancelled' && hasItems && !estimateBill)

  return (
    <div>
      <PageHeader
        title="Enquiry & Estimate"
        subtitle="Published rate card and cost estimates. Rates are a straight lookup from the hospital tariff — never predicted."
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {/* Patient gate — every estimate belongs to one patient */}
        <Card>
          <CardBody className="flex flex-col gap-2 lg:max-w-xl">
            <p className="text-xs font-medium text-ink-muted">Patient</p>
            <PatientPickField
              patient={patient}
              onChange={(next) => setPatientId(next.patientId)}
              placeholder="Search the patient this estimate is for"
              detail={patient?.mobile}
            />
            {!patient ? (
              <p className="text-xs text-ink-muted">Services can be browsed below; every estimate belongs to a specific patient.</p>
            ) : null}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Available services */}
          <Card className="min-w-0">
            <CardHeader icon={Receipt} iconTone="stable" title="Available Services" subtitle="Displayed rates for enquiries at the counter" />
            <div className="flex flex-col gap-3 border-b border-border-soft p-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search services..."
                  className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
              >
                <option>All departments</option>
                {departments.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No services match" description="Try a different search or department." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                      <th className="px-5 py-2.5 font-medium">Service</th>
                      <th className="px-5 py-2.5 font-medium">Department</th>
                      <th className="px-5 py-2.5 font-medium text-right">Rate</th>
                      <th className="px-5 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tariff) => (
                      <tr key={tariff.code} className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-surface-subtle">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink">{tariff.name}</p>
                          <p className="text-2xs text-ink-faint">{tariff.code}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{tariff.department}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-ink">
                          {formatRupees(tariff.rate)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!patient}
                            title={patient ? undefined : 'Select a patient first'}
                            onClick={() => handleAdd(tariff)}
                          >
                            <Plus className="h-3.5 w-3.5 text-stable" strokeWidth={2} />
                            Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Estimate for the selected patient */}
          <div className="min-w-0">
            <Card className="2xl:sticky 2xl:top-6">
              <CardHeader
                title={patient ? `Estimate for ${patient.name}` : 'Estimate'}
                subtitle={estimate ? estimate.estimateId : undefined}
                action={estimate ? <Badge status={estimate.status} /> : undefined}
              />
              <CardBody className="flex flex-col gap-4">
                {!patient ? (
                  <p className="text-sm text-ink-muted">Select a patient to see or start their estimate.</p>
                ) : !estimate || estimate.items.length === 0 ? (
                  <p className="text-sm text-ink-muted">No estimate yet. Add services from the list to start one for {patient.name}.</p>
                ) : (
                  <div className="divide-y divide-border-soft">
                    {estimate.items.map((item) => {
                      const quantity = item.quantity ?? 1
                      return (
                        <div key={item.code} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-ink" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-xs text-ink-muted">{formatRupees(item.rate)} each</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex items-center gap-1 rounded-lg border border-border px-1">
                              <button
                                type="button"
                                onClick={() => handleQuantity(item.code, quantity - 1)}
                                disabled={quantity <= 1}
                                aria-label={`Decrease quantity for ${item.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                              >
                                <Minus className="h-3 w-3" strokeWidth={2} />
                              </button>
                              <span className="w-5 text-center text-xs font-medium tabular-nums text-ink">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantity(item.code, quantity + 1)}
                                aria-label={`Increase quantity for ${item.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                              >
                                <Plus className="h-3 w-3" strokeWidth={2} />
                              </button>
                            </div>
                            <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-ink">
                              {formatRupees(item.rate * quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.code)}
                              aria-label={`Remove ${item.name}`}
                              className="rounded p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-critical"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {hasItems && estimate ? (
                  <div className="flex items-baseline justify-between border-t border-border-soft pt-3">
                    <span className="text-sm text-ink-muted">Estimated Total</span>
                    <span className="text-xl font-semibold tabular-nums text-ink">{formatRupees(estimate.total)}</span>
                  </div>
                ) : null}

                <p className="text-xs text-ink-faint">
                  An estimate is not an invoice — Collect raises the bill as it is paid.
                </p>

                {patient ? (
                  <div className="flex flex-wrap gap-2 border-t border-border-soft pt-4">
                    {hasItems && estimate ? (
                      <>
                        <Button size="sm" onClick={handleSave}>
                          Save Estimate
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => window.print()}>
                          Print Estimate
                        </Button>
                        {canCollect && estimate ? (
                          <Button size="sm" onClick={handleCollect}>
                            <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Collect {formatRupees(estimate.total)}
                          </Button>
                        ) : estimateBill ? (
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/payments/${estimateBill.paymentId}`)}>
                            <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Paid · {billNumberFor(estimateBill)}
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => openFlow('schedule', patient ? { uhid: patient.uhid } : {})}>
                      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Schedule
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
