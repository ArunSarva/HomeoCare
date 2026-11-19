import { Routes, Route, useParams } from "react-router-dom"
import { Dashboard } from "./features/dashboard/pages/Dashboard"
import PatientList from "./features/patients/pages/PatientList"
import { PatientEdit } from "./features/patients/pages/PatientEdit"
import PatientRegistration from "./pages/patients/PatientRegistration"
import { PatientDetail } from "./features/patients/pages/PatientDetail"
import { CaseList } from "./features/cases/pages/CaseList"
import CaseDetail from "./features/cases/pages/CaseDetail"
import { CaseNew } from "./features/cases/pages/CaseNew"
import { CaseEdit } from "./features/cases/pages/CaseEdit"
import { PrescriptionList, PrescriptionBuilder } from "./features/prescriptions/pages"
import PrescriptionDetail from "./features/prescriptions/components/PrescriptionDetail"
import { FollowUpList } from "./features/followups/pages/FollowUpList"
import { FollowUpNew } from "./features/followups/pages/FollowUpNew"
import FollowUpDetail from "./features/followups/pages/FollowUpDetail"
import { AppointmentList } from "./features/appointments/pages/AppointmentList"
import { AppointmentForm } from "./features/appointments/components/AppointmentForm"
import { AppointmentDetail } from "./features/appointments/pages/AppointmentDetail"
import { InventoryList } from "./features/inventory/pages/InventoryList"
import { InventoryForm } from "./features/inventory/components/InventoryForm"
import { InventoryDetail } from "./features/inventory/pages/InventoryDetail"
import { BillingDashboard } from "./features/billing/pages/BillingDashboard"
import { BillingList } from "./features/billing/pages/BillingList"
import { BillingDetail } from "./features/billing/pages/BillingDetail"
import { BillingForm } from "./features/billing/components/BillingForm"
import { RevenueReports } from "./features/billing/pages/RevenueReports"
import { Settings } from "./features/settings/pages/Settings"
import SearchPage from "./features/search/pages/SearchPage"
import { NotFound } from "./components/NotFound"
import { ProtectedRoute } from "./components/ProtectedRoute"
import Layout from "./components/layout/Layout"

// The edit route matches at "appointments/:id/edit"; useParams() must be read
// here, inside that route's own element tree, not at the top of AppContent
// (which is matched at "/*" in App.tsx and never sees ":id").
function AppointmentEditRoute() {
  const { id } = useParams()
  return <AppointmentForm appointmentId={id} />
}

export function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Layout children={<ProtectedRoute element={<Dashboard />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="dashboard" element={<Layout children={<ProtectedRoute element={<Dashboard />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="search" element={<Layout children={<ProtectedRoute element={<SearchPage />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      
      {/* Patient routes */}
      <Route path="patients" element={<Layout children={<ProtectedRoute element={<PatientList />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="patients/new" element={<Layout children={<ProtectedRoute element={<PatientRegistration />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="patients/:id" element={<Layout children={<ProtectedRoute element={<PatientDetail />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="patients/:id/edit" element={<Layout children={<ProtectedRoute element={<PatientEdit />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      
      {/* Case routes */}
      <Route path="cases" element={<Layout children={<ProtectedRoute element={<CaseList />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="cases/new" element={<Layout children={<ProtectedRoute element={<CaseNew />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="cases/:id" element={<Layout children={<ProtectedRoute element={<CaseDetail />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="cases/:id/edit" element={<Layout children={<ProtectedRoute element={<CaseEdit />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Prescription routes */}
      <Route path="prescriptions" element={<Layout children={<ProtectedRoute element={<PrescriptionList />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="prescriptions/new" element={<Layout children={<ProtectedRoute element={<PrescriptionBuilder />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="prescriptions/:id" element={<Layout children={<ProtectedRoute element={<PrescriptionDetail />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Follow-up routes */}
      <Route path="followups" element={<Layout children={<ProtectedRoute element={<FollowUpList />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="followups/new" element={<Layout children={<ProtectedRoute element={<FollowUpNew />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="followups/:id" element={<Layout children={<ProtectedRoute element={<FollowUpDetail />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="followups/:id/edit" element={<Layout children={<ProtectedRoute element={<FollowUpNew />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Appointment routes */}
      <Route path="appointments" element={<Layout children={<ProtectedRoute element={<AppointmentList />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="appointments/new" element={<Layout children={<ProtectedRoute element={<AppointmentForm />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="appointments/:id" element={<Layout children={<ProtectedRoute element={<AppointmentDetail />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      <Route path="appointments/:id/edit" element={<Layout children={<ProtectedRoute element={<AppointmentEditRoute />} allowedRoles={["Doctor", "Receptionist", "Admin"]} />} />} />
      
      {/* Inventory routes */}
      <Route path="inventory" element={<Layout children={<ProtectedRoute element={<InventoryList />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="inventory/new" element={<Layout children={<ProtectedRoute element={<InventoryForm />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="inventory/:id" element={<Layout children={<ProtectedRoute element={<InventoryDetail />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="inventory/:id/edit" element={<Layout children={<ProtectedRoute element={<InventoryForm />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Billing routes */}
      <Route path="billing" element={<Layout children={<ProtectedRoute element={<BillingList />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="billing/new" element={<Layout children={<ProtectedRoute element={<BillingForm />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="billing/:id" element={<Layout children={<ProtectedRoute element={<BillingDetail />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="billing/:id/edit" element={<Layout children={<ProtectedRoute element={<BillingForm />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="billing/reports" element={<Layout children={<ProtectedRoute element={<RevenueReports />} allowedRoles={["Doctor", "Admin"]} />} />} />
      <Route path="billing/dashboard" element={<Layout children={<ProtectedRoute element={<BillingDashboard />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Settings routes */}
      <Route path="settings" element={<Layout children={<ProtectedRoute element={<Settings />} allowedRoles={["Doctor", "Admin"]} />} />} />
      
      {/* Not found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppContent
