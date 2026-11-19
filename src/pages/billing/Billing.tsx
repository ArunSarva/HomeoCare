import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const BillingDashboard = lazy(() => import('../../features/billing/pages/BillingDashboard'));
const BillingList = lazy(() => import('../../features/billing/pages/BillingList'));
const BillingDetail = lazy(() => import('../../features/billing/pages/BillingDetail'));
const BillingForm = lazy(() => import('../../features/billing/components/BillingForm'));
const RevenueReports = lazy(() => import('../../features/billing/pages/RevenueReports'));

const Billing: React.FC = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <Routes>
        <Route path="/" element={<BillingDashboard />} />
        <Route path="/dashboard" element={<BillingDashboard />} />
        <Route path="/list" element={<BillingList />} />
        <Route path="/reports" element={<RevenueReports />} />
        <Route path="/new" element={<BillingForm />} />
        <Route path="/new/:patientId" element={<BillingForm />} />
        <Route path="/:id" element={<BillingDetail />} />
        <Route path="/:id/edit" element={<BillingForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Billing;