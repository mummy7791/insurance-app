import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import RoleDashboard from "./pages/RoleDashboard";
import Profile from "./pages/Profile";

import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Policies from "./pages/Policies";
import Premiums from "./pages/Premiums";
import Payment from "./pages/Payment";
import Commission from "./pages/Commission";
import Claims from "./pages/Claims";
import Documents from "./pages/Documents";
import Calendar from "./pages/Calendar";
import GpsTracking from "./pages/GpsTracking";

import Employees from "./pages/Employees";
import Branch from "./pages/Branch";
import Targets from "./pages/Targets";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Communication from "./pages/Communication";
import PdfReports from "./pages/PdfReports";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ExcelReports from "./pages/ExcelReports";

import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import AIAssistant from "./pages/AIAssistant";
import AIFollowup from "./pages/AIFollowup";
import AIPerformance from "./pages/AIPerformance";
import AILeadScoring from "./pages/AILeadScoring";
import AISalesPrediction from "./pages/AISalesPrediction";
import CustomerPortal from "./pages/CustomerPortal";
import EmailMarketing from "./pages/EmailMarketing";
import PolicyRecommendationAI from "./pages/PolicyRecommendationAI";
import CEODashboard from "./pages/CEODashboard";
import OCRVerification from "./pages/OCRVerification";
import EnterpriseTools from "./pages/EnterpriseTools";
import FileManager from "./pages/FileManager";
import CustomerDashboard from "./pages/CustomerDashboard";
import OnlinePolicyPurchase from "./pages/OnlinePolicyPurchase";
import CustomerProfile from "./pages/CustomerProfile";

import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import Login from "./pages/Login";

import InsurancePlans from "./pages/InsurancePlans";
import AdminCreateStaff from "./pages/AdminCreateStaff";
import CustomerOtpLogin from "./pages/CustomerOtpLogin";
import AdminInsurancePlans from "./pages/AdminInsurancePlans";
import PremiumCalculator from "./pages/PremiumCalculator";
import AiPolicyRecommendation from "./pages/AiPolicyRecommendation";

import "./styles/app.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Navigate to="/login" replace />} />
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
            <ProtectedRoute>
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
            <ProtectedRoute>
              <Leads />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
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
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gps-tracking"
          element={
            <ProtectedRoute>
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

        <Route path="/ai-followups" element={<AIFollowup />} />
        <Route path="/ai-performance" element={<AIPerformance />} />
        <Route path="/ai-lead-scoring" element={<AILeadScoring />} />
        <Route path="/ai-sales-prediction" element={<AISalesPrediction />} />
        <Route path="/customer-portal" element={<CustomerPortal />} />
        <Route path="/email-marketing" element={<EmailMarketing />} />
        <Route path="/policy-recommendation-ai" element={<PolicyRecommendationAI />} />
        <Route path="/ceo-dashboard" element={<CEODashboard />} />
        <Route path="/ocr-verification" element={<OCRVerification />} />
        <Route path="/enterprise-tools" element={<EnterpriseTools />} />
        <Route path="/file-manager" element={<FileManager />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/online-policy-purchase" element={<OnlinePolicyPurchase />} />
        <Route path="/customer-profile" element={<CustomerProfile />} />
        <Route path="/insurance-plans" element={<InsurancePlans />} />
        <Route path="/admin-create-staff" element={<AdminCreateStaff />} />
        <Route path="/admin-insurance-plans" element={<AdminInsurancePlans />} />
        <Route path="/ai-policy-recommendation" element={<AiPolicyRecommendation />} />
        <Route path="/payment/:planId" element={<Payment />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;