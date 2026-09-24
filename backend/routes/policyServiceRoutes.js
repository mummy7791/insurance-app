const router=require("express").Router();
const PolicyServiceRequest=require("../models/PolicyServiceRequest");
const PlanPurchase=require("../models/PlanPurchase");
const Policy=require("../models/Policy");
const InsurancePlan=require("../models/InsurancePlan");
const Premium=require("../models/Premium");
const auth=require("../middleware/auth");
const {writeAudit}=require("../services/auditService");
const STAFF=["admin","bm","unit_manager","agency_manager","agent"];
const clean=(v,n=500)=>String(v||"").trim().slice(0,n);
router.get("/",auth([...STAFF,"customer"]),async(req,res)=>{try{const q=req.user.role==="customer"?{customerId:req.user.id}:{};res.json(await PolicyServiceRequest.find(q).sort({createdAt:-1}))}catch(e){res.status(500).json({message:"Service requests load failed"})}});
router.post("/",auth(["customer"]),async(req,res)=>{try{
 const policyNumber=clean(req.body.policyNumber,80),requestType=clean(req.body.requestType,40),requestedValue=clean(req.body.requestedValue,1000);
 if(!policyNumber||!requestedValue||!["Nominee Change","Address Change","Contact Update","Bank Update","Cover Enhancement","Policy Loan","Partial Withdrawal","Surrender Policy","Other"].includes(requestType))return res.status(400).json({message:"Complete valid service request details"});
 const [purchase,policy]=await Promise.all([PlanPurchase.findOne({customerId:req.user.id,policyNumber}),Policy.findOne({customerId:req.user.id,policyNumber})]);
 if(!purchase&&!policy)return res.status(403).json({message:"Policy does not belong to this customer"});
 let coverEnhancement=undefined,financialRequest=undefined,surrenderRequest=undefined;
 if(requestType==="Cover Enhancement"){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"Cover enhancement is available only for active purchased policies"});
   const requestedCover=Number(req.body.requestedCover||requestedValue);
   const currentCover=Number(purchase.coverageAmount||0),currentPremium=Number(purchase.yearlyPremium||0);
   if(!Number.isFinite(requestedCover)||requestedCover<=currentCover)return res.status(400).json({message:"Requested cover must be higher than current cover"});
   const plan=await InsurancePlan.findById(purchase.planId).lean();
   if(!plan)return res.status(404).json({message:"Original insurance plan not found"});
   const ratio=currentCover>0?requestedCover/currentCover:0;
   if(!ratio||!Number.isFinite(ratio))return res.status(400).json({message:"Current policy cover is invalid"});
   const estimatedPremium=Math.max(1,Math.round(currentPremium*ratio));
   coverEnhancement={currentCover,requestedCover,currentPremium,estimatedPremium};
 }
 if(["Policy Loan","Partial Withdrawal"].includes(requestType)){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"This facility is available only for active purchased policies"});
   const plan=await InsurancePlan.findById(purchase.planId).lean();
   const rules=plan?.loanRules||{};
   if(!rules.enabled)return res.status(400).json({message:"Loan/withdrawal is not enabled for this plan"});
   if(requestType==="Partial Withdrawal"&&!rules.partialWithdrawalEnabled)return res.status(400).json({message:"Partial withdrawal is not enabled for this plan"});
   const start=new Date(purchase.startDate||purchase.createdAt),now=new Date();
   const policyYear=Math.max(1,now.getFullYear()-start.getFullYear()+1);
   const eligibleFrom=Math.max(1,Number(rules.eligibleFromPolicyYear||1));
   if(policyYear<eligibleFrom)return res.status(400).json({message:`Eligible from policy year ${eligibleFrom}`});
   const paid=await Premium.find({policyNumber,status:"Paid"}).select("amount").lean();
   const paidPremiumAmount=paid.reduce((n,x)=>n+Number(x.amount||0),0);
   const eligibleAmount=Math.max(0,Math.floor(paidPremiumAmount*Math.max(0,Math.min(100,Number(rules.maxPercentOfPaidPremium||0)))/100));
   const previous=await PolicyServiceRequest.find({customerId:req.user.id,policyNumber,requestType,status:"Approved"}).select("financialRequest.approvedAmount").lean();
   const alreadyApproved=previous.reduce((n,x)=>n+Number(x.financialRequest?.approvedAmount||0),0);
   const availableAmount=Math.max(0,eligibleAmount-alreadyApproved);
   const requestedAmount=Number(req.body.requestedAmount||requestedValue);
   if(!Number.isFinite(requestedAmount)||requestedAmount<=0||requestedAmount>availableAmount)return res.status(400).json({message:`Requested amount must be within available eligibility INR ${availableAmount}`});
   financialRequest={requestedAmount,eligibleAmount:availableAmount,approvedAmount:0,paidPremiumAmount,eligibleFromPolicyYear:eligibleFrom,settlementStatus:"Pending"};
 }
 if(requestType==="Surrender Policy"){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"Only active purchased policies can be surrendered"});
   const plan=await InsurancePlan.findById(purchase.planId).lean(),rules=plan?.surrenderRules||{};
   if(!rules.enabled)return res.status(400).json({message:"Surrender is not enabled for this plan"});
   const start=new Date(purchase.startDate||purchase.createdAt),now=new Date();
   const policyYear=Math.max(1,now.getFullYear()-start.getFullYear()+1),eligibleFrom=Math.max(1,Number(rules.eligibleFromPolicyYear||1));
   if(policyYear<eligibleFrom)return res.status(400).json({message:`Surrender is eligible from policy year ${eligibleFrom}`});
   const paid=await Premium.find({policyNumber,status:"Paid"}).select("amount").lean();
   const paidPremiumAmount=paid.reduce((n,x)=>n+Number(x.amount||0),0);
   const percent=Math.max(0,Math.min(100,Number(rules.valuePercentOfPaidPremium||0)));
   const estimatedValue=Math.floor(paidPremiumAmount*percent/100);
   if(estimatedValue<=0)return res.status(400).json({message:"No surrender value is available under the configured plan rules"});
   surrenderRequest={paidPremiumAmount,policyYear,estimatedValue,approvedValue:0,eligibleFromPolicyYear:eligibleFrom,settlementStatus:"Pending"};
 }
 const open=await PolicyServiceRequest.findOne({customerId:req.user.id,policyNumber,requestType,status:{$in:["Submitted","Under Review"]}});
 if(open)return res.status(409).json({message:"An open request of this type already exists for this policy"});
 const item=await PolicyServiceRequest.create({customerId:req.user.id,policyNumber,requestType,currentValue:clean(req.body.currentValue,1000),requestedValue,customerRemarks:clean(req.body.customerRemarks),coverEnhancement,financialRequest,surrenderRequest,status:"Submitted"});
 await writeAudit(req,{action:"SERVICE_REQUEST_SUBMITTED",module:"Policy Services",description:`${requestType} request submitted for ${policyNumber}`});
 res.status(201).json(item);
}catch(e){console.error(e);res.status(500).json({message:"Service request submission failed"})}});
router.patch("/:id/review",auth(STAFF),async(req,res)=>{try{const item=await PolicyServiceRequest.findById(req.params.id);if(!item)return res.status(404).json({message:"Request not found"});const status=clean(req.body.status,20),remarks=clean(req.body.adminRemarks);if(!["Under Review","Approved","Rejected"].includes(status))return res.status(400).json({message:"Invalid review status"});if(status==="Rejected"&&!remarks)return res.status(400).json({message:"Rejection reason is required"});if(["Approved","Rejected"].includes(item.status))return res.status(409).json({message:"This service request is already closed"});if(status==="Approved"&&item.requestType==="Cover Enhancement"){
 const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber});
 if(!purchase||purchase.policyStatus!=="Active")return res.status(409).json({message:"Active policy purchase not found"});
 const currentCover=Number(purchase.coverageAmount||0),requestedCover=Number(item.coverEnhancement?.requestedCover||0);
 if(!requestedCover||requestedCover<=currentCover)return res.status(409).json({message:"Cover enhancement values are no longer valid"});
 const currentPremium=Number(purchase.yearlyPremium||0);
 const estimatedPremium=Number(item.coverEnhancement?.estimatedPremium||0);
 purchase.coverageAmount=requestedCover;
 purchase.yearlyPremium=estimatedPremium;
 purchase.totalPremiumPayable=estimatedPremium*Number(purchase.paymentYears||1);
 purchase.deathBenefit=Math.max(Number(purchase.deathBenefit||0),requestedCover);
 await purchase.save();
 await Policy.findOneAndUpdate({customerId:item.customerId,policyNumber:item.policyNumber},{$set:{sumAssured:requestedCover,premiumAmount:estimatedPremium}});
 item.currentValue=`Cover INR ${currentCover}; Premium INR ${currentPremium}`;
 item.requestedValue=`Cover INR ${requestedCover}; Premium INR ${estimatedPremium}`;
 item.coverEnhancement.effectiveDate=new Date();
 }
 if(status==="Approved"&&["Policy Loan","Partial Withdrawal"].includes(item.requestType)){
   const approvedAmount=Number(req.body.approvedAmount||item.financialRequest?.requestedAmount||0);
   if(!Number.isFinite(approvedAmount)||approvedAmount<=0||approvedAmount>Number(item.financialRequest?.eligibleAmount||0))return res.status(400).json({message:"Approved amount exceeds request eligibility"});
   item.financialRequest.approvedAmount=approvedAmount;item.financialRequest.settlementStatus="Approved";
 }
 if(status==="Rejected"&&["Policy Loan","Partial Withdrawal"].includes(item.requestType))item.financialRequest.settlementStatus="Rejected";
 if(status==="Approved"&&item.requestType==="Surrender Policy"){
   const approvedValue=Number(req.body.approvedAmount||item.surrenderRequest?.estimatedValue||0);
   if(!Number.isFinite(approvedValue)||approvedValue<0)return res.status(400).json({message:"Enter a valid approved surrender value"});
   item.surrenderRequest.approvedValue=approvedValue;item.surrenderRequest.settlementStatus="Approved";
 }
 if(status==="Rejected"&&item.requestType==="Surrender Policy")item.surrenderRequest.settlementStatus="Rejected";
 item.status=status;item.adminRemarks=remarks;item.reviewedBy=req.user.id;item.reviewedAt=new Date();await item.save();await writeAudit(req,{action:`SERVICE_REQUEST_${status.toUpperCase().replace(" ","_")}`,module:"Policy Services",description:`${item.requestType} for ${item.policyNumber} changed to ${status}`,targetUserId:item.customerId});res.json(item)}catch(e){res.status(500).json({message:"Service request review failed"})}});
router.patch("/:id/settlement",auth(STAFF),async(req,res)=>{try{
 const item=await PolicyServiceRequest.findById(req.params.id);if(!item)return res.status(404).json({message:"Request not found"});
 if(!["Policy Loan","Partial Withdrawal","Surrender Policy"].includes(item.requestType)||item.status!=="Approved")return res.status(409).json({message:"Only approved financial service requests can be settled"});
 const settlementStatus=clean(req.body.settlementStatus,20);if(!["Approved","Paid"].includes(settlementStatus))return res.status(400).json({message:"Invalid settlement status"});
 if(item.requestType==="Surrender Policy"){
   item.surrenderRequest.settlementStatus=settlementStatus;
   if(settlementStatus==="Paid"){
     item.surrenderRequest.settledAt=new Date();
     const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber});
     if(purchase){purchase.policyStatus="Surrendered";purchase.nextPremiumDate=null;await purchase.save();}
     await Policy.findOneAndUpdate({customerId:item.customerId,policyNumber:item.policyNumber},{$set:{status:"inactive"}});
     await Premium.updateMany({policyNumber,status:{$ne:"Paid"}},{$set:{status:"Cancelled"}});
   }
 }else{item.financialRequest.settlementStatus=settlementStatus;if(settlementStatus==="Paid")item.financialRequest.settledAt=new Date();}
 await item.save();
 await writeAudit(req,{action:"POLICY_FINANCIAL_SETTLEMENT",module:"Policy Services",description:`${item.requestType} ${settlementStatus} for ${item.policyNumber}`,targetUserId:item.customerId});res.json(item);
}catch(e){res.status(500).json({message:"Settlement update failed"})}});
module.exports=router;