const PDFDocument=require("pdfkit");
const QRCode=require("qrcode");
const crypto=require("crypto");
const router=require("express").Router();
const PolicyServiceRequest=require("../models/PolicyServiceRequest");
const PlanPurchase=require("../models/PlanPurchase");
const Policy=require("../models/Policy");
const InsurancePlan=require("../models/InsurancePlan");
const Premium=require("../models/Premium");
const User=require("../models/User");
const auth=require("../middleware/auth");
const {writeAudit}=require("../services/auditService");
const STAFF=["admin","bm","unit_manager","agency_manager","agent"];
const clean=(v,n=500)=>String(v||"").trim().slice(0,n);
router.get("/",auth([...STAFF,"customer"]),async(req,res)=>{try{const q=req.user.role==="customer"?{customerId:req.user.id}:{};res.json(await PolicyServiceRequest.find(q).sort({createdAt:-1}))}catch(e){res.status(500).json({message:"Service requests load failed"})}});
router.post("/",auth(["customer"]),async(req,res)=>{try{
 const policyNumber=clean(req.body.policyNumber,80),requestType=clean(req.body.requestType,40),requestedValue=clean(req.body.requestedValue,1000);
 if(!policyNumber||!requestedValue||!["Nominee Change","Address Change","Contact Update","Bank Update","Cover Enhancement","Policy Loan","Partial Withdrawal","Surrender Policy","Policy Revival","Free-Look Cancellation","Other"].includes(requestType))return res.status(400).json({message:"Complete valid service request details"});
 const [purchase,policy]=await Promise.all([PlanPurchase.findOne({customerId:req.user.id,policyNumber}),Policy.findOne({customerId:req.user.id,policyNumber})]);
 if(!purchase&&!policy)return res.status(403).json({message:"Policy does not belong to this customer"});
 let coverEnhancement=undefined,financialRequest=undefined,surrenderRequest=undefined,revivalRequest=undefined,nomineeChange=undefined,cancellationRequest=undefined,profileChange=undefined;
 if(["Address Change","Contact Update","Bank Update"].includes(requestType)){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"Profile changes are available only for active purchased policies"});
   const customer=await User.findById(req.user.id).select("address phone email").lean();
   if(requestType==="Address Change"){const fullAddress=clean(req.body.address?.fullAddress,500),pinCode=clean(req.body.address?.pinCode,10);if(!fullAddress||!/^[1-9][0-9]{5}$/.test(pinCode))return res.status(400).json({message:"Enter complete address and valid 6 digit PIN code"});profileChange={address:{fullAddress,pinCode}};}
   if(requestType==="Contact Update"){const phone=clean(req.body.contact?.phone,20),email=clean(req.body.contact?.email,160).toLowerCase();if(!/^[6-9][0-9]{9}$/.test(phone)||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({message:"Enter valid mobile number and email"});profileChange={contact:{phone,email}};}
   if(requestType==="Bank Update"){const accountHolder=clean(req.body.bank?.accountHolder,120),bankName=clean(req.body.bank?.bankName,120),accountNumber=clean(req.body.bank?.accountNumber,30).replace(/\s/g,""),ifsc=clean(req.body.bank?.ifsc,20).toUpperCase();if(!accountHolder||!bankName||!/^[0-9]{6,20}$/.test(accountNumber)||!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))return res.status(400).json({message:"Enter valid bank account and IFSC details"});profileChange={bank:{accountHolder,bankName,accountNumber,accountLast4:accountNumber.slice(-4),ifsc}};}
   if(requestType==="Address Change")req.body.currentValue=`${customer?.address||purchase.proposal?.address||"Not available"}`;
   if(requestType==="Contact Update")req.body.currentValue=`${customer?.phone||purchase.proposal?.customerPhone||"—"} / ${customer?.email||purchase.proposal?.customerEmail||"—"}`;
   if(requestType==="Bank Update")req.body.currentValue=purchase.serviceProfile?.bank?.accountLast4?`Bank account ending ${purchase.serviceProfile.bank.accountLast4}`:"No bank account on servicing profile";
 }
 if(requestType==="Nominee Change"){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"Nominee changes are available only for active purchased policies"});
   const nominees=Array.isArray(req.body.nominees)?req.body.nominees.slice(0,5).map(n=>({name:clean(n.name,100),relation:clean(n.relation,60),dateOfBirth:clean(n.dateOfBirth,20),sharePercent:Number(n.sharePercent||0),appointeeName:clean(n.appointeeName,100),appointeeRelation:clean(n.appointeeRelation,60)})):[];
   if(!nominees.length||nominees.some(n=>!n.name||!n.relation||!n.dateOfBirth||!Number.isFinite(n.sharePercent)||n.sharePercent<=0))return res.status(400).json({message:"Complete all nominee details"});
   const total=nominees.reduce((n,x)=>n+x.sharePercent,0);if(Math.abs(total-100)>0.01)return res.status(400).json({message:"Nominee shares must total exactly 100%"});
   const today=new Date();for(const n of nominees){const dob=new Date(n.dateOfBirth);if(Number.isNaN(dob.getTime())||dob>today)return res.status(400).json({message:"Enter valid nominee dates of birth"});let age=today.getFullYear()-dob.getFullYear();if(today<new Date(today.getFullYear(),dob.getMonth(),dob.getDate()))age--;if(age<18&&(!n.appointeeName||!n.appointeeRelation))return res.status(400).json({message:`Appointee details are required for minor nominee ${n.name}`});}
   nomineeChange={nominees,documentVerified:false};
 }
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
 if(requestType==="Policy Revival"){
   if(!purchase||purchase.policyStatus==="Active"||purchase.policyStatus==="Surrendered"||purchase.policyStatus==="Cancelled")return res.status(400).json({message:"Only inactive/lapsed policies can be revived"});
   const plan=await InsurancePlan.findById(purchase.planId).lean(),rules=plan?.revivalRules||{};
   if(!rules.enabled)return res.status(400).json({message:"Revival is not enabled for this plan"});
   const unpaid=await Premium.find({policyNumber,status:{$in:["Due","Grace Period","Overdue","Lapsed"]}}).sort({dueDate:1}).lean();
   if(!unpaid.length)return res.status(400).json({message:"No outstanding premium found for revival"});
   const outstandingPremium=unpaid.reduce((n,x)=>n+Number(x.amount||0),0);
   const lapsedSince=new Date(unpaid[0].dueDate),now=new Date(),lapseDays=Math.max(0,Math.floor((now-lapsedSince)/86400000));
   const maxLapseDays=Math.max(1,Number(rules.maxLapseDays||730));if(lapseDays>maxLapseDays)return res.status(400).json({message:"Policy is outside the configured revival period"});
   const lateFee=Math.round(outstandingPremium*Math.max(0,Number(rules.lateFeePercent||0))/100);
   revivalRequest={outstandingPremium,lateFee,totalRevivalAmount:outstandingPremium+lateFee,lapsedSince,lapseDays,medicalReviewRequired:Boolean(rules.medicalReviewRequired),kycReviewRequired:Boolean(rules.kycReviewRequired),paymentStatus:"Pending"};
 }
 if(requestType==="Free-Look Cancellation"){
   if(!purchase||purchase.policyStatus!=="Active")return res.status(400).json({message:"Only active purchased policies can be cancelled during free-look"});
   const plan=await InsurancePlan.findById(purchase.planId).lean(),rules=plan?.freeLookRules||{};
   if(!rules.enabled||Number(rules.days||0)<=0)return res.status(400).json({message:"Free-look cancellation is not enabled for this plan"});
   const policyStartDate=new Date(purchase.startDate||purchase.createdAt),freeLookDays=Math.max(1,Number(rules.days)),freeLookLastDate=new Date(policyStartDate);freeLookLastDate.setDate(freeLookLastDate.getDate()+freeLookDays);
   if(new Date()>freeLookLastDate)return res.status(400).json({message:`Free-look period ended on ${freeLookLastDate.toLocaleDateString("en-IN")}`});
   const paid=await Premium.find({policyNumber,status:"Paid"}).select("amount").lean(),paidPremiumAmount=paid.reduce((n,x)=>n+Number(x.amount||0),0);
   cancellationRequest={policyStartDate,freeLookLastDate,freeLookDays,paidPremiumAmount,approvedRefundAmount:0,refundStatus:"Pending"};
 }
 const open=await PolicyServiceRequest.findOne({customerId:req.user.id,policyNumber,requestType,status:{$in:["Submitted","Under Review"]}});
 if(open)return res.status(409).json({message:"An open request of this type already exists for this policy"});
 const item=await PolicyServiceRequest.create({customerId:req.user.id,policyNumber,requestType,currentValue:clean(req.body.currentValue,1000),requestedValue,customerRemarks:clean(req.body.customerRemarks),coverEnhancement,financialRequest,surrenderRequest,revivalRequest,nomineeChange,cancellationRequest,profileChange,status:"Submitted"});
 await writeAudit(req,{action:"SERVICE_REQUEST_SUBMITTED",module:"Policy Services",description:`${requestType} request submitted for ${policyNumber}`});
 res.status(201).json(item);
}catch(e){console.error(e);res.status(500).json({message:"Service request submission failed"})}});
router.patch("/:id/review",auth(STAFF),async(req,res)=>{try{const item=await PolicyServiceRequest.findById(req.params.id);if(!item)return res.status(404).json({message:"Request not found"});const status=clean(req.body.status,20),remarks=clean(req.body.adminRemarks);if(!["Under Review","Approved","Rejected"].includes(status))return res.status(400).json({message:"Invalid review status"});if(status==="Rejected"&&!remarks)return res.status(400).json({message:"Rejection reason is required"});if(["Approved","Rejected"].includes(item.status))return res.status(409).json({message:"This service request is already closed"}); if(status==="Approved"&&["Address Change","Contact Update","Bank Update"].includes(item.requestType)){
   if(!req.body.documentVerified)return res.status(400).json({message:"Supporting documents must be verified before approval"});
   const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber}).select("+serviceProfile.bank.accountNumber");if(!purchase||purchase.policyStatus!=="Active")return res.status(409).json({message:"Active purchased policy not found"});
   const customer=await User.findById(item.customerId);const p=item.profileChange||{};
   if(item.requestType==="Address Change"){const previous={address:customer?.address||purchase.proposal.address,pinCode:purchase.serviceProfile?.pinCode||""};purchase.serviceHistory.push({requestType:item.requestType,previousValue:previous,serviceRequestId:item._id});purchase.proposal.address=p.address.fullAddress;purchase.serviceProfile.pinCode=p.address.pinCode;if(customer)customer.address=p.address.fullAddress;item.requestedValue=`${p.address.fullAddress}, PIN ${p.address.pinCode}`;}
   if(item.requestType==="Contact Update"){const previous={phone:customer?.phone||purchase.proposal.customerPhone,email:customer?.email||purchase.proposal.customerEmail};purchase.serviceHistory.push({requestType:item.requestType,previousValue:previous,serviceRequestId:item._id});purchase.proposal.customerPhone=p.contact.phone;purchase.proposal.customerEmail=p.contact.email;if(customer){customer.phone=p.contact.phone;customer.email=p.contact.email;}item.requestedValue=`${p.contact.phone} / ${p.contact.email}`;}
   if(item.requestType==="Bank Update"){const previous={accountHolder:purchase.serviceProfile?.bank?.accountHolder||"",bankName:purchase.serviceProfile?.bank?.bankName||"",accountLast4:purchase.serviceProfile?.bank?.accountLast4||"",ifsc:purchase.serviceProfile?.bank?.ifsc||""};purchase.serviceHistory.push({requestType:item.requestType,previousValue:previous,serviceRequestId:item._id});purchase.serviceProfile.bank=p.bank;item.requestedValue=`${p.bank.bankName} / A/c ending ${p.bank.accountLast4} / ${p.bank.ifsc}`;}
   await purchase.save();if(customer)await customer.save();item.profileChange.documentVerified=true;item.profileChange.effectiveDate=new Date();
 }
 if(status==="Approved"&&item.requestType==="Nominee Change"){
   if(!req.body.documentVerified)return res.status(400).json({message:"Nominee documents must be verified before approval"});
   const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber});if(!purchase||purchase.policyStatus!=="Active")return res.status(409).json({message:"Active purchased policy not found"});
   const nextNominees=item.nomineeChange?.nominees||[];if(!nextNominees.length)return res.status(409).json({message:"Nominee request details are missing"});
   const oldNominees=purchase.nominees?.length?purchase.nominees.map(n=>n.toObject?.()||n):(purchase.proposal?.nomineeName?[{name:purchase.proposal.nomineeName,relation:purchase.proposal.nomineeRelation,dateOfBirth:purchase.proposal.nomineeDateOfBirth,sharePercent:100}]:[]);
   purchase.nomineeHistory.push({nominees:oldNominees,changedAt:new Date(),serviceRequestId:item._id});purchase.nominees=nextNominees;
   purchase.proposal.nomineeName=nextNominees[0].name;purchase.proposal.nomineeRelation=nextNominees[0].relation;purchase.proposal.nomineeDateOfBirth=nextNominees[0].dateOfBirth;await purchase.save();
   item.nomineeChange.documentVerified=true;item.nomineeChange.effectiveDate=new Date();item.currentValue=oldNominees.map(n=>`${n.name} ${n.sharePercent||100}%`).join(", ");item.requestedValue=nextNominees.map(n=>`${n.name} ${n.sharePercent}%`).join(", ");
 }
if(status==="Approved"&&item.requestType==="Cover Enhancement"){
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
 if(status==="Rejected"&&item.requestType==="Policy Revival")item.revivalRequest.paymentStatus="Rejected";
 if(status==="Approved"&&item.requestType==="Free-Look Cancellation"){
   const approvedRefundAmount=Number(req.body.approvedAmount??item.cancellationRequest?.paidPremiumAmount??0);
   if(!Number.isFinite(approvedRefundAmount)||approvedRefundAmount<0||approvedRefundAmount>Number(item.cancellationRequest?.paidPremiumAmount||0))return res.status(400).json({message:"Refund amount must be between zero and paid premium amount"});
   item.cancellationRequest.approvedRefundAmount=approvedRefundAmount;item.cancellationRequest.refundStatus="Approved";
 }
 if(status==="Rejected"&&item.requestType==="Free-Look Cancellation")item.cancellationRequest.refundStatus="Rejected";

 if(status==="Approved"&&!item.endorsementNumber){item.endorsementNumber=`END-${new Date().getFullYear()}-${String(item._id).slice(-8).toUpperCase()}`;item.endorsementIssuedAt=new Date();item.verificationToken=crypto.randomBytes(18).toString("hex");}
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
router.patch("/:id/refund",auth(STAFF),async(req,res)=>{try{
 const item=await PolicyServiceRequest.findById(req.params.id);if(!item)return res.status(404).json({message:"Request not found"});
 if(item.requestType!=="Free-Look Cancellation"||item.status!=="Approved"||item.cancellationRequest?.refundStatus!=="Approved")return res.status(409).json({message:"Approved free-look cancellation is required before refund"});
 const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber});if(!purchase)return res.status(404).json({message:"Policy purchase not found"});
 purchase.policyStatus="Cancelled";purchase.nextPremiumDate=null;await purchase.save();
 await Policy.findOneAndUpdate({customerId:item.customerId,policyNumber:item.policyNumber},{$set:{status:"closed"}});
 item.cancellationRequest.refundStatus="Refunded";item.cancellationRequest.refundedAt=new Date();await item.save();
 await writeAudit(req,{action:"FREE_LOOK_REFUNDED",module:"Policy Services",description:`Free-look cancellation refunded for ${item.policyNumber}`,targetUserId:item.customerId});res.json(item);
}catch(e){console.error(e);res.status(500).json({message:"Refund update failed"})}});
router.patch("/:id/revival-payment",auth(STAFF),async(req,res)=>{try{
 const item=await PolicyServiceRequest.findById(req.params.id);if(!item)return res.status(404).json({message:"Request not found"});
 if(item.requestType!=="Policy Revival"||item.status!=="Approved")return res.status(409).json({message:"Revival request must be approved before payment"});
 if(item.revivalRequest?.paymentStatus==="Paid")return res.status(409).json({message:"Revival payment is already completed"});
 const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber});if(!purchase||["Surrendered","Cancelled"].includes(purchase.policyStatus))return res.status(409).json({message:"Policy cannot be revived"});
 const unpaid=await Premium.find({policyNumber:item.policyNumber,status:{$in:["Due","Grace Period","Overdue","Lapsed"]}}).sort({dueDate:1});
 const paidAt=new Date(),paidDate=paidAt.toISOString().slice(0,10);for(const p of unpaid){p.status="Paid";p.paidDate=paidDate;p.paymentMode="Net Banking";p.lifecycleUpdatedAt=paidAt;await p.save();}
 purchase.policyStatus="Active";const next=new Date(paidAt);next.setFullYear(next.getFullYear()+1);purchase.nextPremiumDate=next;await purchase.save();
 await Policy.findOneAndUpdate({customerId:item.customerId,policyNumber:item.policyNumber},{$set:{status:"active"}});
 item.revivalRequest.paymentStatus="Paid";item.revivalRequest.paidAt=paidAt;await item.save();
 await writeAudit(req,{action:"POLICY_REVIVED",module:"Policy Services",description:`Policy ${item.policyNumber} revived after approved payment`,targetUserId:item.customerId});res.json(item);
}catch(e){console.error(e);res.status(500).json({message:"Revival payment update failed"})}});

router.get("/:id/endorsement",auth([...STAFF,"customer"]),async(req,res)=>{try{
 const item=await PolicyServiceRequest.findById(req.params.id).lean();if(!item)return res.status(404).json({message:"Request not found"});
 if(req.user.role==="customer"&&String(item.customerId)!==String(req.user.id))return res.status(403).json({message:"Not authorized"});
 if(item.status!=="Approved"||!item.endorsementNumber)return res.status(409).json({message:"Endorsement certificate is available only for approved requests"});
 const purchase=await PlanPurchase.findOne({customerId:item.customerId,policyNumber:item.policyNumber}).lean();
 const verifyUrl=`${req.protocol}://${req.get("host")}/api/policy-services/verify/${item.verificationToken}`;
 const qr=await QRCode.toDataURL(verifyUrl,{margin:1,width:180});
 const doc=new PDFDocument({size:"A4",margin:48});res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",`attachment; filename="${item.endorsementNumber}.pdf"`);doc.pipe(res);
 doc.fontSize(20).text("SecureLife Insurance",{align:"center"});doc.fontSize(15).text("POLICY ENDORSEMENT CERTIFICATE",{align:"center"});doc.moveDown();doc.fontSize(9).fillColor("#555").text("This certificate records an approved servicing change to the referenced policy. It does not replace the original policy contract.",{align:"center"});doc.fillColor("#000").moveDown();
 const row=(a,b)=>{doc.font("Helvetica-Bold").text(a,{continued:true,width:170});doc.font("Helvetica").text(b||"—");};
 row("Endorsement No.:",item.endorsementNumber);row("Policy Number:",item.policyNumber);row("Customer Name:",purchase?.proposal?.customerName||"—");row("Plan Name:",purchase?.planName||"—");row("Service Request:",item.requestType);row("Approval Date:",item.reviewedAt?new Date(item.reviewedAt).toLocaleDateString("en-IN"):"—");row("Effective Date:",item.nomineeChange?.effectiveDate?new Date(item.nomineeChange.effectiveDate).toLocaleDateString("en-IN"):item.coverEnhancement?.effectiveDate?new Date(item.coverEnhancement.effectiveDate).toLocaleDateString("en-IN"):item.reviewedAt?new Date(item.reviewedAt).toLocaleDateString("en-IN"):"—");
 doc.moveDown().font("Helvetica-Bold").fontSize(12).text("Approved Change");doc.font("Helvetica").fontSize(10);
 if(item.requestType==="Nominee Change"&&item.nomineeChange?.nominees?.length){item.nomineeChange.nominees.forEach((n,i)=>doc.text(`${i+1}. ${n.name} | ${n.relation} | Share ${n.sharePercent}% | DOB ${n.dateOfBirth}${n.appointeeName?` | Appointee: ${n.appointeeName} (${n.appointeeRelation})`:""}`));}
 else if(item.requestType==="Cover Enhancement"&&item.coverEnhancement){doc.text(`Cover: INR ${item.coverEnhancement.currentCover} -> INR ${item.coverEnhancement.requestedCover}`);doc.text(`Premium: INR ${item.coverEnhancement.currentPremium} -> INR ${item.coverEnhancement.estimatedPremium}`);}
 else{doc.text(`Previous details: ${item.currentValue||"—"}`);doc.text(`Approved details: ${item.requestedValue||"—"}`);}
 doc.moveDown();if(item.adminRemarks)row("Admin Remarks:",item.adminRemarks);doc.image(qr,{fit:[95,95],align:"center"});doc.fontSize(8).fillColor("#555").text(`Verification token: ${item.verificationToken}`,{align:"center"});doc.text("Scan the QR code to verify this endorsement against the application record.",{align:"center"});doc.end();
}catch(e){console.error(e);if(!res.headersSent)res.status(500).json({message:"Endorsement PDF generation failed"})}});
router.get("/verify/:token",async(req,res)=>{try{const item=await PolicyServiceRequest.findOne({verificationToken:req.params.token,status:"Approved"}).select("endorsementNumber policyNumber requestType reviewedAt endorsementIssuedAt").lean();if(!item)return res.status(404).json({valid:false,message:"Endorsement not found"});res.json({valid:true,endorsementNumber:item.endorsementNumber,policyNumber:item.policyNumber,requestType:item.requestType,approvedAt:item.reviewedAt,issuedAt:item.endorsementIssuedAt})}catch(e){res.status(500).json({valid:false,message:"Verification failed"})}});
module.exports=router;