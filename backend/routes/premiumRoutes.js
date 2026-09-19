const router = require("express").Router();
const Premium = require("../models/Premium");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const pickPremiumFields = (body = {}) => {
  const allowedFields = [
    "customerName",
    "policyNumber",
    "amount",
    "dueDate",
    "paidDate",
    "paymentMode",
    "receiptNumber",
    "status",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

router.post("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const payload = pickPremiumFields(req.body);

    const premium = await Premium.create({
      ...payload,
      createdBy: req.user.id,
    });

    res.status(201).json(premium);
  } catch (error) {
    console.error("Premium create error:", error);
    res.status(500).json({ message: "Premium create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "customer") {
      const policies = await Policy.find({ customerId: req.user.id }).select("policyNumber");
      query = { policyNumber: { $in: policies.map((policy) => policy.policyNumber) } };
    }

    const premiums = await Premium.find(query).sort({ createdAt: -1 });
    res.json(premiums);
  } catch (error) {
    console.error("Premiums fetch error:", error);
    res.status(500).json({ message: "Premiums fetch failed" });
  }
});

router.put("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const premium = await Premium.findById(req.params.id);
    if (!premium) return res.status(404).json({ message: "Premium not found" });

    const payload = pickPremiumFields(req.body);

    delete payload.policyNumber;
    delete payload.receiptNumber;

    Object.assign(premium, payload);
    await premium.save();

    res.json(premium);
  } catch (error) {
    console.error("Premium update error:", error);
    res.status(500).json({ message: "Premium update failed" });
  }
});

router.delete("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const premium = await Premium.findById(req.params.id);
    if (!premium) return res.status(404).json({ message: "Premium not found" });

    await premium.deleteOne();
    res.json({ message: "Premium deleted" });
  } catch (error) {
    console.error("Premium delete error:", error);
    res.status(500).json({ message: "Premium delete failed" });
  }
});

module.exports = router;