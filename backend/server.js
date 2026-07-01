const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const leadRoutes = require("./routes/leadRoutes");
const customerRoutes = require("./routes/customerRoutes");
const policyRoutes = require("./routes/policyRoutes");
const premiumRoutes = require("./routes/premiumRoutes");
const claimRoutes = require("./routes/claimRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const branchRoutes = require("./routes/branchRoutes");
const targetRoutes = require("./routes/targetRoutes");
const documentRoutes = require("./routes/documentRoutes");
const commissionRoutes = require("./routes/commissionRoutes");
const followupRoutes = require("./routes/followupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingRoutes = require("./routes/settingRoutes");
const emailRoutes = require("./routes/emailRoutes");
const otpRoutes = require("./routes/otpRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const auditRoutes = require("./routes/auditRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const aiRoutes = require("./routes/aiRoutes");
const aiFollowupRoutes = require("./routes/aiFollowupRoutes");
const aiPerformanceRoutes = require("./routes/aiPerformanceRoutes");
const aiLeadScoringRoutes = require("./routes/aiLeadScoringRoutes");
const aiSalesPredictionRoutes = require("./routes/aiSalesPredictionRoutes");
const customerPortalRoutes = require("./routes/customerPortalRoutes");
const emailMarketingRoutes = require("./routes/emailMarketingRoutes");
const policyRecommendationRoutes = require("./routes/policyRecommendationRoutes");
const ceoDashboardRoutes = require("./routes/ceoDashboardRoutes");
const ocrRoutes = require("./routes/ocrRoutes");
const quickEnterpriseRoutes = require("./routes/quickEnterpriseRoutes");
const fileManagerRoutes = require("./routes/fileManagerRoutes");
const customerDashboardRoutes = require("./routes/customerDashboardRoutes");
const onlinePolicyRoutes = require("./routes/onlinePolicyRoutes");
const customerProfileRoutes = require("./routes/customerProfileRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const insurancePlanRoutes = require("./routes/insurancePlanRoutes");
const planPurchaseRoutes = require("./routes/planPurchaseRoutes");
const policyPurchaseRoutes = require("./routes/policyPurchaseRoutes");
const customerRoutes = require("./routes/customer");
const seedAdmin = require("./seedAdmin");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = process.env.PORT || 5000;
const MONGO_URL =
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/insurance-app";

/* ================= SOCKET.IO ================= */
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/* ================= MIDDLEWARE ================= */
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTE CHECK HELPER ================= */
const useRoute = (routePath, routeHandler) => {
  if (!routeHandler || typeof routeHandler !== "function") {
    console.log(`❌ Route error at ${routePath}:`, routeHandler);
    throw new Error(`${routePath} route is not exported correctly`);
  }

  app.use(routePath, routeHandler);
};

/* ================= API ROUTES ================= */
useRoute("/api/auth", authRoutes);
useRoute("/api/users", userRoutes);
useRoute("/api/leads", leadRoutes);
useRoute("/api/customers", customerRoutes);
useRoute("/api/policies", policyRoutes);
useRoute("/api/premiums", premiumRoutes);
useRoute("/api/claims", claimRoutes);
useRoute("/api/employees", employeeRoutes);
useRoute("/api/branches", branchRoutes);
useRoute("/api/targets", targetRoutes);
useRoute("/api/documents", documentRoutes);
useRoute("/api/commissions", commissionRoutes);
useRoute("/api/followups", followupRoutes);
useRoute("/api/notifications", notificationRoutes);
useRoute("/api/reports", reportRoutes);
useRoute("/api/settings", settingRoutes);
useRoute("/api/email", emailRoutes);
useRoute("/api/otp", otpRoutes);
useRoute("/api/user-management", userManagementRoutes);
useRoute("/api/audit-logs", auditRoutes);
useRoute("/api/dashboard", dashboardRoutes);
useRoute("/api/ai", aiRoutes);
useRoute("/api/ai-followups", aiFollowupRoutes);
useRoute("/api/ai-performance", aiPerformanceRoutes);
useRoute("/api/ai-lead-scoring", aiLeadScoringRoutes);
useRoute("/api/ai-sales-prediction", aiSalesPredictionRoutes);
useRoute("/api/customer-portal", customerPortalRoutes);
useRoute("/api/email-marketing", emailMarketingRoutes);
useRoute("/api/policy-recommendation", policyRecommendationRoutes);
useRoute("/api/ceo-dashboard", ceoDashboardRoutes);
useRoute("/api/ocr", ocrRoutes);
useRoute("/api/quick-enterprise", quickEnterpriseRoutes);
useRoute("/api/file-manager", fileManagerRoutes);
useRoute("/api/customer-dashboard", customerDashboardRoutes);
useRoute("/api/online-policy", onlinePolicyRoutes);
useRoute("/api/customer-profile", customerProfileRoutes);
useRoute("/api/tickets", ticketRoutes);
useRoute("/api/insurance-plans", insurancePlanRoutes);
useRoute("/api/plan-purchases", planPurchaseRoutes);
useRoute("/api/policy-purchases", policyPurchaseRoutes);
useRoute("/customer", customerRoutes);


/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("Insurance CRM API running");
});

/* ================= 404 ROUTE ================= */
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

/* ================= SERVER ERROR ================= */
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`❌ Port ${PORT} already in use`);
    console.log(`Run: netstat -ano | findstr :${PORT}`);
    console.log("Then kill PID: taskkill /PID YOUR_PID /F");
  } else {
    console.log("❌ Server error:", error.message);
  }
});

/* ================= DB CONNECT + START ================= */
mongoose
  .connect(MONGO_URL)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    await seedAdmin();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err.message);
  });