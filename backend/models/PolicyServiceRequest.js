const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
 policyNumber:{type:String,required:true,trim:true,index:true},
 requestType:{type:String,enum:["Nominee Change","Address Change","Contact Update","Bank Update","Cover Enhancement","Policy Loan","Partial Withdrawal","Surrender Policy","Policy Revival","Other"],required:true},
 currentValue:{type:String,default:""}, requestedValue:{type:String,required:true,trim:true},
 coverEnhancement:{currentCover:{type:Number,default:0},requestedCover:{type:Number,default:0},currentPremium:{type:Number,default:0},estimatedPremium:{type:Number,default:0},effectiveDate:{type:Date,default:null}},
 financialRequest:{requestedAmount:{type:Number,default:0},eligibleAmount:{type:Number,default:0},approvedAmount:{type:Number,default:0},paidPremiumAmount:{type:Number,default:0},eligibleFromPolicyYear:{type:Number,default:0},settlementStatus:{type:String,enum:["Not Applicable","Pending","Approved","Paid","Rejected"],default:"Not Applicable"},settledAt:{type:Date,default:null}},
 surrenderRequest:{paidPremiumAmount:{type:Number,default:0},policyYear:{type:Number,default:0},estimatedValue:{type:Number,default:0},approvedValue:{type:Number,default:0},eligibleFromPolicyYear:{type:Number,default:0},settlementStatus:{type:String,enum:["Not Applicable","Pending","Approved","Paid","Rejected"],default:"Not Applicable"},settledAt:{type:Date,default:null}},
 revivalRequest:{outstandingPremium:{type:Number,default:0},lateFee:{type:Number,default:0},totalRevivalAmount:{type:Number,default:0},lapsedSince:{type:Date,default:null},lapseDays:{type:Number,default:0},medicalReviewRequired:{type:Boolean,default:false},kycReviewRequired:{type:Boolean,default:false},paymentStatus:{type:String,enum:["Not Applicable","Pending","Paid","Rejected"],default:"Not Applicable"},paidAt:{type:Date,default:null}},
 customerRemarks:{type:String,default:""}, status:{type:String,enum:["Submitted","Under Review","Approved","Rejected"],default:"Submitted",index:true},
 adminRemarks:{type:String,default:""}, reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null}, reviewedAt:{type:Date,default:null}
},{timestamps:true});
module.exports=mongoose.models.PolicyServiceRequest||mongoose.model("PolicyServiceRequest",schema);