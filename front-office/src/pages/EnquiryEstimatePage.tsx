import { useMemo, useState } from 'react'
import { Receipt, Plus, Minus, Trash2, Search, IndianRupee, CalendarPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useStoreValue } from '../hooks/useStore'
import { useToast } from '../hooks/useToast'
import { usePatientContext } from '../hooks/usePatientContext'
import { getTariffs, getDepartments, getActiveEstimateForPatient } from '../domain/selectors'
import { addEstimateItem, updateEstimateItemQuantity, removeEstimateItem, saveEstimate, createPaymentBill } from '../domain/actions'
import { initialsOf } from '../utils/format'
import { billNumberFor } from '../utils/billing'
import type { Tariff } from '../types/frontDesk'

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`

/** An estimate always belongs to exactly one patient — the counter's own
 *  patient context (the same one used by Book Appointment, Visit Opening
 *  and MLC) gates every "Add", so there is no anonymous/global estimate to
 *  accidentally add a service into. */
export function EnquiryEstimatePage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { patient, clearPatient } = usePatientContext()

  const tariffs = useStoreValue(getTariffs)
  const departments = useStoreValue(getDepartments)
  const estimate = useStoreValue(getActiveEstimateForPatient, patient?.patientId ?? '')

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
      notify('Estimate saved', { detail: `${saved.estimateId} · ${rupees(saved.total)}` })
    } catch (err) {
      notify('Could not save estimate', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleCreateBill() {
    if (!estimate || !patient) return
    try {
      const bill = createPaymentBill({
        patientId: patient.patientId,
        estimateId: estimate.estimateId,
        items: estimate.items.map((item) => ({
          code: item.code,
          description: item.name,
          amount: item.rate * (item.quantity ?? 1),
        })),
      })
      notify('Bill created', { detail: `${billNumberFor(bill)} · ${rupees(bill.totalAmount)}` })
      navigate(`/payments/${bill.paymentId}`)
    } catch (err) {
      notify('Could not create bill', { tone: 'error', detail: err instanceof Error ? err.message : String(err) })
    }
  }

  const hasItems = Boolean(estimate && estimate.items.length > 0)
  const canCreateBill = Boolean(estimate && estimate.status !== 'Cancelled' && hasItems)

  return (
    <div>
      <PageHeader
        title="Enquiry & Estimate"
        subtitle="Published rate card and cost estimates. Rates are a straight lookup from the hospital tariff — never predicted."
      />

      <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
        {/* Patient gate / context — the same PatientContext used across the portal */}
        <Card>
          <CardBody>
            {patient ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initialsOf(patient.name)} size="sm" />
                    <div>
                      <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">Patient</p>
                      <p className="text-sm font-semibold text-ink">{patient.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">UHID</p>
                    <p className="text-sm text-ink">{patient.uhid}</p>
                  </div>
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">Mobile</p>
                    <p className="text-sm text-ink">{patient.mobile}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={clearPatient}>
                  Change Patient
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Select a patient to create an estimate</p>
                  <p className="text-xs text-ink-muted">
                    Services can be browsed below, but every estimate belongs to a specific patient.
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate('/patients/search')}>
                  <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Find Patient
                </Button>
              </div>
            )}
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
                          {rupees(tariff.rate)}
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
                            <p className="text-xs text-ink-muted">{rupees(item.rate)} each</p>
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
                              {rupees(item.rate * quantity)}
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
                    <span className="text-xl font-semibold tabular-nums text-ink">{rupees(estimate.total)}</span>
                  </div>
                ) : null}

                <p className="text-xs text-ink-faint">
                  An estimate is not an invoice — billing and collection happen at the billing counter.
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
                        {canCreateBill ? (
                          <Button size="sm" variant="secondary" onClick={handleCreateBill}>
                            <IndianRupee className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Create Bill
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => navigate('/appointments/new')}>
                      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Schedule Appointment
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
