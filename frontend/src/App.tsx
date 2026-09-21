import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/app.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Customers = lazy(() => import("./pages/Customers"));
const Policies = lazy(() => import("./pages/Policies"));
const Premiums = lazy(() => import("./pages/Premiums"));
const Commission = lazy(() => import("./pages/Commission"));
const Claims = lazy(() => import("./pages/Claims"));
const Documents = lazy(() => import("./pages/Documents"));
const Employees = lazy(() => import("./pages/Employees"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const OnlinePolicyPurchase = lazy(() => import("./pages/OnlinePolicyPurchase"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/Landing"));
const InsurancePlans = lazy(() => import("./pages/InsurancePlans"));
const AdminCreateStaff = lazy(() => import("./pages/AdminCreateStaff"));
const CustomerOtpLogin = lazy(() => import("./pages/CustomerOtpLogin"));
const AdminInsurancePlans = lazy(() => import("./pages/AdminInsurancePlans"));
const PremiumCalculator = lazy(() => import("./pages/PremiumCalculator"));
const PolicyPurchases = lazy(() => import("./pages/PolicyPurchases"));
const Payment = lazy(() => import("./pages/Payment"));
const VerifyClaim = lazy(() => import("./pages/VerifyClaim"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="app-route-loading">Loading SecureLife...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/customer-otp-login" element={<CustomerOtpLogin />} />
          <Route path="/premium-calculator" element={<PremiumCalculator />} />
          <Route path="/verify-claim" element={<VerifyClaim />} />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent", "advisor"]}><Profile /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><Customers /></ProtectedRoute>} />
          <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
          <Route path="/premiums" element={<ProtectedRoute><Premiums /></ProtectedRoute>} />
          <Route path="/commission" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent", "advisor"]}><Commission /></ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute><Claims /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}><Employees /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Settings /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin-create-staff" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCreateStaff /></ProtectedRoute>} />
          <Route path="/admin-insurance-plans" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInsurancePlans /></ProtectedRoute>} />
          <Route path="/policy-purchases" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}><PolicyPurchases /></ProtectedRoute>} />

          <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/insurance-plans" element={<ProtectedRoute allowedRoles={["customer", "advisor"]}><InsurancePlans /></ProtectedRoute>} />
          <Route path="/online-policy-purchase" element={<ProtectedRoute allowedRoles={["customer"]}><OnlinePolicyPurchase /></ProtectedRoute>} />
          <Route path="/payment/:planId" element={<ProtectedRoute allowedRoles={["customer"]}><Payment /></ProtectedRoute>} />
          <Route path="/customer-profile" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerProfile /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute allowedRoles={["customer"]}><HelpCenter /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
