const express = require("express");
const router = express.Router();
const Commission = require("../models/Commission");
const PlanPurchase = require("../models/PlanPurchase");
const InsurancePlan = require("../models/InsurancePlan");
const User = require("../models/User");
const AdvisorBank = require("../models/AdvisorBank");
const auth = require("../middleware/auth");

const syncAdvisorBusiness = async (advisorId = null) => {
  const query = { paymentStatus: "Paid", policyStatus: "Active", advisorId: { $ne: null } };
  if (advisorId) query.advisorId = advisorId;
  const purchases = await PlanPurchase.find(query).lean();
  for (const purchase of purchases) {
    if (!purchase.policyNumber) continue;
    const advisor = await User.findById(purchase.advisorId).select("name advisorCode");
    if (!advisor) continue;
    const rate = Number(purchase.advisorCommissionRate || 0);
    const amount = Number(purchase.yearlyPremium || 0);
    await Commission.findOneAndUpdate(
      { advisorId: purchase.advisorId, policyNumber: purchase.policyNumber },
      { $setOnInsert: {
        advisorId: purchase.advisorId,
        advisorCode: purchase.advisorCode || advisor.advisorCode || "",
        employeeName: advisor.name,
        employeeRole: "Agent",
        customerName: purchase.proposal?.customerName || "Customer",
        policyNumber: purchase.policyNumber,
        premiumAmount: amount,
        commissionRate: rate,
        commissionAmount: Math.round(amount * rate / 100),
        month: new Date(purchase.startDate || purchase.createdAt).toISOString().slice(0,7),
        status: "Eligible",
        remarks: "Business linked through advisor code",
        planName: purchase.planName || "",
        policyStatus: purchase.policyStatus,
        purchaseDate: purchase.startDate || purchase.createdAt,
        nextPremiumDate: purchase.nextPremiumDate || null,
      }},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

router.get("/plans", auth(["admin"]), async (_req,res)=>{
  try {
    const plans=await InsurancePlan.find().select("_id planName category yearlyPremium advisorCommissionRate status").sort({planName:1}).lean();
    res.json(plans);
  } catch(error){ console.error(error); res.status(500).json({message:"Plan commission settings load failed"}); }
});

router.put("/plans/:id", auth(["admin"]), async (req,res)=>{
  try {
    const rate=Number(req.body.advisorCommissionRate);
    if(!Number.isFinite(rate)||rate<0||rate>100) return res.status(400).json({message:"Commission rate must be between 0 and 100"});
    const plan=await InsurancePlan.findByIdAndUpdate(req.params.id,{advisorCommissionRate:rate},{new:true,runValidators:true});
    if(!plan) return res.status(404).json({message:"Plan not found"});
    res.json(plan);
  } catch(error){ console.error(error); res.status(500).json({message:"Plan commission update failed"}); }
});

router.get("/", auth(["admin","bm","unit_manager","agency_manager","advisor"]), async (req,res)=>{
  try {
    await syncAdvisorBusiness(req.user.role==="advisor" ? req.user.id : null);
    const query=req.user.role==="advisor"?{advisorId:req.user.id}:{};
    res.json(await Commission.find(query).sort({createdAt:-1}));
  } catch(error){ console.error(error); res.status(500).json({message:"Commission fetch failed"}); }
});

router.post("/:id/request", auth(["advisor"]), async (req,res)=>{
  try {
    const item=await Commission.findOne({_id:req.params.id,advisorId:req.user.id});
    if(!item) return res.status(404).json({message:"Commission record not found"});
    if(!["Eligible","Rejected"].includes(item.status)) return res.status(400).json({message:"This commission is already submitted or settled"});
    item.status="Requested";
    item.requestedAt=new Date();
    item.remarks=String(req.body.remarks||"Payout requested by advisor").trim().slice(0,500);
    await item.save();
    res.json(item);
  } catch(error){ console.error(error); res.status(500).json({message:"Payout request failed"}); }
});

router.put("/:id/review", auth(["admin"]), async (req,res)=>{
  try {
    const decision=String(req.body.status||"");
    if(!["Paid","Rejected"].includes(decision)) return res.status(400).json({message:"Choose Paid or Rejected"});
    const item=await Commission.findById(req.params.id);
    if(!item) return res.status(404).json({message:"Commission record not found"});
    if(item.status!=="Requested") return res.status(400).json({message:"Only requested payouts can be reviewed"});
    if(decision==="Paid"){const bank=await AdvisorBank.findOne({advisorId:item.advisorId,status:"Approved"}).select("_id");if(!bank)return res.status(409).json({message:"Advisor payout account must be approved before commission can be paid"});}
    const remarks=String(req.body.remarks||"").trim().slice(0,500);
    if(!remarks) return res.status(400).json({message:"Admin remarks are required"});
    item.status=decision;
    item.remarks=remarks;
    item.reviewedAt=new Date();
    item.paidDate=decision==="Paid" ? (req.body.paidDate ? new Date(req.body.paidDate) : new Date()) : null;
    await item.save();
    res.json(item);
  } catch(error){ console.error(error); res.status(500).json({message:"Payout review failed"}); }
});

module.exports = router;
