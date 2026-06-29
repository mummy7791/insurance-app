const express = require("express");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const XLSX = require("xlsx");

const router = express.Router();

const auth = require("../middleware/auth");

const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const User = require("../models/User");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

router.get("/test", (req, res) => {
  res.json({ message: "Quick Enterprise Route Working" });
});

router.get("/churn", auth(), async (req, res) => {
  try {
    const customers = await Customer.find().limit(200);

    const data = customers.map((customer) => {
      let score = 20;

      if (!customer.email) score += 20;
      if (!customer.phone && !customer.mobile) score += 20;
      if (customer.status === "inactive") score += 30;

      score = Math.min(100, score);

      return {
        _id: customer._id,
        name: customer.name || customer.customerName || "Customer",
        email: customer.email || "",
        phone: customer.phone || customer.mobile || "",
        riskScore: score,
        risk: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
      };
    });

    res.json(data);
  } catch (error) {
    console.error("Churn error:", error);
    res.status(500).json({ message: "Churn prediction failed" });
  }
});

router.get("/policy-pdf/:id", auth(), async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=policy.pdf");

    doc.pipe(res);

    doc.fontSize(22).text("LifeSecure Policy Document", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Policy Name: ${policy.policyName || policy.name || "N/A"}`);
    doc.text(`Policy Number: ${policy.policyNumber || policy.number || "N/A"}`);
    doc.text(`Status: ${policy.status || "N/A"}`);
    doc.text(`Premium: Rs. ${policy.premiumAmount || policy.amount || 0}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error("Policy PDF error:", error);
    res.status(500).json({ message: "Policy PDF failed" });
  }
});

router.get("/receipt/:id", auth(), async (req, res) => {
  try {
    const premium = await Premium.findById(req.params.id);

    if (!premium) {
      return res.status(404).json({ message: "Premium not found" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=receipt.pdf");

    doc.pipe(res);

    doc.fontSize(22).text("Payment Receipt", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Receipt ID: ${premium._id}`);
    doc.text(`Amount: Rs. ${premium.amount || 0}`);
    doc.text(`Status: ${premium.status || "N/A"}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error("Receipt error:", error);
    res.status(500).json({ message: "Receipt generation failed" });
  }
});

router.get("/policy-qr/:id", auth(), async (req, res) => {
  try {
    const verifyUrl = `${API_BASE_URL}/api/quick-enterprise/verify-policy/${req.params.id}`;
    const qr = await QRCode.toDataURL(verifyUrl);

    res.json({ qr, verifyUrl });
  } catch (error) {
    console.error("QR error:", error);
    res.status(500).json({ message: "QR generation failed" });
  }
});

router.get("/verify-policy/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ valid: false });
    }

    res.json({
      valid: true,
      policyName: policy.policyName || policy.name || "N/A",
      policyNumber: policy.policyNumber || policy.number || "N/A",
      status: policy.status || "N/A",
    });
  } catch (error) {
    console.error("Verify policy error:", error);
    res.status(500).json({ valid: false });
  }
});

router.get("/document-expiry", auth(), async (req, res) => {
  try {
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);

    const policies = await Policy.find({
      expiryDate: { $lte: next30 },
    }).sort({ expiryDate: 1 });

    res.json(policies);
  } catch (error) {
    console.error("Document expiry error:", error);
    res.status(500).json({ message: "Document expiry failed" });
  }
});

router.put("/kyc/:customerId", auth(["admin", "bm"]), async (req, res) => {
  try {
    const { kycStatus } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.params.customerId,
      { kycStatus: kycStatus || "Approved" },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    console.error("KYC error:", error);
    res.status(500).json({ message: "KYC update failed" });
  }
});

router.get("/export/customers", auth(), async (req, res) => {
  try {
    const customers = await Customer.find().lean();

    const cleanCustomers = customers.map((customer) => ({
      Name: customer.name || customer.customerName || "",
      Email: customer.email || "",
      Phone: customer.phone || customer.mobile || "",
      Status: customer.status || "",
      KYC: customer.kycStatus || "",
      CreatedAt: customer.createdAt || "",
    }));

    const sheet = XLSX.utils.json_to_sheet(cleanCustomers);
    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(book, sheet, "Customers");

    const buffer = XLSX.write(book, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=customers.xlsx");

    res.send(buffer);
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Excel export failed" });
  }
});

router.get("/pdf-report", auth(["admin", "bm"]), async (req, res) => {
  try {
    const [customers, policies, premiums, claims] = await Promise.all([
      Customer.countDocuments(),
      Policy.countDocuments(),
      Premium.countDocuments(),
      Claim.countDocuments(),
    ]);

    const premiumAgg = await Premium.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$amount" } },
        },
      },
    ]);

    const totalPremium = premiumAgg[0]?.total || 0;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=crm-report.pdf");

    doc.pipe(res);

    doc.fontSize(22).text("LifeSecure CRM Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Customers: ${customers}`);
    doc.text(`Policies: ${policies}`);
    doc.text(`Premiums: ${premiums}`);
    doc.text(`Claims: ${claims}`);
    doc.text(`Total Premium: Rs. ${totalPremium}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error("PDF report error:", error);
    res.status(500).json({ message: "PDF report failed" });
  }
});

router.get("/permissions", auth(), async (req, res) => {
  try {
    const permissions = {
      admin: ["all"],
      bm: ["dashboard", "customers", "policies", "reports", "kyc"],
      unit_manager: ["dashboard", "leads", "customers", "policies"],
      agency_manager: ["dashboard", "leads", "customers"],
      agent: ["dashboard", "leads", "customers"],
    };

    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Permissions fetch failed" });
  }
});

router.get("/branches-summary", auth(["admin", "bm"]), async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$branch", "Unassigned"] },
          users: { $sum: 1 },
        },
      },
    ]);

    res.json(users);
  } catch (error) {
    console.error("Branch summary error:", error);
    res.status(500).json({ message: "Branch summary failed" });
  }
});

router.get("/companies-summary", auth(["admin"]), async (req, res) => {
  try {
    const users = await User.countDocuments();

    res.json([
      {
        name: "LifeSecure CRM",
        status: "Active",
        users,
      },
    ]);
  } catch (error) {
    res.status(500).json({ message: "Company summary failed" });
  }
});

module.exports = router;