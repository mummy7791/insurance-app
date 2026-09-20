import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const RoleDashboard = lazy(() => import("./pages/RoleDashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Customers = lazy(() => import("./pages/Customers"));
const Policies = lazy(() => import("./pages/Policies"));
const Premiums = lazy(() => import("./pages/Premiums"));
const Payment = lazy(() => import("./pages/Payment"));
const Commission = lazy(() => import("./pages/Commission"));
const Claims = lazy(() => import("./pages/Claims"));
const Documents = lazy(() => import("./pages/Documents"));
const Calendar = lazy(() => import("./pages/Calendar"));
const GpsTracking = lazy(() => import("./pages/GpsTracking"));
const Employees = lazy(() => import("./pages/Employees"));
const Branch = lazy(() => import("./pages/Branch"));
const Targets = lazy(() => import("./pages/Targets"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Communication = lazy(() => import("./pages/Communication"));
const PdfReports = lazy(() => import("./pages/PdfReports"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const ExcelReports = lazy(() => import("./pages/ExcelReports"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const AIFollowup = lazy(() => import("./pages/AIFollowup"));
const AIPerformance = lazy(() => import("./pages/AIPerformance"));
const AILeadScoring = lazy(() => import("./pages/AILeadScoring"));
const AISalesPrediction = lazy(() => import("./pages/AISalesPrediction"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const EmailMarketing = lazy(() => import("./pages/EmailMarketing"));
const PolicyRecommendationAI = lazy(() => import("./pages/PolicyRecommendationAI"));
const CEODashboard = lazy(() => import("./pages/CEODashboard"));
const OCRVerification = lazy(() => import("./pages/OCRVerification"));
const EnterpriseTools = lazy(() => import("./pages/EnterpriseTools"));
const FileManager = lazy(() => import("./pages/FileManager"));
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
const AiPolicyRecommendation = lazy(() => import("./pages/AiPolicyRecommendation"));
const PolicyPurchases = lazy(() => import("./pages/PolicyPurchases"));
const AssignPolicy = lazy(() => import("./admin/AssignPolicy"));



import Profile from "./pages/Profile"
























































import "./styles/app.css";

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="app-route-loading">Loading SecureLife...</div>}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/customer-otp-login" element={<CustomerOtpLogin />} />
        <Route path="/premium-calculator" element={<PremiumCalculator />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/role-dashboard"
          element={
            <ProtectedRoute>
              <RoleDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leads"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <Leads />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/policies"
          element={
            <ProtectedRoute>
              <Policies />
            </ProtectedRoute>
          }
        />

        <Route
          path="/premiums"
          element={
            <ProtectedRoute>
              <Premiums />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/commission"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <Commission />
            </ProtectedRoute>
          }
        />

        <Route
          path="/claims"
          element={
            <ProtectedRoute>
              <Claims />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gps-tracking"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}>
              <GpsTracking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/branch"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm"]}>
              <Branch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/targets"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <Targets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communication"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <Communication />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pdf-reports"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <PdfReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/excel-reports"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}
            >
              <ExcelReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user-management"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["admin", "bm"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />

        <Route path="/ai-followups" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><AIFollowup /></ProtectedRoute>} />
        <Route path="/ai-performance" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><AIPerformance /></ProtectedRoute>} />
        <Route path="/ai-lead-scoring" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><AILeadScoring /></ProtectedRoute>} />
        <Route path="/ai-sales-prediction" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><AISalesPrediction /></ProtectedRoute>} />
        <Route path="/customer-portal" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerPortal /></ProtectedRoute>} />
        <Route path="/email-marketing" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><EmailMarketing /></ProtectedRoute>} />
        <Route path="/policy-recommendation-ai" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><PolicyRecommendationAI /></ProtectedRoute>} />
        <Route path="/ceo-dashboard" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><CEODashboard /></ProtectedRoute>} />
        <Route path="/ocr-verification" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><OCRVerification /></ProtectedRoute>} />
        <Route path="/enterprise-tools" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><EnterpriseTools /></ProtectedRoute>} />
        <Route path="/file-manager" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager", "agent"]}><FileManager /></ProtectedRoute>} />
        <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/online-policy-purchase" element={<ProtectedRoute allowedRoles={["customer"]}><OnlinePolicyPurchase /></ProtectedRoute>} />
        <Route path="/customer-profile" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerProfile /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute allowedRoles={["customer"]}><HelpCenter /></ProtectedRoute>} />
        <Route path="/insurance-plans" element={<ProtectedRoute allowedRoles={["customer"]}><InsurancePlans /></ProtectedRoute>} />
        <Route path="/admin-create-staff" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCreateStaff /></ProtectedRoute>} />
        <Route path="/admin-insurance-plans" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInsurancePlans /></ProtectedRoute>} />
        <Route path="/ai-policy-recommendation" element={<ProtectedRoute allowedRoles={["customer"]}><AiPolicyRecommendation /></ProtectedRoute>} />
        <Route path="/payment/:planId" element={<ProtectedRoute allowedRoles={["customer"]}><Payment /></ProtectedRoute>} />
        <Route path="/policy-purchases" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}><PolicyPurchases /></ProtectedRoute>} />
        <Route path="/assign-policy" element={<ProtectedRoute allowedRoles={["admin", "bm", "unit_manager", "agency_manager"]}><AssignPolicy /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;