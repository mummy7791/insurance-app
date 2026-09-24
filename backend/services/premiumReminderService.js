const Premium = require("../models/Premium");
const Policy = require("../models/Policy");
const Notification = require("../models/Notification");

const DAY = 86400000;
const stageFor = (premium, today = new Date()) => {
  if (premium.status === "Paid") return "";
  const due = new Date(String(premium.dueDate || "") + "T00:00:00");
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date(today); now.setHours(0,0,0,0);
  const days = Math.round((due - now) / DAY);
  if (days === 30) return "D30";
  if (days === 15) return "D15";
  if (days === 7) return "D7";
  if (days === 0) return "DUE";
  if (days < 0 && days >= -30) return "GRACE";
  return "";
};

const copyFor = (stage, premium) => {
  const amount = Number(premium.amount || 0).toLocaleString("en-IN");
  const due = premium.dueDate;
  const policy = premium.policyNumber;
  const map = {
    D30:["Upcoming premium reminder",`Your premium of INR ${amount} for policy ${policy} is due on ${due}.`],
    D15:["Premium reminder",`Premium of INR ${amount} for policy ${policy} is due on ${due}.`],
    D7:["Payment due soon",`Your policy ${policy} premium of INR ${amount} is due in 7 days on ${due}.`],
    DUE:["Premium due today",`Premium of INR ${amount} for policy ${policy} is due today.`],
    GRACE:["Premium payment pending",`Premium payment for policy ${policy} is pending. Please review the policy terms and complete payment or contact policy servicing.`],
  };
  return map[stage];
};

async function runPremiumReminders(io) {
  const result={checked:0,sent:0,skipped:0,failed:0};
  const premiums=await Premium.find({status:{$ne:"Paid"}});
  result.checked=premiums.length;
  for(const premium of premiums){
    try{
      const stage=stageFor(premium);
      if(!stage || premium.reminderStage===stage){result.skipped++;continue;}
      const policy=await Policy.findOne({policyNumber:premium.policyNumber}).select("customerId");
      if(!policy?.customerId){result.failed++;continue;}
      const copy=copyFor(stage,premium); if(!copy){result.skipped++;continue;}
      const reference=`premium:${premium._id}:${stage}`;
      const exists=await Notification.findOne({recipientId:policy.customerId,reference}).select("_id");
      if(exists){premium.reminderStage=stage;await premium.save();result.skipped++;continue;}
      const notification=await Notification.create({recipientId:policy.customerId,title:copy[0],message:copy[1],type:"Premium Due",date:new Date().toISOString().slice(0,10),reference,actionLabel:"View premium",actionUrl:"/premiums"});
      premium.reminderStage=stage;premium.lifecycleUpdatedAt=new Date();await premium.save();
      if(io)io.to(`user:${String(policy.customerId)}`).emit("newNotification",notification);
      result.sent++;
    }catch(error){result.failed++;console.error("Premium reminder item failed:",premium?._id,error.message);}
  }
  return result;
}
module.exports={runPremiumReminders,stageFor};
