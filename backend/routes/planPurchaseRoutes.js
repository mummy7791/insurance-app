const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const auth = require("../middleware/auth");
const InsurancePlan = require("../models/InsurancePlan");
const PlanPurchase = require("../models/PlanPurchase");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.get("/test", (req, res) => {
  res.json({
    message: "Plan Purchase API Working",
  });
});
router.post("/create-order/:planId", auth(), async (req, res) => {
  try {
    const plan = await InsurancePlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);

    if (!amount) {
      return res.status(400).json({ message: "Plan premium missing" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `PLAN-${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount,
      currency: "INR",
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      plan: {
        id: plan._id,
        planName: plan.planName,
        category: plan.category,
        coverageAmount: plan.coverageAmount || 0,
        yearlyPremium: amount,
        paymentYears: plan.paymentYears || 1,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Order create failed" });
  }
});

router.post("/verify-payment", auth(), async (req, res) => {
  try {
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const plan = await InsurancePlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);

    const purchase = await PlanPurchase.create({
      customerId: req.user.id,
      planId: plan._id,
      planName: plan.planName,
      category: plan.category,
      coverageAmount: plan.coverageAmount || 0,
      yearlyPremium: amount,
      paymentYears: plan.paymentYears || 1,
      paymentStatus: "Paid",
      policyStatus: "Active",
      paymentMethod: "Online",
      transactionId: razorpay_payment_id,
      startDate: new Date(),
      endDate: new Date(
        new Date().setFullYear(
          new Date().getFullYear() + Number(plan.paymentYears || 1)
        )
      ),
    });

    res.status(201).json({
      message: "Payment successful. Plan activated.",
      purchase,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verify failed" });
  }
});

router.get("/my-plans", auth(), async (req, res) => {
  try {
    const purchases = await PlanPurchase.find({ customerId: req.user.id })
      .populate("planId")
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    console.error("My plans error:", error);
    res.status(500).json({ message: "My plans fetch failed" });
  }
});

module.exports = router;