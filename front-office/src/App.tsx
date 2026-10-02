import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { ScheduleAppointmentPage } from './pages/ScheduleAppointmentPage'
import { OpQueuePage } from './pages/OpQueuePage'
import { GuestPassPage } from './pages/GuestPassPage'
import { EnquiryEstimatePage } from './pages/EnquiryEstimatePage'
import { MlcPage } from './pages/MlcPage'
import { BillingPage } from './pages/BillingPage'
import { AdmissionsBedManagementPage } from './pages/AdmissionsBedManagementPage'
import { AdmitPatientPage } from './pages/AdmitPatientPage'
import { DischargePage } from './pages/DischargePage'
import { AdmissionDetailPage } from './pages/AdmissionDetailPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { PaymentReceiptPage } from './pages/PaymentReceiptPage'

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
            {/* Legacy path — the day-across-all-doctors screen was folded
                into the calendar-first Schedule Appointment page. */}
            <Route path="/doctors/availability" element={<Navigate to="/appointments/new" replace />} />
            <Route path="/doctors/:providerId" element={<DoctorProfilePage />} />

            {/* Appointments — Schedule Appointment (calendar-first) is the
                single scheduling module; Appointments is its secondary
                operational list, reached from within it, not the sidebar. */}
            <Route path="/appointments/new" element={<ScheduleAppointmentPage />} />
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

            {/* IP Admission */}
            <Route path="/admissions" element={<AdmissionsBedManagementPage />} />
            <Route path="/admissions/new" element={<AdmitPatientPage />} />
            <Route path="/admissions/list" element={<Navigate to="/admissions" replace />} />
            <Route path="/admissions/beds" element={<Navigate to="/admissions" replace />} />
            <Route path="/admissions/discharge" element={<DischargePage />} />
            <Route path="/admissions/:admissionId" element={<AdmissionDetailPage />} />

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
