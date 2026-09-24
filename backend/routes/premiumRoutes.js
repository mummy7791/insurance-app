const router = require("express").Router();
const Premium = require("../models/Premium");
const auth = require("../middleware/auth");
const {writeAudit}=require("../services/auditService");
const Policy = require("../models/Policy");
const PlanPurchase = require("../models/PlanPurchase");
const Notification = require("../models/Notification");
const Customer = require("../models/Customer");
const Followup = require("../models/Followup");

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

    await writeAudit(req,{action:"PREMIUM_CREATED",module:"Premiums",description:`Premium created for policy ${premium.policyNumber}`});
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


// Staff: enriched renewal register for status-specific exports.
router.get("/renewal-report", auth(STAFF_ROLES), async (req, res) => {
  try {
    const premiums = await Premium.find({}).sort({ dueDate: 1, createdAt: -1 });
    await syncLifecycle(premiums);

    const policyNumbers = [...new Set(premiums.map((p) => p.policyNumber).filter(Boolean))];
    const [policies, purchases, customers] = await Promise.all([
      Policy.find({ policyNumber: { $in: policyNumbers } }).select("policyNumber customerId policyName").lean(),
      PlanPurchase.find({ policyNumber: { $in: policyNumbers } })
        .select("policyNumber planName premiumFrequency advisorCode proposal customerId advisorId")
        .populate("advisorId", "name advisorCode")
        .lean(),
      Customer.find({ policyNo: { $in: policyNumbers } }).select("policyNo name phone address").lean(),
    ]);

    const policyMap = new Map(policies.map((p) => [p.policyNumber, p]));
    const purchaseMap = new Map(purchases.map((p) => [p.policyNumber, p]));
    const customerMap = new Map(customers.map((c) => [c.policyNo, c]));
    const userIds = [...new Set(policies.map((p) => String(p.customerId || "")).filter(Boolean))];
    const users = userIds.length ? await require("../models/User").find({ _id: { $in: userIds } }).select("name phone address").lean() : [];
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const today = new Date(); today.setHours(0,0,0,0);
    const rows = premiums.map((premium) => {
      const policy = policyMap.get(premium.policyNumber);
      const purchase = purchaseMap.get(premium.policyNumber);
      const customer = customerMap.get(premium.policyNumber);
      const user = policy?.customerId ? userMap.get(String(policy.customerId)) : null;
      const due = new Date(String(premium.dueDate || "") + "T00:00:00");
      const daysDifference = Number.isNaN(due.getTime()) ? 0 : Math.round((due - today) / 86400000);
      return {
        id: String(premium._id),
        status: premium.status,
        customerName: premium.customerName || purchase?.proposal?.customerName || customer?.name || user?.name || "",
        customerPhone: purchase?.proposal?.customerPhone || customer?.phone || user?.phone || "",
        address: purchase?.proposal?.address || customer?.address || user?.address || "",
        policyNumber: premium.policyNumber,
        planName: purchase?.planName || policy?.policyName || "",
        amount: Number(premium.amount || 0),
        dueDate: premium.dueDate,
        daysDifference,
        advisorName: purchase?.advisorId?.name || "",
        advisorCode: purchase?.advisorCode || purchase?.advisorId?.advisorCode || "",
        premiumFrequency: purchase?.premiumFrequency || "",
      };
    });
    res.json({ rows });
  } catch (error) {
    console.error("Renewal report error:", error);
    res.status(500).json({ message: "Renewal report fetch failed" });
  }
});

// Staff: premium collection analytics for renewal operations.
router.get("/analytics", auth(STAFF_ROLES), async (req, res) => {
  try {
    const premiums = await Premium.find({}).lean();
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth()+1, 0, 23,59,59,999);
    const todayKey = today.toISOString().slice(0,10);
    const next7 = new Date(today); next7.setDate(next7.getDate()+7);
    const next7Key = next7.toISOString().slice(0,10);
    const currentMonth = todayKey.slice(0,7);

    const thisMonthDue = premiums.filter(p => String(p.dueDate||"").slice(0,7)===currentMonth);
    const collected = premiums.filter(p => p.status==="Paid" && p.paidDate && new Date(p.paidDate)>=monthStart && new Date(p.paidDate)<=monthEnd);
    const sum = items => items.reduce((n,p)=>n+Number(p.amount||0),0);
    const dueAmount = sum(thisMonthDue), collectedAmount = sum(collected);
    const pendingAmount = sum(thisMonthDue.filter(p=>p.status!=="Paid"));
    const collectionPercent = dueAmount>0 ? Math.round((collectedAmount/dueAmount)*10000)/100 : 0;
    const graceAmount = sum(premiums.filter(p=>p.status==="Grace Period"));
    const lapsedAmount = sum(premiums.filter(p=>p.status==="Lapsed"));

    const months=[];
    for(let i=5;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1);const key=d.toISOString().slice(0,7);months.push({month:d.toLocaleString("en-IN",{month:"short",year:"2-digit"}),due:sum(premiums.filter(p=>String(p.dueDate||"").slice(0,7)===key)),collected:sum(premiums.filter(p=>p.status==="Paid"&&String(p.paidDate||"").slice(0,7)===key))});}

    const purchases=await PlanPurchase.find({policyNumber:{$in:[...new Set(premiums.map(p=>p.policyNumber).filter(Boolean))]}}).select("policyNumber advisorCode advisorId").populate("advisorId","name advisorCode").lean();
    const purchaseMap=new Map(purchases.map(p=>[p.policyNumber,p]));
    const advisorMap=new Map();
    premiums.forEach(p=>{const x=purchaseMap.get(p.policyNumber);const code=x?.advisorCode||x?.advisorId?.advisorCode||"Unassigned",name=x?.advisorId?.name||"Unassigned";if(!advisorMap.has(code))advisorMap.set(code,{advisorCode:code,advisorName:name,due:0,collected:0,pending:0});const a=advisorMap.get(code);a.due+=Number(p.amount||0);if(p.status==="Paid")a.collected+=Number(p.amount||0);else a.pending+=Number(p.amount||0);});
    const advisorPerformance=[...advisorMap.values()].map(a=>({...a,collectionPercent:a.due?Math.round(a.collected/a.due*10000)/100:0})).sort((a,b)=>b.collected-a.collected);

    const followups=await Followup.find({premiumId:{$ne:null}}).sort({createdAt:1}).lean();
    const followupMap=new Map();followups.forEach(x=>{const k=String(x.premiumId);if(!followupMap.has(k))followupMap.set(k,[]);followupMap.get(k).push({status:x.status,date:x.date,remarks:x.remarks});});
    const timeline=premiums.slice().sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,50).map(p=>({premiumId:String(p._id),customerName:p.customerName,policyNumber:p.policyNumber,dueDate:p.dueDate,status:p.status,events:[{label:"Premium Due",date:p.dueDate},...(followupMap.get(String(p._id))||[]).map(x=>({label:x.status,date:x.date,remarks:x.remarks})),...(p.status==="Paid"?[{label:"Payment Received",date:p.paidDate},{label:"Receipt Generated",date:p.paidDate,remarks:p.receiptNumber||""}]:[])]}));

    const todayList=premiums.filter(p=>p.dueDate===todayKey);
    const next7Days=premiums.filter(p=>p.status!=="Paid"&&p.dueDate>todayKey&&p.dueDate<=next7Key).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    res.json({summary:{thisMonthDueAmount:dueAmount,collectedAmount,pendingAmount,collectionPercent,graceAmount,lapsedAmount},months,advisorPerformance,timeline,todayList,next7Days});
  } catch(error){console.error("Premium analytics error:",error);res.status(500).json({message:"Premium analytics failed"});}
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
    await writeAudit(req,{action:"PREMIUM_PAYMENT_VERIFIED",module:"Premiums",description:`Renewal payment verified for policy ${premium.policyNumber}`});

    const nextDue = await Premium.findOne({
      policyNumber: premium.policyNumber,
      status: { $in: ["Upcoming", "Due", "Grace Period", "Overdue"] },
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

    await writeAudit(req,{action:`PREMIUM_${String(premium.status||"UPDATED").toUpperCase().replace(/\\s+/g,"_")}`,module:"Premiums",description:`Premium status updated for policy ${premium.policyNumber}`});
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
    await writeAudit(req,{action:"PREMIUM_DELETED",module:"Premiums",description:`Premium record deleted for policy ${premium.policyNumber}`});
    res.json({ message: "Premium deleted" });
  } catch (error) {
    console.error("Premium delete error:", error);
    res.status(500).json({ message: "Premium delete failed" });
  }
});

module.exports = router;