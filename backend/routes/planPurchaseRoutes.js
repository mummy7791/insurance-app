const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const makeReference = (prefix) =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const auth = require("../middleware/auth");
const InsurancePlan = require("../models/InsurancePlan");
const PlanPurchase = require("../models/PlanPurchase");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const User = require("../models/User");

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
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Only customers can purchase plans" });
    }
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
      receipt: makeReference("PLAN"),
    });

    await PlanPurchase.create({
      customerId: req.user.id,
      planId: plan._id,
      planName: plan.planName,
      category: plan.category,
      coverageAmount: plan.coverageAmount || 0,
      yearlyPremium: amount,
      paymentYears: plan.paymentYears || 1,
      paymentStatus: "Pending",
      policyStatus: "Inactive",
      paymentMethod: "Online",
      orderId: order.id,
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
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Only customers can verify plan payments" });
    }
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Incomplete payment verification data" });
    }

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSign, "hex");
    const receivedBuffer = Buffer.from(String(razorpay_signature), "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const purchase = await PlanPurchase.findOne({
      orderId: razorpay_order_id,
      customerId: req.user.id,
      planId,
    });

    if (!purchase) {
      return res.status(400).json({ message: "Payment order does not match this customer and plan" });
    }

    const plan = await InsurancePlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    if (Number(purchase.yearlyPremium) !== amount) {
      return res.status(400).json({ message: "Plan premium changed. Please create a new payment order." });
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (
      Number(razorpayOrder.amount) !== amount * 100 ||
      razorpayOrder.currency !== "INR"
    ) {
      return res.status(400).json({ message: "Payment amount verification failed" });
    }

    if (purchase.transactionId && purchase.transactionId !== razorpay_payment_id) {
      return res.status(409).json({ message: "Payment order already used" });
    }

    const policyNumber = purchase.policyNumber || makeReference(`SLI-${new Date().getFullYear()}`);
    const receiptNumber = purchase.receiptNumber || makeReference("RCPT");
    const customer = await User.findById(req.user.id).select("name");

    purchase.paymentStatus = "Paid";
    purchase.policyStatus = "Active";
    purchase.transactionId = razorpay_payment_id;
    purchase.policyNumber = policyNumber;
    purchase.receiptNumber = receiptNumber;
    purchase.startDate = purchase.startDate || new Date();
    if (!purchase.endDate) {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + Number(plan.paymentYears || 1));
      purchase.endDate = endDate;
    }
    await purchase.save();

    await Policy.findOneAndUpdate(
      { policyNumber },
      {
        customerName: customer?.name || "Customer",
        policyName: plan.planName,
        policyNumber,
        premiumAmount: amount,
        sumAssured: plan.coverageAmount || 0,
        paymentMode: "yearly",
        status: "active",
        customerId: req.user.id,
        createdBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const nextDueDate = new Date();
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

    await Premium.findOneAndUpdate(
      { policyNumber, receiptNumber },
      {
        customerName: customer?.name || "Customer",
        policyNumber,
        amount,
        dueDate: nextDueDate.toISOString().split("T")[0],
        paidDate: new Date().toISOString().split("T")[0],
        paymentMode: "Card",
        receiptNumber,
        status: "Paid",
        createdBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: purchase.createdAt.getTime() === purchase.updatedAt.getTime() ? "Payment successful. Plan activated." : "Payment verified. Plan is active.",
      purchase,
      confirmation: { policyNumber, receiptNumber, transactionId: razorpay_payment_id },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verify failed" });
  }
});

router.get("/my-plans", auth(), async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Customer access only" });
    }
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