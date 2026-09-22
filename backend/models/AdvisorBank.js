const mongoose = require("mongoose");

const advisorBankSchema = new mongoose.Schema({
  advisorId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,unique:true,index:true},
  advisorName:{type:String,default:""}, advisorCode:{type:String,default:""},
  accountHolderName:{type:String,required:true,trim:true}, bankName:{type:String,required:true,trim:true},
  accountNumber:{type:String,required:true,trim:true}, ifscCode:{type:String,required:true,trim:true,uppercase:true},
  branchName:{type:String,default:"",trim:true},
  documentType:{type:String,enum:["Bank Passbook","Cancelled Cheque","Bank Statement"],required:true},
  fileName:{type:String,required:true}, storageKey:{type:String,required:true},
  status:{type:String,enum:["Submitted","Approved","Rejected"],default:"Submitted",index:true},
  adminRemarks:{type:String,default:""}, submittedAt:{type:Date,default:Date.now},
  reviewedAt:{type:Date,default:null}, reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null}
},{timestamps:true});
module.exports=mongoose.models.AdvisorBank||mongoose.model("AdvisorBank",advisorBankSchema);
