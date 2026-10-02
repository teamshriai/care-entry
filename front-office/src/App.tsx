import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ThemeProvider } from './contexts/ThemeProvider'
import { PatientProvider } from './contexts/PatientContext'
import { ToastProvider } from './components/ui/ToastProvider'
import { FrontOfficeHomePage } from './pages/FrontOfficeHomePage'
import { FindPatientPage } from './pages/FindPatientPage'
import { PatientListPage } from './pages/PatientListPage'
import { RegisterPatientPage } from './pages/RegisterPatientPage'
import { PatientProfilePage } from './pages/PatientProfilePage'
import { DoctorDirectoryPage } from './pages/DoctorDirectoryPage'
import { RegisterDoctorPage } from './pages/RegisterDoctorPage'
import { DoctorProfilePage } from './pages/DoctorProfilePage'
import { TodaysAppointmentsPage } from './pages/TodaysAppointmentsPage'
import { OpQueuePage } from './pages/OpQueuePage'
import { GuestPassPage } from './pages/GuestPassPage'
import { EnquiryEstimatePage } from './pages/EnquiryEstimatePage'
import { MlcPage } from './pages/MlcPage'
import { BillingPage } from './pages/BillingPage'
import { InpatientsPage } from './pages/InpatientsPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { PaymentReceiptPage } from './pages/PaymentReceiptPage'
import { todayKey } from './domain/time'
import { useStoreValue } from './hooks/useStore'
import { getAdmissionById } from './domain/admissionSelectors'

/**
 * Starts the page afresh when its query changes — Register opened from the
 * search box carries what was typed (?name= / ?mobile=). Keyed on the query
 * only, never on every navigation, so a flow opening over a page never
 * resets it.
 */
function FreshOnQuery({ children }: { children: ReactNode }) {
  const { search } = useLocation()
  return <div key={search}>{children}</div>
}

/** Old links to /appointments/new (with a doctor or slot in router state)
 *  open the schedule flow over Appointments, carrying that starting point. */
function ScheduleRedirect() {
  const location = useLocation()
  const state = (location.state ?? {}) as { providerId?: string; slot?: string; date?: string }
  const params = new URLSearchParams({ flow: 'schedule' })
  if (state.providerId) params.set('doctor', state.providerId)
  if (state.slot) {
    params.set('date', state.date ?? todayKey())
    params.set('slot', state.slot)
  }
  return <Navigate to={`/appointments?${params.toString()}`} replace />
}

/** Old links to /admissions/discharge (with an admission in router state)
 *  open the discharge flow over Inpatients. */
function DischargeRedirect() {
  const location = useLocation()
  const admissionId = (location.state as { admissionId?: string } | null)?.admissionId
  const params = new URLSearchParams({ flow: 'discharge' })
  if (admissionId) params.set('admission', admissionId)
  return <Navigate to={`/admissions?${params.toString()}`} replace />
}

/** An admission has no page of its own any more — it lives on the patient's
 *  profile. */
function AdmissionRedirect() {
  const { admissionId } = useParams<{ admissionId: string }>()
  const admission = useStoreValue(getAdmissionById, admissionId ?? '')
  return <Navigate to={admission ? `/patients/${admission.patientId}` : '/admissions'} replace />
}

// No auth route — no authentication or backend infrastructure is built here
// (none exists to integrate with). The app opens straight into the shared
// Care Entry workspace.
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PatientProvider>
          <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<FrontOfficeHomePage />} />

            {/* Patients */}
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/search" element={<FindPatientPage />} />
            <Route path="/patients/:uhid" element={<PatientProfilePage />} />
            <Route
              path="/register/new"
              element={
                <FreshOnQuery>
                  <RegisterPatientPage />
                </FreshOnQuery>
              }
            />

            {/* Doctors */}
            <Route path="/doctors" element={<DoctorDirectoryPage />} />
            <Route path="/doctors/register" element={<RegisterDoctorPage />} />
            {/* Legacy path — doctor availability lives in the schedule flow. */}
            <Route path="/doctors/availability" element={<Navigate to="/appointments?flow=schedule" replace />} />
            <Route path="/doctors/:providerId" element={<DoctorProfilePage />} />

            {/* Appointments — scheduling is a flow over the current page;
                the old booking route opens it over Appointments. */}
            <Route path="/appointments/new" element={<ScheduleRedirect />} />
            <Route path="/appointments" element={<TodaysAppointmentsPage />} />

            {/* Visits & queue */}
            <Route path="/op-queue" element={<OpQueuePage />} />

            {/* Services */}
            <Route path="/services/guest-pass" element={<GuestPassPage />} />
            <Route path="/services/enquiry" element={<EnquiryEstimatePage />} />
            <Route path="/services/mlc" element={<MlcPage />} />

            {/* Billing — one page; collecting happens in the billing flow */}
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/bills" element={<Navigate to="/billing?filter=all" replace />} />

            {/* Inpatients — admit and discharge are flows over the board */}
            <Route path="/admissions" element={<InpatientsPage />} />
            <Route path="/admissions/new" element={<Navigate to="/admissions?flow=admit" replace />} />
            <Route path="/admissions/list" element={<Navigate to="/admissions" replace />} />
            <Route path="/admissions/beds" element={<Navigate to="/admissions?filter=beds" replace />} />
            <Route path="/admissions/discharge" element={<DischargeRedirect />} />
            <Route path="/admissions/:admissionId" element={<AdmissionRedirect />} />

            {/* Payments — the old list pages now land on Billing's filters, and
                Collect Payment opens the billing flow; one bill and its
                receipt keep their own pages. */}
            <Route path="/payments" element={<Navigate to="/billing" replace />} />
            <Route path="/payments/pending" element={<Navigate to="/billing?filter=due" replace />} />
            <Route path="/payments/history" element={<Navigate to="/billing?filter=all" replace />} />
            <Route path="/payments/collect" element={<Navigate to="/billing?filter=due&flow=billing" replace />} />
            <Route path="/payments/:paymentId" element={<PaymentDetailPage />} />
            <Route path="/payments/:paymentId/receipt" element={<PaymentReceiptPage />} />

            {/* Legacy paths kept working so older links don't dead-end */}
            <Route path="/front-office" element={<Navigate to="/" replace />} />
            <Route path="/services/attendant-pass" element={<Navigate to="/services/guest-pass" replace />} />
            <Route path="/front-office/attendant-pass" element={<Navigate to="/services/guest-pass" replace />} />
            <Route path="/front-office/enquiry" element={<Navigate to="/services/enquiry" replace />} />
            <Route path="/front-office/mlc" element={<Navigate to="/services/mlc" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PatientProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
