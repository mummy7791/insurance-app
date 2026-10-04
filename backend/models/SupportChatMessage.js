const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",index:true,required:true},
  direction:{type:String,enum:["customer","support"],required:true},
  text:{type:String,trim:true,maxlength:2000,required:true},
  source:{type:String,enum:["web","whatsapp","system"],default:"web"},
  whatsappMessageId:{type:String,default:"",index:true},
  status:{type:String,enum:["sent","delivered","read","failed"],default:"sent"}
},{timestamps:true});

module.exports=mongoose.model("SupportChatMessage",chatMessageSchema);
