const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const Policy = require("../models/Policy");
const Customer = require("../models/Customer");
const PolicyPurchase = require("../models/PolicyPurchase");

router.get("/", auth(), async (req, res) => {
  try {
    const policies = await Policy.find().sort({ createdAt: -1 }).limit(300);
    res.json(policies);
  } catch (error) {
    console.error("Online policies fetch error:", error);
    res.status(500).json({ message: "Policies fetch failed" });
  }
});

router.get("/my-purchases", auth(), async (req, res) => {
  try {
    const userId = req.user?.id;

    const purchases = await PolicyPurchase.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(purchases);
  } catch (error) {
    console.error("My policy purchases error:", error);
    res.status(500).json({ message: "My purchases fetch failed" });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    res.json(policy);
  } catch (error) {
    console.error("Policy detail error:", error);
    res.status(500).json({ message: "Policy detail failed" });
  }
});

router.post("/buy", auth(), async (req, res) => {
  try {
    const {
      policyId,
      customerName,
      customerEmail,
      customerPhone,
      address,
    } = req.body;

    if (!policyId || !customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({
        message: "Policy, name, email and phone are required",
      });
    }

    const policy = await Policy.findById(policyId);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    let customer = await Customer.findOne({
      email: customerEmail.toLowerCase().trim(),
    });

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        email: customerEmail.toLowerCase().trim(),
        phone: customerPhone,
        address: address || "",
        createdBy: req.user?.id,
        kycStatus: "Pending",
      });
    }

    const purchase = await PolicyPurchase.create({
      customerId: customer._id,
      userId: req.user?.id,
      policyId: policy._id,
      policyName: policy.policyName || policy.name || "Policy",
      policyNumber: policy.policyNumber || policy.number || "",
      premiumAmount:
        Number(policy.premiumAmount || policy.amount || policy.premium || 0),
      customerName,
      customerEmail: customerEmail.toLowerCase().trim(),
      customerPhone,
      address: address || "",
      status: "Pending",
      paymentStatus: "Pending",
    });

    res.status(201).json({
      message: "Policy purchase request submitted",
      purchase,
    });
  } catch (error) {
    console.error("Policy purchase error:", error);
    res.status(500).json({ message: "Policy purchase failed" });
  }
});

router.put("/:id/status", auth(["admin", "bm"]), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected", "Active"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const purchase = await PolicyPurchase.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.json(purchase);
  } catch (error) {
    console.error("Purchase status update error:", error);
    res.status(500).json({ message: "Status update failed" });
  }
});

module.exports = router;