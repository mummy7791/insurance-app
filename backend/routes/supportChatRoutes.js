const express=require("express");
const crypto=require("crypto");
const router=express.Router();
const auth=require("../middleware/auth");
const SupportChatMessage=require("../models/SupportChatMessage");

const phoneId=()=>process.env.WHATSAPP_PHONE_NUMBER_ID;
const token=()=>process.env.WHATSAPP_ACCESS_TOKEN;
const supportWa=()=>String(process.env.WHATSAPP_SUPPORT_NUMBER||"").replace(/\D/g,"");

async function sendWhatsApp(text){
  if(!phoneId()||!token()||!supportWa()) return {configured:false};
  const response=await fetch(`https://graph.facebook.com/v21.0/${phoneId()}/messages`,{
    method:"POST",headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json"},
    body:JSON.stringify({messaging_product:"whatsapp",to:supportWa(),type:"text",text:{body:text}})
  });
  const data=await response.json();
  if(!response.ok) throw new Error(data?.error?.message||"WhatsApp send failed");
  return {configured:true,id:data?.messages?.[0]?.id||""};
}

router.get("/messages",auth(["customer"]),async(req,res)=>{
  const messages=await SupportChatMessage.find({customerId:req.user.id}).sort({createdAt:1}).limit(200);
  res.json(messages);
});

router.post("/messages",auth(["customer"]),async(req,res)=>{
  try{
    const text=String(req.body?.text||"").trim();
    if(!text)return res.status(400).json({message:"Message is required"});
    const message=await SupportChatMessage.create({customerId:req.user.id,direction:"customer",text,source:"web"});
    const wa=await sendWhatsApp(`SecureLife Web Chat\nCustomer ID: ${req.user.id}\nMessage: ${text}\n\nReply format: #${req.user.id} your reply`);
    res.json({message,whatsappConfigured:wa.configured});
  }catch(error){console.error("Support chat send error:",error);res.status(500).json({message:"Message could not be sent"});}
});

router.get("/whatsapp/webhook",(req,res)=>{
  const mode=req.query["hub.mode"],verifyToken=req.query["hub.verify_token"],challenge=req.query["hub.challenge"];
  if(mode==="subscribe"&&verifyToken===process.env.WHATSAPP_VERIFY_TOKEN)return res.status(200).send(challenge);
  return res.sendStatus(403);
});

router.post("/whatsapp/webhook",async(req,res)=>{
  try{
    const appSecret=process.env.WHATSAPP_APP_SECRET;
    if(appSecret){
      const signature=req.get("x-hub-signature-256")||"";
      const expected="sha256="+crypto.createHmac("sha256",appSecret).update(JSON.stringify(req.body)).digest("hex");
      if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return res.sendStatus(401);
    }
    const changes=req.body?.entry?.flatMap(e=>e.changes||[])||[];
    for(const change of changes){
      for(const msg of change?.value?.messages||[]){
        const text=msg?.text?.body||"";
        const match=text.match(/^#([a-f\d]{24})\s+([\s\S]+)/i);
        if(match&&msg.from===supportWa()){
          const saved=await SupportChatMessage.create({customerId:match[1],direction:"support",text:match[2].trim(),source:"whatsapp",whatsappMessageId:msg.id});
          req.app.get("io")?.to(`user:${match[1]}`).emit("supportChatMessage",saved);
        }
      }
    }
    res.sendStatus(200);
  }catch(error){console.error("WhatsApp webhook error:",error);res.sendStatus(200);}
});

module.exports=router;
