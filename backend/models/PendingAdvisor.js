const mongoose = require("mongoose");
const pendingAdvisorSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true}, email:{type:String,required:true,lowercase:true,trim:true,index:true},
  phone:{type:String,required:true}, advisorCode:{type:String,required:true}, address:{type:String,default:""},
  password:{type:String,required:true}, status:{type:String,enum:["active","blocked"],default:"active"},
  otp:{type:String,required:true}, otpExpires:{type:Date,required:true}, otpAttempts:{type:Number,default:0},
  verifiedAt:{type:Date,default:null}, expiresAt:{type:Date,required:true,index:{expires:0}}
},{timestamps:true});
module.exports = mongoose.models.PendingAdvisor || mongoose.model("PendingAdvisor", pendingAdvisorSchema);