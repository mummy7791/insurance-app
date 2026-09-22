const express=require("express");
const multer=require("multer");
const path=require("path");
const router=express.Router();
const auth=require("../middleware/auth");
const AdvisorBank=require("../models/AdvisorBank");
const User=require("../models/User");
const {uploadPrivateDocument,signedDownloadUrl,deletePrivateDocument}=require("../services/privateDocumentStorage");
const {writeAudit}=require("../services/auditService");

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>["application/pdf","image/jpeg","image/png"].includes(file.mimetype)?cb(null,true):cb(new Error("Only PDF, JPG and PNG files are allowed"))});
const text=(v,n)=>String(v||"").trim().slice(0,n);
const validFile=(f)=>{const b=f?.buffer;if(!b)return false;if(f.mimetype==="application/pdf")return b.subarray(0,5).toString("ascii")==="%PDF-";if(f.mimetype==="image/jpeg")return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;if(f.mimetype==="image/png")return b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));return false;};

router.get("/me",auth(["advisor"]),async(req,res)=>{try{res.json(await AdvisorBank.findOne({advisorId:req.user.id}).select("-storageKey"))}catch(e){console.error(e);res.status(500).json({message:"Bank details load failed"})}});

router.post("/me",auth(["advisor"]),(req,res,next)=>upload.single("document")(req,res,e=>e?res.status(400).json({message:e.code==="LIMIT_FILE_SIZE"?"File must be 5 MB or less":e.message}):next()),async(req,res)=>{
 try{
  if(!req.file||!validFile(req.file))return res.status(400).json({message:"Valid bank proof PDF/JPG/PNG is required"});
  const existing=await AdvisorBank.findOne({advisorId:req.user.id});
  if(existing&&existing.status!=="Rejected")return res.status(409).json({message:"Bank details already submitted. Re-entry is allowed only after rejection."});
  const accountHolderName=text(req.body.accountHolderName,120),bankName=text(req.body.bankName,120),accountNumber=text(req.body.accountNumber,40).replace(/\s/g,""),ifscCode=text(req.body.ifscCode,11).toUpperCase(),branchName=text(req.body.branchName,120),documentType=text(req.body.documentType,40);
  if(!accountHolderName||!bankName||!accountNumber||!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)||!["Bank Passbook","Cancelled Cheque","Bank Statement"].includes(documentType))return res.status(400).json({message:"Complete valid bank details are required"});
  const advisor=await User.findById(req.user.id).select("name advisorCode");
  const stored=await uploadPrivateDocument({buffer:req.file.buffer,mimeType:req.file.mimetype,customerId:req.user.id,documentType:"advisor-bank-"+documentType});
  if(existing?.storageKey)try{await deletePrivateDocument(existing.storageKey)}catch(e){console.error("Old advisor bank proof cleanup failed",e.message)}
  const payload={advisorId:req.user.id,advisorName:advisor?.name||"",advisorCode:advisor?.advisorCode||"",accountHolderName,bankName,accountNumber,ifscCode,branchName,documentType,fileName:path.basename(req.file.originalname).slice(0,255)||"bank-proof",storageKey:stored.public_id,status:"Submitted",adminRemarks:"",submittedAt:new Date(),reviewedAt:null,reviewedBy:null};
  const saved=existing?await AdvisorBank.findByIdAndUpdate(existing._id,payload,{new:true,runValidators:true}):await AdvisorBank.create(payload);
  await writeAudit(req,{action:existing?"BANK_DETAILS_RESUBMITTED":"BANK_DETAILS_SUBMITTED",module:"Advisor Payout",description:"Advisor payout bank details submitted for verification"});
  res.status(201).json({...saved.toObject(),storageKey:undefined});
 }catch(e){console.error("Advisor bank submit failed",e);res.status(500).json({message:"Bank details submission failed"})}
});

router.get("/admin",auth(["admin"]),async(_req,res)=>{try{res.json(await AdvisorBank.find().select("-storageKey").sort({updatedAt:-1}))}catch(e){res.status(500).json({message:"Advisor bank submissions load failed"})}});
router.patch("/:id/review",auth(["admin"]),async(req,res)=>{try{const status=text(req.body.status,20),remarks=text(req.body.remarks,500);if(!["Approved","Rejected"].includes(status))return res.status(400).json({message:"Choose Approved or Rejected"});if(status==="Rejected"&&!remarks)return res.status(400).json({message:"Rejection reason is required"});const item=await AdvisorBank.findById(req.params.id);if(!item)return res.status(404).json({message:"Submission not found"});if(item.status!=="Submitted")return res.status(400).json({message:"Only submitted bank details can be reviewed"});item.status=status;item.adminRemarks=remarks||(status==="Approved"?"Bank details verified":"");item.reviewedAt=new Date();item.reviewedBy=req.user.id;await item.save();await writeAudit(req,{action:`BANK_${status.toUpperCase()}`,module:"Advisor Payout",description:`Advisor payout bank account ${status.toLowerCase()}`,targetUserId:item.advisorId});res.json({...item.toObject(),storageKey:undefined})}catch(e){res.status(500).json({message:"Bank review failed"})}});
router.get("/:id/pdf",auth(["admin"]),async(req,res)=>{try{
 const item=await AdvisorBank.findById(req.params.id);if(!item)return res.status(404).json({message:"Submission not found"});
 const escapePdf=(v)=>String(v||"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
 const lines=["SECURELIFE INSURANCE","ADVISOR PAYOUT ACCOUNT DETAILS","",`Advisor: ${item.advisorName}`,`Advisor Code: ${item.advisorCode||"-"}`,`Account Holder: ${item.accountHolderName}`,`Bank Name: ${item.bankName}`,`Account Number: ${item.accountNumber}`,`IFSC Code: ${item.ifscCode}`,`Branch: ${item.branchName||"-"}`,`Proof Type: ${item.documentType}`,`Verification Status: ${item.status}`,`Admin Remarks: ${item.adminRemarks||"-"}`,`Submitted: ${item.submittedAt?new Date(item.submittedAt).toLocaleString("en-IN"):"-"}`];
 let stream="BT\n/F1 18 Tf\n50 790 Td\n";lines.forEach((line,index)=>{if(index===0)stream+=`(${escapePdf(line)}) Tj\n0 -28 Td\n/F1 12 Tf\n`;else stream+=`(${escapePdf(line)}) Tj\n0 -24 Td\n`});stream+="ET";
 const objects=[null,"<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
 let pdf="%PDF-1.4\n",offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(pdf);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",`attachment; filename="advisor-bank-${item.advisorCode||item._id}.pdf"`);res.setHeader("Cache-Control","private, no-store");return res.send(Buffer.from(pdf));
}catch(e){console.error("Advisor bank PDF failed",e);res.status(500).json({message:"Bank details PDF generation failed"})}});

router.get("/:id/file",auth(["admin","advisor"]),async(req,res)=>{try{const item=await AdvisorBank.findById(req.params.id);if(!item)return res.status(404).json({message:"Submission not found"});if(req.user.role==="advisor"&&String(item.advisorId)!==String(req.user.id))return res.status(403).json({message:"Access denied"});const url=signedDownloadUrl(item.storageKey);const up=await fetch(url);if(!up.ok)return res.status(502).json({message:"Secure bank proof unavailable"});const body=Buffer.from(await up.arrayBuffer());res.setHeader("Content-Type",up.headers.get("content-type")||"application/octet-stream");res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Content-Disposition",`inline; filename="${path.basename(item.fileName).replace(/["\\r\\n]/g,"")}"`);res.send(body)}catch(e){console.error(e);res.status(500).json({message:"Bank proof access failed"})}});
module.exports=router;
