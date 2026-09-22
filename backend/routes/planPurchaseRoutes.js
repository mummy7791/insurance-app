const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

const maskPan = (value = "") => {
  const pan = String(value).trim().toUpperCase();
  return pan.length === 10 ? `${pan.slice(0, 2)}******${pan.slice(-2)}` : "";
};

const makeReference = (prefix) =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const auth = require("../middleware/auth");
const InsurancePlan = require("../models/InsurancePlan");
const PlanPurchase = require("../models/PlanPurchase");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const User = require("../models/User");
const Document = require("../models/Document");

const getCashfreeConfig = () => {
  const appId = String(process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = String(process.env.CASHFREE_SECRET_KEY || "").trim();
  const env = String(process.env.CASHFREE_ENV || "sandbox").trim().toLowerCase();

  if (!appId || !secretKey) {
    const error = new Error("Payment gateway is not configured");
    error.code = "CASHFREE_NOT_CONFIGURED";
    throw error;
  }

  return {
    appId,
    secretKey,
    baseUrl:
      env === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg",
  };
};

const cashfreeRequest = async (path, options = {}) => {
  const { appId, secretKey, baseUrl } = getCashfreeConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.type ||
        data?.code ||
        `Cashfree request failed with status ${response.status}`
    );
    error.status = response.status;
    error.cashfree = data;
    throw error;
  }

  return data;
};

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
      kycUploadRef: String(proposal.kycUploadRef || "").trim().slice(0, 180),
      advisorCode: String(proposal.advisorCode || "").trim().toUpperCase().slice(0, 40),
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

    const expectedKycRef = `PENDING-${req.user.id}-${req.params.planId}`;
    if (clean.kycUploadRef !== expectedKycRef) {
      return res.status(400).json({ message: "Secure KYC uploads are required before payment" });
    }
    const requiredKycTypes = ["Customer Photo", "Aadhaar", "PAN", "Address Proof", "Nominee Photo", "Nominee Aadhaar", "Nominee PAN"];
    const uploadedKyc = await Document.distinct("documentType", {
      customerId: req.user.id,
      policyNumber: expectedKycRef,
      documentType: { $in: requiredKycTypes },
    });
    if (requiredKycTypes.some((type) => !uploadedKyc.includes(type))) {
      return res.status(400).json({ message: "Please upload all policyholder and nominee KYC documents before payment" });
    }

    const plan = await InsurancePlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!["Approved", "Active"].includes(plan.status)) {
      return res.status(400).json({ message: "This plan is not available for purchase" });
    }

    let advisor = null;
    if (clean.advisorCode) {
      advisor = await User.findOne({ advisorCode: clean.advisorCode, role: "advisor", status: "active" }).select("_id name advisorCode");
      if (!advisor) return res.status(400).json({ message: "Advisor code is invalid or inactive" });
    }

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Plan premium is invalid" });
    }

    const staleBefore = new Date(Date.now() - PAYMENT_WINDOW_MS);
    await PlanPurchase.updateMany(
      {
        customerId: req.user.id,
        planId: plan._id,
        paymentStatus: "Pending",
        createdAt: { $lt: staleBefore },
      },
      { $set: { paymentStatus: "Failed", policyStatus: "Inactive" } }
    );

    const existingPending = await PlanPurchase.findOne({
      customerId: req.user.id,
      planId: plan._id,
      paymentStatus: "Pending",
      createdAt: { $gte: staleBefore },
    }).sort({ createdAt: -1 });

    if (existingPending?.orderId && Number(existingPending.yearlyPremium) === amount) {
      try {
        const existingOrder = await cashfreeRequest(
          `/orders/${encodeURIComponent(existingPending.orderId)}`,
          { method: "GET" }
        );

        if (
          existingOrder &&
          Number(existingOrder.order_amount) === amount &&
          existingOrder.order_currency === "INR" &&
          existingOrder.order_status === "ACTIVE" &&
          existingOrder.payment_session_id
        ) {
          existingPending.proposal = { ...clean, consentedAt: new Date() };
          existingPending.advisorId = advisor?._id || null;
          existingPending.advisorCode = advisor?.advisorCode || "";
          existingPending.advisorCommissionRate = advisor ? Number(plan.advisorCommissionRate || 0) : 0;
          await existingPending.save();

          return res.json({
            orderId: existingPending.orderId,
            paymentSessionId: existingOrder.payment_session_id,
            amount,
            currency: "INR",
            gateway: "cashfree",
            reused: true,
            plan: {
              id: plan._id,
              planName: plan.planName,
              category: plan.category,
              coverageAmount: plan.coverageAmount || 0,
              yearlyPremium: amount,
              paymentYears: plan.paymentYears || 1,
            },
          });
        }

        existingPending.paymentStatus = "Failed";
        existingPending.policyStatus = "Inactive";
        await existingPending.save();
      } catch (reuseError) {
        console.warn(
          "Pending Cashfree order could not be reused; creating a fresh order:",
          reuseError?.message || reuseError
        );
        existingPending.paymentStatus = "Failed";
        existingPending.policyStatus = "Inactive";
        await existingPending.save();
      }
    }

    const orderId = makeReference("PLAN");
    const customerId = `cust_${String(req.user.id)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(-40)}`;

    const order = await cashfreeRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: clean.customerName,
          customer_email: clean.customerEmail,
          customer_phone: phoneDigits.slice(-10),
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || "https://insurance-app-rose.vercel.app"}/payment/${plan._id}?cf_order_id={order_id}`,
        },
        order_note: `SecureLife - ${plan.planName}`,
      }),
    });

    await PlanPurchase.create({
      customerId: req.user.id,
      planId: plan._id,
      planName: plan.planName,
      category: plan.category,
      coverageAmount: plan.coverageAmount || 0,
      yearlyPremium: amount,
      paymentYears: plan.paymentYears || 1,
      advisorId: advisor?._id || null,
      advisorCode: advisor?.advisorCode || "",
      advisorCommissionRate: advisor ? Number(plan.advisorCommissionRate || 0) : 0,
      paymentStatus: "Pending",
      policyStatus: "Inactive",
      paymentMethod: "Online",
      orderId,
      proposal: { ...clean, consentedAt: new Date() },
    });

    res.json({
      orderId,
      paymentSessionId: order.payment_session_id,
      amount,
      currency: "INR",
      gateway: "cashfree",
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
    if (error?.code === "CASHFREE_NOT_CONFIGURED") {
      return res.status(503).json({ message: "Online payment is temporarily unavailable. Payment gateway configuration is missing." });
    }
    const gatewayMessage = String(
      error?.cashfree?.message || error?.message || ""
    );
    if (/cashfree|authentication|credential|key|order|payment/i.test(gatewayMessage)) {
      return res.status(502).json({ message: "Payment gateway could not create the order. Please try again shortly." });
    }
    res.status(500).json({ message: "Unable to create payment order right now. Please try again." });
  }
});

router.post("/verify-payment", auth(["customer"]), async (req, res) => {
  try {
    const { planId, orderId } = req.body;

    if (!planId || !orderId) {
      return res.status(400).json({ message: "Incomplete payment verification data" });
    }

    const purchase = await PlanPurchase.findOne({
      orderId,
      customerId: req.user.id,
      planId,
    }).select("+proposal.panNumber");

    if (!purchase) {
      return res.status(400).json({
        message: "Payment order does not match this customer and plan",
      });
    }

    const plan = await InsurancePlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const amount = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Plan premium is invalid" });
    }

    if (Number(purchase.yearlyPremium) !== amount) {
      return res.status(400).json({
        message: "Plan premium changed. Please create a new payment order.",
      });
    }

    const [cashfreeOrder, payments] = await Promise.all([
      cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`, {
        method: "GET",
      }),
      cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`, {
        method: "GET",
      }),
    ]);

    if (
      Number(cashfreeOrder.order_amount) !== amount ||
      cashfreeOrder.order_currency !== "INR" ||
      cashfreeOrder.order_status !== "PAID"
    ) {
      return res.status(400).json({
        message: "Payment is not completed or does not match this order",
      });
    }

    const successfulPayment = Array.isArray(payments)
      ? payments.find((payment) => payment.payment_status === "SUCCESS")
      : null;

    if (!successfulPayment?.cf_payment_id) {
      return res.status(400).json({
        message: "Successful payment record not found",
      });
    }

    const transactionId = String(successfulPayment.cf_payment_id);

    if (
      purchase.transactionId &&
      purchase.transactionId !== transactionId
    ) {
      return res.status(409).json({ message: "Payment order already used" });
    }

    if (
      purchase.paymentStatus === "Paid" &&
      purchase.transactionId === transactionId &&
      purchase.policyNumber &&
      purchase.receiptNumber
    ) {
      return res.json({
        message: "Payment already verified. Plan is active.",
        confirmation: {
          policyNumber: purchase.policyNumber,
          receiptNumber: purchase.receiptNumber,
          transactionId: purchase.transactionId,
        },
        alreadyVerified: true,
      });
    }

    const policyNumber =
      purchase.policyNumber ||
      makeReference(`SLI-${new Date().getFullYear()}`);
    const receiptNumber =
      purchase.receiptNumber || makeReference("RCPT");
    const customer = await User.findById(req.user.id).select(
      "name email phone"
    );

    purchase.paymentStatus = "Paid";
    if (purchase.proposal?.panNumber) {
      purchase.proposal.panNumber = maskPan(purchase.proposal.panNumber);
    }
    purchase.policyStatus = "Active";
    purchase.transactionId = transactionId;
    purchase.policyNumber = policyNumber;
    purchase.receiptNumber = receiptNumber;
    purchase.startDate = purchase.startDate || new Date();
    purchase.totalPremiumPayable = amount * Number(plan.paymentYears || 1);

    if (!purchase.endDate) {
      const endDate = new Date();
      endDate.setFullYear(
        endDate.getFullYear() + Number(plan.paymentYears || 1)
      );
      purchase.endDate = endDate;
    }

    const paymentYears = Math.max(1, Number(plan.paymentYears || 1));
    if (paymentYears > 1) {
      const nextPremiumDate = new Date(purchase.startDate);
      nextPremiumDate.setFullYear(nextPremiumDate.getFullYear() + 1);
      purchase.nextPremiumDate = nextPremiumDate;
    } else {
      purchase.nextPremiumDate = null;
    }

    await purchase.save();

    const pendingKycRef = `PENDING-${req.user.id}-${planId}`;
    await Document.updateMany(
      { customerId: req.user.id, policyNumber: pendingKycRef },
      {
        $set: {
          policyNumber,
          customerName: purchase.proposal?.customerName || customer?.name || "Customer",
          remarks: "KYC document linked to active online policy - pending verification",
        },
      }
    );

    await Policy.findOneAndUpdate(
      { policyNumber },
      {
        customerName:
          purchase.proposal?.customerName || customer?.name || "Customer",
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
        customerName:
          purchase.proposal?.customerName || customer?.name || "Customer",
        policyNumber,
        amount,
        dueDate: nextDueDate.toISOString().split("T")[0],
        paidDate: new Date().toISOString().split("T")[0],
        paymentMode: "Online",
        receiptNumber,
        status: "Paid",
        createdBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (let year = 2; year <= paymentYears; year += 1) {
      const dueDate = new Date(purchase.startDate);
      dueDate.setFullYear(dueDate.getFullYear() + year - 1);
      await Premium.findOneAndUpdate(
        { policyNumber, dueDate: dueDate.toISOString().split("T")[0] },
        {
          customerName: purchase.proposal?.customerName || customer?.name || "Customer",
          policyNumber,
          amount,
          dueDate: dueDate.toISOString().split("T")[0],
          paymentMode: "UPI",
          status: "Due",
          createdBy: req.user.id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.status(201).json({
      message: "Payment verified. Plan is active.",
      confirmation: {
        policyNumber,
        receiptNumber,
        transactionId,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    if (error?.code === "CASHFREE_NOT_CONFIGURED") {
      return res.status(503).json({
        message: "Online payment verification is temporarily unavailable.",
      });
    }
    res.status(500).json({
      message:
        "Payment verification could not be completed. If money was debited, do not pay again and check My Policies.",
    });
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
        "_id planId planName category coverageAmount yearlyPremium paymentYears totalPremiumPayable nextPremiumDate paymentStatus policyStatus transactionId policyNumber receiptNumber startDate endDate proposal.customerName proposal.nomineeName proposal.nomineeRelation createdAt"
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