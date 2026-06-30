const router = require("express").Router();
const Policy = require("../models/Policy");
const PolicyPurchase = require("../models/PolicyPurchase");
const auth = require("../middleware/auth");

/* CUSTOMER BUY POLICY */
router.post("/buy/:policyId", auth(), async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.policyId);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    const alreadyBought = await PolicyPurchase.findOne({
      policyId: policy._id,
      customerId: req.user.id,
    });

    if (alreadyBought) {
      return res.status(400).json({ message: "Policy already bought" });
    }

    const purchase = await PolicyPurchase.create({
      policyId: policy._id,
      customerId: req.user.id,
      policyName: policy.policyName,
      policyNumber: policy.policyNumber,
      premiumAmount: policy.premiumAmount,
      sumAssured: policy.sumAssured,
      paymentMode: policy.paymentMode,
      paidAmount: policy.premiumAmount,
      paymentStatus: "Paid",
      policyStatus: "Active",
      transactionId: "TXN" + Date.now(),
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error("Buy policy error:", error);
    res.status(500).json({ message: "Buy policy failed" });
  }
});

/* CUSTOMER MY ACTIVE POLICIES */
router.get("/my-policies", auth(), async (req, res) => {
  try {
    const purchases = await PolicyPurchase.find({
      customerId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    console.error("My policies error:", error);
    res.status(500).json({ message: "My policies failed" });
  }
});

/* ADMIN ALL CUSTOMER PURCHASED POLICIES */
router.get("/", auth(), async (req, res) => {
  try {
    const purchases = await PolicyPurchase.find()
      .populate("customerId", "name email phone")
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    console.error("All policy purchases error:", error);
    res.status(500).json({ message: "Policy purchases failed" });
  }
});

module.exports = router;