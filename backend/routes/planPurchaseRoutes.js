const express = require("express");
const crypto = require("crypto");

const multer = require("multer");
const { uploadPrivateDocument, signedDownloadUrl, deletePrivateDocument } = require("../services/privateDocumentStorage");
const InsurerCertificate = require("../models/InsurerCertificate");
const certificateUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

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
const Quotation = require("../models/Quotation");

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
    const quotationId = String(req.body?.quotationId || "").trim();
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

    const plan = await InsurancePlan.findById(req.params.planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    const isMotorInsurance = ["Bike Insurance", "Car Insurance"].includes(plan.planName);

    const phoneDigits = clean.customerPhone.replace(/\D/g, "");
    const customerDob = clean.dateOfBirth ? new Date(clean.dateOfBirth) : null;
    const nomineeDob = new Date(clean.nomineeDateOfBirth);
    const today = new Date();

    if (!clean.customerName || !clean.customerEmail || !clean.customerPhone || !clean.address ||
        (!isMotorInsurance && !clean.dateOfBirth) || !clean.nomineeName || !clean.nomineeRelation || !clean.nomineeDateOfBirth ||
        phoneDigits.length < 10 || phoneDigits.length > 15 ||
        (!isMotorInsurance && (!customerDob || Number.isNaN(customerDob.getTime()))) || Number.isNaN(nomineeDob.getTime()) ||
        (!isMotorInsurance && customerDob > today) || nomineeDob > today ||
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

    if (!["Approved", "Active"].includes(plan.status)) {
      return res.status(400).json({ message: "This plan is not available for purchase" });
    }

    let quotation = null;
    if (quotationId) {
      quotation = await Quotation.findOne({_id:quotationId,createdBy:req.user.id,planId:plan._id});
      if (!quotation) return res.status(404).json({message:"Quotation not found for this customer and plan"});
      if (quotation.validUntil < new Date()) { quotation.status="Expired"; await quotation.save(); return res.status(409).json({message:"Quotation has expired. Please generate a new quotation."}); }
      if (quotation.status === "Converted") return res.status(409).json({message:"Quotation is already converted to a policy purchase"});
      if (!["Generated","Shared","Accepted"].includes(quotation.status)) return res.status(409).json({message:"Quotation is not available for purchase"});
      quotation.status="Accepted"; quotation.acceptedAt=quotation.acceptedAt||new Date(); await quotation.save();
    }

    let advisor = null;
    if (clean.advisorCode) {
      advisor = await User.findOne({ advisorCode: clean.advisorCode, role: "advisor", status: "active" }).select("_id name advisorCode");
      if (!advisor) return res.status(400).json({ message: "Advisor code is invalid or inactive" });
    }

    const amount = Number(quotation?.annualPremium || plan.yearlyPremium || plan.yearlyAmount || 0);
    const cover = Number(quotation?.coverageAmount || plan.coverageAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(cover) || cover <= 0) {
      return res.status(400).json({ message: "Plan premium/coverage is invalid. Admin must configure the approved plan premium and coverage before payment." });
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
              coverageAmount: Number(existingPending.coverageAmount || cover),
              yearlyPremium: Number(existingPending.yearlyPremium || amount),
              paymentYears: Number(existingPending.paymentYears || quotation?.paymentYears || plan.paymentYears || 1),
              policyTermYears: Number(existingPending.policyTermYears || quotation?.policyTermYears || plan.policyTermYears || plan.paymentYears || 1),
              premiumFrequency: existingPending.premiumFrequency || quotation?.frequency || "Yearly",
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
      coverageAmount: cover,
      yearlyPremium: amount,
      paymentYears: quotation?.paymentYears || plan.paymentYears || 1,
      policyTermYears: quotation?.policyTermYears || plan.policyTermYears || plan.paymentYears || 1,
      entryAge: Number(quotation?.age || 0),
      coverTillAge: Number(quotation?.coverTillAge || (quotation?.age && quotation?.policyTermYears ? Number(quotation.age)+Number(quotation.policyTermYears) : 0)),
      benefitType: quotation?.benefitType || plan.benefitRules?.benefitType || "",
      benefitSchedule: quotation?.benefitSchedule || [],
      maturityAmount: Number(quotation?.maturityAmount || plan.benefitRules?.maturityAmount || 0),
      deathBenefit: Number(quotation?.deathBenefit || plan.benefitRules?.deathBenefit || cover),
      firstYearPremium: Number(plan.firstYearPremium || amount),
      subsequentYearPremium: Number(plan.subsequentYearPremium || amount),
      premiumFrequency: quotation?.frequency || "Yearly",
      quotationId: quotation?._id || null,
      quotationNumber: quotation?.quotationNumber || "",
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
        coverageAmount: cover,
        yearlyPremium: amount,
        paymentYears: Number(quotation?.paymentYears || plan.paymentYears || 1),
        policyTermYears: Number(quotation?.policyTermYears || plan.policyTermYears || plan.paymentYears || 1),
        premiumFrequency: quotation?.frequency || "Yearly",
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

    const amount = Number(purchase.yearlyPremium || 0);
    const cover = Number(purchase.coverageAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(cover) || cover <= 0) {
      return res.status(400).json({ message: "Purchase premium/coverage is invalid." });
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
        message: "Payment already verified. Insurer issuance is not confirmed.",
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
    purchase.policyStatus = "Inactive";
    purchase.transactionId = transactionId;
    purchase.policyNumber = policyNumber;
    purchase.receiptNumber = receiptNumber;
    purchase.startDate = purchase.startDate || new Date();
    purchase.totalPremiumPayable = amount * Number(purchase.paymentYears || 1);

    if (!purchase.endDate) {
      const endDate = new Date();
      endDate.setFullYear(
        endDate.getFullYear() + Number(purchase.policyTermYears || purchase.paymentYears || 1)
      );
      purchase.endDate = endDate;
    }

    const paymentYears = Math.max(1, Number(purchase.paymentYears || 1));
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
          remarks: "KYC document linked to paid proposal - insurer issuance and KYC verification pending",
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
        status: "pending",
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
      message: "Payment verified. Insurer issuance remains pending.",
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

  if (!purchase.policyNumber || !purchase.receiptNumber) {
    purchase.policyNumber = policyNumber;
    purchase.receiptNumber = receiptNumber;
    // Payment confirmation does not establish insurer-issued coverage.
    // Never activate a policy while repairing payment records.
    purchase.startDate = purchase.startDate || new Date();
    if (!purchase.endDate) {
      const endDate = new Date(purchase.startDate);
      endDate.setFullYear(endDate.getFullYear() + Number(purchase.policyTermYears || purchase.paymentYears || 1));
      purchase.endDate = endDate;
    }
    await purchase.save();
  }

  // Never overwrite an existing insurer-verified active policy on a customer read.
  // Only create a pending servicing record when none exists.
  await Policy.updateOne(
    { policyNumber },
    {
      $setOnInsert: {
        customerName: purchase.proposal?.customerName || customer?.name || "Customer",
        policyName: purchase.planName || "Insurance Plan",
        policyNumber,
        premiumAmount: Number(purchase.yearlyPremium || 0),
        sumAssured: Number(purchase.coverageAmount || 0),
        paymentMode: "yearly",
        status: "pending",
        customerId,
        createdBy: customerId,
      },
    },
    { upsert: true }
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

// Admin review only: a payment reference is not evidence of insurer issuance.
router.get("/issuance-review", auth(["admin"]), async (_req, res) => {
  try {
    const records = await PlanPurchase.find({ paymentStatus: "Paid", policyStatus: "Inactive" })
      .select("_id planName customerId policyNumber receiptNumber transactionId paymentStatus policyStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(records);
  } catch (error) {
    console.error("Issuance review fetch error:", error);
    res.status(500).json({ message: "Unable to load pending insurer issuance reviews" });
  }
});

// Store insurer-issued PDF privately. No public URL is saved or returned.
router.post("/issuance-review/:purchaseId/certificate", auth(["admin"]), certificateUpload.single("certificate"), async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.purchaseId)) return res.status(400).json({ message: "Invalid purchase ID" });
    const purchase = await PlanPurchase.findById(req.params.purchaseId).select("customerId paymentStatus policyStatus serviceHistory");
    if (!purchase || purchase.paymentStatus !== "Paid" || purchase.policyStatus !== "Active" ||
        !(purchase.serviceHistory || []).some(item => item.requestType === "Insurer Issuance Confirmed")) {
      return res.status(409).json({ message: "An admin-recorded insurer issuance confirmation is required first" });
    }
    if (!req.file || req.file.size < 5 || req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ message: "A valid PDF file is required" });
    }
    if (await InsurerCertificate.exists({ purchaseId: purchase._id })) {
      return res.status(409).json({ message: "A certificate is already stored for this purchase" });
    }
    const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const stored = await uploadPrivateDocument({
      buffer: req.file.buffer, mimeType: "application/pdf",
      customerId: String(purchase.customerId), documentType: "insurer-certificate"
    });
    try {
      const certificate = await InsurerCertificate.create({
        purchaseId: purchase._id, customerId: purchase.customerId,
        storagePublicId: stored.public_id, sha256, originalName: String(req.file.originalname || "certificate.pdf").slice(0, 150),
        byteSize: req.file.size, uploadedBy: req.user.id
      });
      return res.status(201).json({ id: certificate._id, sha256, message: "Certificate stored privately" });
    } catch (error) {
      await deletePrivateDocument(stored.public_id).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("Insurer certificate upload error:", error);
    res.status(500).json({ message: "Certificate upload failed" });
  }
});

// Certificate availability contains metadata only; never expose storage identifiers.
router.get("/my-certificate-status", auth(["customer"]), async (req, res) => {
  try {
    const certificates = await InsurerCertificate.find({ customerId: req.user.id })
      .select("purchaseId sha256 createdAt").lean();
    res.json(certificates.map(item => ({
      purchaseId: item.purchaseId, available: true, sha256: item.sha256, uploadedAt: item.createdAt
    })));
  } catch (error) {
    console.error("Certificate status error:", error);
    res.status(500).json({ message: "Unable to load certificate availability" });
  }
});

router.get("/my-issuance-certificates/:purchaseId", auth(["customer", "admin"]), async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.purchaseId)) return res.status(400).json({ message: "Invalid purchase ID" });
    const certificate = await InsurerCertificate.findOne({ purchaseId: req.params.purchaseId }).lean();
    if (!certificate) return res.status(404).json({ message: "Certificate not found" });
    if (req.user.role !== "admin" && String(certificate.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json({ downloadUrl: signedDownloadUrl(certificate.storagePublicId), sha256: certificate.sha256, originalName: certificate.originalName });
  } catch (error) {
    console.error("Insurer certificate access error:", error);
    res.status(500).json({ message: "Unable to access certificate" });
  }
});

// Read-only audit: administrators can review recorded insurer confirmations.
router.get("/issuance-audit", auth(["admin"]), async (_req, res) => {
  try {
    const records = await PlanPurchase.find({
      "serviceHistory.requestType": "Insurer Issuance Confirmed"
    }).select("_id planName policyNumber policyStatus paymentStatus serviceHistory").sort({ updatedAt: -1 }).limit(200).lean();
    res.json(records.flatMap(record => (record.serviceHistory || [])
      .filter(entry => entry.requestType === "Insurer Issuance Confirmed")
      .map(entry => ({
        purchaseId: record._id, planName: record.planName, appPolicyReference: record.policyNumber,
        policyStatus: record.policyStatus, paymentStatus: record.paymentStatus,
        insurerName: String(entry.previousValue?.insurerName || ""),
        insurerPolicyNumber: String(entry.previousValue?.insurerPolicyNumber || ""),
        evidenceReference: String(entry.previousValue?.evidenceReference || ""),
        certificateSha256: String(entry.previousValue?.certificateSha256 || ""),
        confirmedAt: entry.changedAt || null,
        confirmedBy: entry.previousValue?.confirmedBy || null
      }))));
  } catch (error) {
    console.error("Issuance audit error:", error);
    res.status(500).json({ message: "Could not load issuance audit" });
  }
});

// Manual insurer confirmation: restricted to authenticated administrators.
// Evidence is an external insurer reference, never a SecureLife-generated receipt.
router.post("/issuance-review/:purchaseId/confirm", auth(["admin"]), async (req, res) => {
  try {
    const { purchaseId } = req.params;
    if (!/^[a-f0-9]{24}$/i.test(purchaseId)) {
      return res.status(400).json({ message: "Invalid purchase ID" });
    }
    const certificateSha256 = String(req.body?.certificateSha256 || "").trim().toLowerCase();
    if (certificateSha256 && !/^[a-f0-9]{64}$/.test(certificateSha256)) {
      return res.status(400).json({ message: "Certificate SHA-256 must be a 64-character hexadecimal digest" });
    }
    const insurerName = String(req.body?.insurerName || "").trim();
    const insurerPolicyNumber = String(req.body?.insurerPolicyNumber || "").trim();
    const evidenceReference = String(req.body?.evidenceReference || "").trim();
    if (!insurerName || !insurerPolicyNumber || !evidenceReference ||
        [insurerName, insurerPolicyNumber, evidenceReference].some(v => v.length > 200)) {
      return res.status(400).json({ message: "Insurer name, insurer-issued policy number and verification evidence reference are required (max 200 characters each)." });
    }
    const purchase = await PlanPurchase.findById(purchaseId);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    if (purchase.paymentStatus !== "Paid" || !purchase.transactionId || !purchase.policyNumber) {
      return res.status(409).json({ message: "Verified payment and application reference required before insurer confirmation" });
    }
    if (purchase.policyStatus !== "Inactive") {
      return res.status(409).json({ message: "Only inactive paid proposals may be confirmed" });
    }
    const existing = await PlanPurchase.findOne({
      _id: { $ne: purchase._id },
      "serviceHistory.requestType": "Insurer Issuance Confirmed",
      "serviceHistory.previousValue.insurerPolicyNumber": insurerPolicyNumber,
    }).select("_id");
    if (existing) return res.status(409).json({ message: "Insurer policy number is already recorded on another purchase" });
    const confirmedAt = new Date();
    const updated = await PlanPurchase.findOneAndUpdate(
      { _id: purchase._id, paymentStatus: "Paid", policyStatus: "Inactive", transactionId: purchase.transactionId },
      {
        $set: { policyStatus: "Active" },
        $push: { serviceHistory: {
          requestType: "Insurer Issuance Confirmed",
          previousValue: { insurerName, insurerPolicyNumber, evidenceReference, certificateSha256, confirmedBy: req.user.id, confirmedAt },
          changedAt: confirmedAt,
        } },
      },
      { new: true }
    );
    if (!updated) return res.status(409).json({ message: "Purchase status changed; refresh and retry" });
    await Policy.updateOne({ policyNumber: purchase.policyNumber, customerId: purchase.customerId },
      { $set: { status: "active" } });
    res.json({ message: "Admin recorded insurer issuance confirmation.", policyStatus: updated.policyStatus, confirmedAt });
  } catch (error) {
    console.error("Insurer issuance confirmation error:", error);
    res.status(500).json({ message: "Could not record insurer confirmation; check policy status before retrying" });
  }
});

// Return insurer confirmation audit to the policy owner without exposing admin identity.
router.get("/my-issuance-history", auth(["customer"]), async (req, res) => {
  try {
    const records = await PlanPurchase.find({ customerId: req.user.id, paymentStatus: "Paid" })
      .select("_id policyStatus serviceHistory")
      .lean();
    res.json(records.map(record => {
      const confirmation = (record.serviceHistory || [])
        .filter(entry => entry.requestType === "Insurer Issuance Confirmed")
        .sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0))[0];
      const details = confirmation?.previousValue || {};
      return {
        purchaseId: record._id,
        policyStatus: record.policyStatus,
        insurerConfirmed: Boolean(confirmation),
        insurerName: confirmation ? String(details.insurerName || "") : "",
        insurerPolicyNumber: confirmation ? String(details.insurerPolicyNumber || "") : "",
        confirmedAt: confirmation?.changedAt || null,
      };
    }));
  } catch (error) {
    console.error("Customer issuance history error:", error);
    res.status(500).json({ message: "Could not load insurer issuance history" });
  }
});

router.get("/my-plans", auth(["customer"]), async (req, res) => {
  try {
    const purchases = await PlanPurchase.find({ customerId: req.user.id }).sort({ createdAt: -1 });

    for (const purchase of purchases) {
      await syncPaidPurchase(purchase, req.user.id);
    }

    const customerPlans = await PlanPurchase.find({ customerId: req.user.id })
      .select(
        "_id planId planName category coverageAmount yearlyPremium paymentYears policyTermYears entryAge coverTillAge benefitType benefitSchedule maturityAmount deathBenefit premiumFrequency totalPremiumPayable nextPremiumDate paymentStatus policyStatus transactionId policyNumber receiptNumber startDate endDate proposal.customerName proposal.nomineeName proposal.nomineeRelation createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const policyNumbers=customerPlans.map(p=>p.policyNumber).filter(Boolean);
    const premiumRows=policyNumbers.length?await Premium.find({policyNumber:{$in:policyNumbers}}).select("policyNumber amount dueDate paidDate status receiptNumber").sort({dueDate:1}).lean():[];
    const byPolicy=new Map();
    premiumRows.forEach(p=>{if(!byPolicy.has(p.policyNumber))byPolicy.set(p.policyNumber,[]);byPolicy.get(p.policyNumber).push(p);});
    const result=customerPlans.map(p=>{const premiums=byPolicy.get(p.policyNumber)||[];const paid=premiums.filter(x=>x.status==="Paid");const paidAmount=paid.reduce((n,x)=>n+Number(x.amount||0),0);return {...p,premiumProgress:{paidCount:paid.length,remainingCount:Math.max(0,Number(p.paymentYears||1)-paid.length),paidAmount,premiums}};});
    res.json(result);
  } catch (error) {
    console.error("My plans error:", error);
    res.status(500).json({ message: "My plans fetch failed" });
  }
});

module.exports = router;