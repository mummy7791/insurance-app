const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const auth = require("../middleware/auth");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "advisor",
  "agent",
];

/* CUSTOMER PROFILE BY EMAIL */
router.get("/me/:email", auth(), async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    if (req.user.role === "customer" && req.user.email !== email) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json(customer);
  } catch (err) {
    console.error("Customer profile error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ADMIN CREATE / ASSIGN CUSTOMER POLICY */
router.post("/assign-policy", auth(STAFF_ROLES), async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.email) {
      return res.status(400).json({ message: "Customer email required" });
    }

    const email = String(data.email).trim().toLowerCase();

    const payload = {
      email,
      name: data.name || "Customer",
      phone: data.phone || "",
      photo: data.photo || "",
      dob: data.dob || "",
      gender: data.gender || "",
      address: data.address || "",
      aadhaar: data.aadhaar || "",
      pan: data.pan || "",
      nominee: data.nominee || "",
      nomineeRelation: data.nomineeRelation || "",
      advisor: data.advisor || "",
      agencyManager: data.agencyManager || "",
      branch: data.branch || "",
      planName: data.planName || "",
      policyNo: data.policyNo || "",
      policyType: data.policyType || "",
      status: data.status || "ACTIVE",
      premium: data.premium || "",
      coverage: data.coverage || "",
      startDate: data.startDate || "",
      expiryDate: data.expiryDate || "",
      renewalDate: data.renewalDate || "",
      members: Array.isArray(data.members)
        ? data.members
        : String(data.members || "")
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
      lastPayment: data.lastPayment || "",
      nextPremium: data.nextPremium || "",
      paymentMode: data.paymentMode || "",
      transactionId: data.transactionId || "",
    };

    const customer = await Customer.findOneAndUpdate(
      { email },
      { $set: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      message: "Policy assigned successfully",
      customer,
    });
  } catch (err) {
    console.error("Assign policy error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/* ADMIN GET ALL CUSTOMERS */
router.get("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.json(customers);
  } catch (err) {
    console.error("Customers list error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;