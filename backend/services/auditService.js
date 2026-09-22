const AuditLog=require("../models/AuditLog");
const writeAudit=async(req,{action,module,description,targetUserId=null})=>{
 try{
  await AuditLog.create({
   userId:req.user?.id||null,userName:req.user?.name||"User",userEmail:req.user?.email||"",
   role:req.user?.role||"unknown",action:String(action||"ACTION").slice(0,80),
   module:String(module||"System").slice(0,80),description:String(description||"").slice(0,1000),
   ipAddress:String(req.ip||req.socket?.remoteAddress||"").slice(0,120),targetUserId:targetUserId||null
  });
 }catch(error){console.error("Audit write failed:",error.message);}
};
module.exports={writeAudit};