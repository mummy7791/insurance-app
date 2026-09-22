const router = require("express").Router();
const Premium = require("../models/Premium");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");
const PlanPurchase = require("../models/PlanPurchase");
const Notification = require("../models/Notification");

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
    baseUrl: env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || data?.type || "Cashfree request failed");
    error.cashfree = data;
    throw error;
  }
  return data;
};

const makeReference = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const lifecycleStatus=(premium)=>{
 if(premium.status==="Paid") return "Paid";
 const due=new Date(String(premium.dueDate||"")+"T00:00:00"); if(Number.isNaN(due.getTime())) return premium.status||"Due";
 const today=new Date();today.setHours(0,0,0,0);const days=Math.floor((today-due)/86400000);
 if(days>30)return "Lapsed";if(days>0)return "Grace Period";if(days===0)return "Due";return "Upcoming";
};
const syncLifecycle=async(items)=>{for(const item of items){const next=lifecycleStatus(item);if(item.status!==next){item.status=next;item.lifecycleUpdatedAt=new Date();await item.save();}}return items;};

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
    await syncLifecycle(premiums);
    res.json(premiums);
  } catch (error) {
    console.error("Premiums fetch error:", error);
    res.status(500).json({ message: "Premiums fetch failed" });
  }
});


// Customer: create a Cashfree order for an outstanding renewal premium.
router.post("/:id/create-payment-order", auth(["customer"]), async (req, res) => {
  try {
    const premium = await Premium.findById(req.params.id);
    if (!premium) return res.status(404).json({ message: "Premium not found" });
    if (premium.status === "Paid") return res.status(409).json({ message: "Premium is already paid" });
    if (lifecycleStatus(premium) === "Lapsed") return res.status(409).json({ message: "Premium is beyond the configured grace period. Contact policy servicing for reinstatement." });

    const policy = await Policy.findOne({ policyNumber: premium.policyNumber, customerId: req.user.id });
    if (!policy) return res.status(403).json({ message: "This premium does not belong to your policy" });

    const amount = Number(premium.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Premium amount is invalid" });

    if (premium.gatewayOrderId) {
      try {
        const existing = await cashfreeRequest(`/orders/${encodeURIComponent(premium.gatewayOrderId)}`, { method: "GET" });
        if (existing.order_status === "ACTIVE" && existing.payment_session_id && Number(existing.order_amount) === amount) {
          return res.json({ orderId: premium.gatewayOrderId, paymentSessionId: existing.payment_session_id, amount, currency: "INR" });
        }
      } catch (error) {
        console.warn("Renewal order reuse failed:", error?.message || error);
      }
    }

    const user = await require("../models/User").findById(req.user.id).select("name email phone");
    const phone = String(user?.phone || "").replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) return res.status(400).json({ message: "Add a valid 10-digit phone number to your profile before payment" });

    const orderId = makeReference("REN");
    const order = await cashfreeRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${String(req.user.id).slice(-24)}`,
          customer_name: user?.name || premium.customerName || "Customer",
          customer_email: user?.email || "",
          customer_phone: phone,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || "https://insurance-app-rose.vercel.app"}/premiums?cf_renewal_order_id={order_id}&premium_id=${premium._id}`,
        },
        order_note: `SecureLife renewal - ${premium.policyNumber}`,
      }),
    });

    premium.gatewayOrderId = orderId;
    await premium.save();
    res.json({ orderId, paymentSessionId: order.payment_session_id, amount, currency: "INR" });
  } catch (error) {
    console.error("Renewal order create error:", error);
    res.status(error?.code === "CASHFREE_NOT_CONFIGURED" ? 503 : 500).json({ message: "Renewal payment could not be started" });
  }
});

// Customer: server-verify Cashfree renewal payment before marking the premium paid.
router.post("/:id/verify-payment", auth(["customer"]), async (req, res) => {
  try {
    const premium = await Premium.findById(req.params.id);
    if (!premium) return res.status(404).json({ message: "Premium not found" });

    const policy = await Policy.findOne({ policyNumber: premium.policyNumber, customerId: req.user.id });
    if (!policy) return res.status(403).json({ message: "This premium does not belong to your policy" });

    const orderId = String(req.body?.orderId || "");
    if (!orderId || orderId !== premium.gatewayOrderId) return res.status(400).json({ message: "Payment order does not match this premium" });

    const [order, payments] = await Promise.all([
      cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" }),
      cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`, { method: "GET" }),
    ]);

    if (order.order_status !== "PAID" || order.order_currency !== "INR" || Number(order.order_amount) !== Number(premium.amount)) {
      return res.status(400).json({ message: "Payment is not completed or amount does not match" });
    }

    const success = Array.isArray(payments) ? payments.find((item) => item.payment_status === "SUCCESS") : null;
    if (!success?.cf_payment_id) return res.status(400).json({ message: "Successful payment record not found" });

    if (premium.status === "Paid" && premium.gatewayPaymentId === String(success.cf_payment_id)) {
      return res.json({ message: "Premium already verified", premium, alreadyVerified: true });
    }

    premium.status = "Paid";
    premium.paidDate = new Date().toISOString().split("T")[0];
    premium.paymentMode = "UPI";
    premium.gatewayPaymentId = String(success.cf_payment_id);
    premium.receiptNumber = premium.receiptNumber || makeReference("RCPT");
    await premium.save();

    const nextDue = await Premium.findOne({
      policyNumber: premium.policyNumber,
      status: { $in: ["Due", "Overdue"] },
    }).sort({ dueDate: 1 });

    await PlanPurchase.findOneAndUpdate(
      { policyNumber: premium.policyNumber, customerId: req.user.id },
      { nextPremiumDate: nextDue?.dueDate ? new Date(nextDue.dueDate) : null }
    );

    const notification = await Notification.create({
      recipientId: req.user.id,
      title: "Premium payment successful",
      message: `Payment of INR ${Number(premium.amount || 0).toLocaleString("en-IN")} for policy ${premium.policyNumber} was verified successfully. Receipt: ${premium.receiptNumber}.`,
      type: "Payment Successful",
      date: premium.paidDate,
      reference: premium.receiptNumber,
      actionLabel: "View receipt",
      actionUrl: "/premiums",
    });
    req.app.get("io").to(`user:${String(req.user.id)}`).emit("newNotification", notification);

    res.json({ message: "Renewal premium verified", premium, nextPremiumDate: nextDue?.dueDate || null });
  } catch (error) {
    console.error("Renewal verify error:", error);
    res.status(500).json({ message: "Renewal payment verification failed. If money was debited, do not pay again; refresh your premium history." });
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