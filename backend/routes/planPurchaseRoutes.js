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
router.post("/create-order/:planId", auth(["customer"]), async (req, res) => {
  try {
    const proposal = req.body?.proposal;
    if (!proposal || proposal.proposalConsent !== true) {
      return res.status(400).json({ message: "Complete and confirm your proposal before payment" });
    }

    const account = await User.findById(req.user.id).select("name email phone");
    if (!account?.email) {
      return res.status(400).json({ message: "Verified customer account not found" });
    }

    const clean = {
      customerName: String(proposal.customerName || account.name || "").trim().slice(0, 120),
      customerEmail: String(account.email).trim().toLowerCase(),
      customerPhone: String(proposal.customerPhone || "").trim().slice(0, 20),
      address: String(proposal.address || "").trim().slice(0, 500),
      dateOfBirth: String(proposal.dateOfBirth || "").trim(),
      panNumber: String(proposal.panNumber || "").trim().toUpperCase(),
      nomineeName: String(proposal.nomineeName || "").trim().slice(0, 120),
      nomineeRelation: String(proposal.nomineeRelation || "").trim().slice(0, 40),
      nomineeDateOfBirth: String(proposal.nomineeDateOfBirth || "").trim(),
    };

    const phoneDigits = clean.customerPhone.replace(/\D/g, "");
    const customerDob = new Date(clean.dateOfBirth);
    const nomineeDob = new Date(clean.nomineeDateOfBirth);
    const today = new Date();

    if (!clean.customerName || !clean.customerEmail || !clean.customerPhone || !clean.address ||
        !clean.dateOfBirth || !clean.nomineeName || !clean.nomineeRelation || !clean.nomineeDateOfBirth ||
        phoneDigits.length < 10 || phoneDigits.length > 15 ||
        Number.isNaN(customerDob.getTime()) || Number.isNaN(nomineeDob.getTime()) ||
        customerDob > today || nomineeDob > today ||
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean.panNumber)) {
      return res.status(400).json({ message: "Proposal details are incomplete or invalid" });
    }

    const plan = await InsurancePlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!["Approved", "Active"].includes(plan.status)) {
      return res.status(400).json({ message: "This plan is not available for purchase" });
    }

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    const amountPaise = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0
    ) {
      return res.status(400).json({ message: "Plan premium is invalid" });
    }

    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    await PlanPurchase.updateMany(
      {
        customerId: req.user.id,
        planId: plan._id,
        paymentStatus: "Pending",
        createdAt: { $lt: staleBefore },
      },
      { $set: { paymentStatus: "Failed", policyStatus: "Inactive" } }
    );

    const order = await razorpay.orders.create({
      amount: amountPaise,
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
      proposal: { ...clean, consentedAt: new Date() },
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

router.post("/verify-payment", auth(["customer"]), async (req, res) => {
  try {
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

    if (purchase.paymentStatus === "Failed") {
      return res.status(400).json({ message: "Payment order expired. Please create a new order." });
    }

    if (purchase.paymentStatus === "Pending" && Date.now() - purchase.createdAt.getTime() > 30 * 60 * 1000) {
      purchase.paymentStatus = "Failed";
      purchase.policyStatus = "Inactive";
      await purchase.save();
      return res.status(400).json({ message: "Payment order expired. Please create a new order." });
    }

    const plan = await InsurancePlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    const expectedAmountPaise = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(expectedAmountPaise) ||
      expectedAmountPaise <= 0
    ) {
      return res.status(400).json({ message: "Plan premium is invalid" });
    }

    if (Number(purchase.yearlyPremium) !== amount) {
      return res.status(400).json({
        message: "Plan premium changed. Please create a new payment order.",
      });
    }
    const [razorpayOrder, razorpayPayment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    if (
      Number(razorpayOrder.amount) !== expectedAmountPaise ||
      razorpayOrder.currency !== "INR"
    ) {
      return res.status(400).json({ message: "Payment amount verification failed" });
    }

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      Number(razorpayPayment.amount) !== expectedAmountPaise ||
      razorpayPayment.currency !== "INR" ||
      razorpayPayment.status !== "captured"
    ) {
      return res.status(400).json({
        message: "Payment is not captured or does not match this order",
      });
    }

    if (purchase.transactionId && purchase.transactionId !== razorpay_payment_id) {
      return res.status(409).json({ message: "Payment order already used" });
    }

    const policyNumber = purchase.policyNumber || makeReference(`SLI-${new Date().getFullYear()}`);
    const receiptNumber = purchase.receiptNumber || makeReference("RCPT");
    const customer = await User.findById(req.user.id).select("name email phone");

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
        customerName: purchase.proposal?.customerName || customer?.name || "Customer",
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
        customerName: purchase.proposal?.customerName || customer?.name || "Customer",
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
      message: "Payment verified. Plan is active.",
      confirmation: {
        policyNumber,
        receiptNumber,
        transactionId: razorpay_payment_id,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verify failed" });
  }
});

const syncPaidPurchase = async (purchase, customerId) => {
  if (purchase.paymentStatus !== "Paid") return purchase;

  const customer = await User.findById(customerId).select("name");
  const policyNumber = purchase.policyNumber || makeReference(`SLI-${new Date().getFullYear()}`);
  const receiptNumber = purchase.receiptNumber || makeReference("RCPT");

  if (!purchase.policyNumber || !purchase.receiptNumber || purchase.policyStatus !== "Active") {
    purchase.policyNumber = policyNumber;
    purchase.receiptNumber = receiptNumber;
    purchase.policyStatus = "Active";
    purchase.startDate = purchase.startDate || new Date();
    if (!purchase.endDate) {
      const endDate = new Date(purchase.startDate);
      endDate.setFullYear(endDate.getFullYear() + Number(purchase.paymentYears || 1));
      purchase.endDate = endDate;
    }
    await purchase.save();
  }

  await Policy.findOneAndUpdate(
    { policyNumber },
    {
      customerName: purchase.proposal?.customerName || customer?.name || "Customer",
      policyName: purchase.planName || "Insurance Plan",
      policyNumber,
      premiumAmount: Number(purchase.yearlyPremium || 0),
      sumAssured: Number(purchase.coverageAmount || 0),
      paymentMode: "yearly",
      status: "active",
      customerId,
      createdBy: customerId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (receiptNumber) {
    const nextDueDate = new Date(purchase.startDate || purchase.createdAt);
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    await Premium.findOneAndUpdate(
      { policyNumber, receiptNumber },
      {
        customerName: purchase.proposal?.customerName || customer?.name || "Customer",
        policyNumber,
        amount: Number(purchase.yearlyPremium || 0),
        dueDate: nextDueDate.toISOString().split("T")[0],
        paidDate: new Date(purchase.startDate || purchase.createdAt).toISOString().split("T")[0],
        paymentMode: "Card",
        receiptNumber,
        status: "Paid",
        createdBy: customerId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return purchase;
};

router.get("/my-plans", auth(["customer"]), async (req, res) => {
  try {
    const purchases = await PlanPurchase.find({ customerId: req.user.id }).sort({ createdAt: -1 });

    for (const purchase of purchases) {
      await syncPaidPurchase(purchase, req.user.id);
    }

    const customerPlans = await PlanPurchase.find({ customerId: req.user.id })
      .select(
        "_id planId planName category coverageAmount yearlyPremium paymentYears paymentStatus policyStatus transactionId policyNumber receiptNumber startDate endDate proposal.customerName proposal.nomineeName proposal.nomineeRelation createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json(customerPlans);
  } catch (error) {
    console.error("My plans error:", error);
    res.status(500).json({ message: "My plans fetch failed" });
  }
});

module.exports = router;