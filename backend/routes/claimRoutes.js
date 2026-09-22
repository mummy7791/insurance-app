const router = require("express").Router();
const Claim = require("../models/Claim");
const auth = require("../middleware/auth");
const {writeAudit}=require("../services/auditService");
const Policy = require("../models/Policy");
const PlanPurchase = require("../models/PlanPurchase");
const Notification = require("../models/Notification");

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
    "documentsStatus",
    "missingDocuments",
    "adminChecklistRemarks",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

const buildVerificationCode = (claim) => {
  const claimRef = claim.claimNumber || String(claim._id);
  const receiptNo = `SL-CSR-${String(claimRef).replace(/^CLM-/, "").slice(-18)}`;
  const verificationText = [
    receiptNo,
    claimRef,
    claim.policyNumber,
    claim.settlementReference || "-",
    claim.settlementAmount || 0,
  ].join("|");
  let hash = 2166136261;
  for (let i = 0; i < verificationText.length; i += 1) {
    hash ^= verificationText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return {
    receiptNo,
    verificationCode: `SLV-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`,
  };
};

// Public receipt verification endpoint. It exposes only settlement receipt fields.
router.get("/verify/:claimNumber", async (req, res) => {
  try {
    const claim = await Claim.findOne({ claimNumber: req.params.claimNumber }).lean();
    if (!claim || claim.status !== "Settled") {
      return res.status(404).json({ verified: false, message: "Settlement receipt not found" });
    }

    const { receiptNo, verificationCode } = buildVerificationCode(claim);
    const suppliedCode = String(req.query.code || "").trim().toUpperCase();
    if (!suppliedCode || suppliedCode !== verificationCode) {
      return res.status(400).json({ verified: false, message: "Invalid verification code" });
    }

    return res.json({
      verified: true,
      receiptNo,
      verificationCode,
      customerName: claim.customerName,
      policyNumber: claim.policyNumber,
      claimNumber: claim.claimNumber,
      claimType: claim.claimType,
      claimAmount: claim.claimAmount,
      settlementAmount: claim.settlementAmount,
      settlementDate: claim.settlementDate,
      settlementReference: claim.settlementReference,
      status: claim.status,
    });
  } catch (error) {
    console.error("Claim verification error:", error);
    return res.status(500).json({ verified: false, message: "Receipt verification failed" });
  }
});

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

    await writeAudit(req,{action:"CLAIM_SUBMITTED",module:"Claims",description:`Claim ${claim.claimNumber || claim._id} submitted for policy ${claim.policyNumber}`});
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

    if (payload.missingDocuments && !Array.isArray(payload.missingDocuments)) payload.missingDocuments = String(payload.missingDocuments).split(",").map((x) => x.trim()).filter(Boolean).slice(0,20);
    if (payload.adminChecklistRemarks) payload.adminChecklistRemarks = String(payload.adminChecklistRemarks).trim().slice(0,1000);
    const previousStatus = claim.status;
    Object.assign(claim, payload);
    await claim.save();
    await writeAudit(req,{action:`CLAIM_${String(claim.status||"UPDATED").toUpperCase().replace(/\\s+/g,"_")}`,module:"Claims",description:`Claim ${claim.claimNumber || claim._id} updated for policy ${claim.policyNumber}`,targetUserId:claim.customerId});

    if (claim.customerId && previousStatus !== claim.status) {
      const notification = await Notification.create({
        recipientId: claim.customerId,
        title: `Claim ${claim.status}`,
        message: `Claim ${claim.claimNumber || claim._id} for policy ${claim.policyNumber} is now ${claim.status}.${claim.remarks ? ` Remarks: ${claim.remarks}` : ""}`,
        type: "Claim Update",
        date: new Date().toISOString().split("T")[0],
        reference: claim.claimNumber || String(claim._id),
        actionLabel: "View claim",
        actionUrl: "/claims",
      });
      req.app.get("io").to(`user:${String(claim.customerId)}`).emit("newNotification", notification);
    }

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
    await writeAudit(req,{action:"CLAIM_DELETED",module:"Claims",description:`Claim ${claim.claimNumber || claim._id} deleted for policy ${claim.policyNumber}`,targetUserId:claim.customerId});
    res.json({ message: "Claim deleted" });
  } catch (error) {
    console.error("Claim delete error:", error);
    res.status(500).json({ message: "Claim delete failed" });
  }
});

module.exports = router;