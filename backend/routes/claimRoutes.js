const router = require("express").Router();
const Claim = require("../models/Claim");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");
const PlanPurchase = require("../models/PlanPurchase");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const pickClaimCreateFields = (body = {}) => {
  const allowedFields = [
    "customerName",
    "policyNumber",
    "claimType",
    "claimAmount",
    "submittedDate",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

const pickClaimUpdateFields = (body = {}) => {
  const allowedFields = [
    "customerName",
    "claimType",
    "claimAmount",
    "submittedDate",
    "status",
    "remarks",
    "settlementAmount",
    "settlementDate",
    "settlementReference",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

router.post("/", auth(), async (req, res) => {
  try {
    const policy = await Policy.findOne({ policyNumber: req.body.policyNumber });
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    if (req.user.role === "customer" && String(policy.customerId || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Policy does not belong to this customer" });
    }

    if (!policy.customerId) {
      return res.status(400).json({ message: "Policy is not linked to a customer account" });
    }

    const payload = pickClaimCreateFields(req.body);

    const claim = await Claim.create({
      ...payload,
      claimNumber: `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: "Submitted",
      remarks: "No remarks",
      customerId: policy.customerId,
      createdBy: req.user.id,
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error("Claim create error:", error);
    res.status(500).json({ message: "Claim create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "customer") {
      const policies = await Policy.find({ customerId: req.user.id }).select("policyNumber");
      const purchases = await PlanPurchase.find({
        customerId: req.user.id,
        paymentStatus: "Paid",
      }).select("policyNumber");
      const policyNumbers = [...policies, ...purchases]
        .map((policy) => policy.policyNumber)
        .filter(Boolean);
      query = {
        $or: [
          { customerId: req.user.id },
          { createdBy: req.user.id },
          { policyNumber: { $in: policyNumbers } },
        ],
      };
    }
    const claims = await Claim.find(query).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error("Claims fetch error:", error);
    res.status(500).json({ message: "Claims fetch failed" });
  }
});

router.put("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    const payload = pickClaimUpdateFields(req.body);

    if (payload.status === "Settled") {
      const amount = Number(payload.settlementAmount);
      payload.settlementAmount =
        Number.isFinite(amount) && amount > 0 ? amount : Number(claim.claimAmount || 0);
      payload.settlementDate =
        payload.settlementDate || new Date().toISOString().split("T")[0];
      payload.settlementReference =
        String(payload.settlementReference || "").trim() ||
        `SET-${claim.claimNumber || claim._id}-${Date.now()}`;
      payload.remarks =
        String(payload.remarks || "").trim() || "Claim settled successfully";
    }

    Object.assign(claim, payload);
    await claim.save();

    res.json(claim);
  } catch (error) {
    console.error("Claim update error:", error);
    res.status(500).json({ message: "Claim update failed" });
  }
});

router.delete("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    await claim.deleteOne();
    res.json({ message: "Claim deleted" });
  } catch (error) {
    console.error("Claim delete error:", error);
    res.status(500).json({ message: "Claim delete failed" });
  }
});

module.exports = router;