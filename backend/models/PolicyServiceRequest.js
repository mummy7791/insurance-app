const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
 policyNumber:{type:String,required:true,trim:true,index:true},
 requestType:{type:String,enum:["Nominee Change","Address Change","Contact Update","Bank Update","Cover Enhancement","Other"],required:true},
 currentValue:{type:String,default:""}, requestedValue:{type:String,required:true,trim:true},
 coverEnhancement:{currentCover:{type:Number,default:0},requestedCover:{type:Number,default:0},currentPremium:{type:Number,default:0},estimatedPremium:{type:Number,default:0},effectiveDate:{type:Date,default:null}},
 customerRemarks:{type:String,default:""}, status:{type:String,enum:["Submitted","Under Review","Approved","Rejected"],default:"Submitted",index:true},
 adminRemarks:{type:String,default:""}, reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null}, reviewedAt:{type:Date,default:null}
},{timestamps:true});
module.exports=mongoose.models.PolicyServiceRequest||mongoose.model("PolicyServiceRequest",schema);