import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Plan = { _id:string; planName:string; category:string; yearlyAmount?:number; yearlyPremium?:number; coverageAmount?:number; paymentYears?:number; benefits?:string|string[]; coverage?:string; description?:string; };
type BuyForm = {
  customerName:string; customerEmail:string; customerPhone:string; address:string; dateOfBirth:string;
  aadhaarNumber:string; panNumber:string; accountHolderName:string; bankName:string; accountNumber:string; ifscCode:string;
  nomineeName:string; nomineeRelation:string; nomineeDateOfBirth:string; nomineePhone:string; nomineeEmail:string; nomineeAddress:string; nomineeAadhaar:string; nomineePan:string;
  proposalConsent:boolean;
};
type UploadKey="policyholderPhoto"|"aadhaarDocument"|"panDocument"|"addressProof"|"nomineePhoto"|"nomineeAadhaarDocument"|"nomineePanDocument";
type UploadState=Record<UploadKey,File|null>;
const initialForm:BuyForm={customerName:"",customerEmail:"",customerPhone:"",address:"",dateOfBirth:"",aadhaarNumber:"",panNumber:"",accountHolderName:"",bankName:"",accountNumber:"",ifscCode:"",nomineeName:"",nomineeRelation:"",nomineeDateOfBirth:"",nomineePhone:"",nomineeEmail:"",nomineeAddress:"",nomineeAadhaar:"",nomineePan:"",proposalConsent:false};
const initialUploads:UploadState={policyholderPhoto:null,aadhaarDocument:null,panDocument:null,addressProof:null,nomineePhoto:null,nomineeAadhaarDocument:null,nomineePanDocument:null};
const errorMessage=(error:unknown,fallback:string)=>typeof error==="object"&&error!==null&&"response" in error?(error as {response?:{data?:{message?:string}}}).response?.data?.message||fallback:fallback;
const digits=(v:string)=>v.replace(/\D/g,"");
const validPan=(v:string)=>/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
const validAadhaar=(v:string)=>/^\d{12}$/.test(digits(v));
const fileLabel=(f:File|null)=>f?f.name:"Choose file";

export default function OnlinePolicyPurchase(){
 const navigate=useNavigate(); const [searchParams]=useSearchParams(); const planId=searchParams.get("plan")||"";
 const [plan,setPlan]=useState<Plan|null>(null); const [form,setForm]=useState<BuyForm>(initialForm); const [uploads,setUploads]=useState<UploadState>(initialUploads); const [loading,setLoading]=useState(true); const [uploading,setUploading]=useState(false); const [restored,setRestored]=useState(false);
 const loadProposal=useCallback(async()=>{if(!planId){navigate("/insurance-plans",{replace:true});return;}try{setLoading(true);const [planRes,profileRes]=await Promise.all([api.get<Plan>(`/insurance-plans/${planId}`),api.get<{name?:string;email?:string;phone?:string;address?:string}>("/customer-profile")]);setPlan(planRes.data);let saved:Partial<BuyForm>={};try{const raw=sessionStorage.getItem(`proposal:${planId}`);if(raw){saved=JSON.parse(raw);delete saved.panNumber;delete saved.aadhaarNumber;delete saved.accountNumber;delete saved.nomineeAadhaar;delete saved.nomineePan;setRestored(true);}}catch{sessionStorage.removeItem(`proposal:${planId}`);}setForm(p=>({...p,...saved,customerName:saved.customerName||profileRes.data?.name||"",customerEmail:profileRes.data?.email||"",customerPhone:saved.customerPhone||profileRes.data?.phone||"",address:saved.address||profileRes.data?.address||""}));}catch(e){alert(errorMessage(e,"Unable to open this insurance plan"));navigate("/insurance-plans",{replace:true});}finally{setLoading(false);}},[navigate,planId]);
 useEffect(()=>{void loadProposal();},[loadProposal]);
 const update=(field:keyof BuyForm,value:string|boolean)=>setForm(p=>({...p,[field]:value}));
 const pick=(key:UploadKey,file:File|null)=>setUploads(p=>({...p,[key]:file}));
 const FileBox=({field,label,accept=".pdf,.jpg,.jpeg,.png"}:{field:UploadKey;label:string;accept?:string})=><label className="kyc-upload"><span>{label}</span><strong>{fileLabel(uploads[field])}</strong><input type="file" accept={accept} onChange={e=>pick(field,e.target.files?.[0]||null)}/><em>PDF/JPG/PNG • max 5 MB</em></label>;
 const continueToPayment=async()=>{
  const required=[form.customerName,form.customerEmail,form.customerPhone,form.address,form.dateOfBirth,form.aadhaarNumber,form.panNumber,form.accountHolderName,form.bankName,form.accountNumber,form.ifscCode,form.nomineeName,form.nomineeRelation,form.nomineeDateOfBirth,form.nomineePhone,form.nomineeEmail,form.nomineeAddress,form.nomineeAadhaar,form.nomineePan];
  if(required.some(v=>!String(v).trim())||!form.proposalConsent){alert("Please complete policyholder, Aadhaar/PAN KYC, bank, nominee and consent details");return;}
  if(!validAadhaar(form.aadhaarNumber)||!validAadhaar(form.nomineeAadhaar)||!validPan(form.panNumber)||!validPan(form.nomineePan)){alert("Enter valid 12-digit Aadhaar and PAN details");return;}
  if(digits(form.customerPhone).length<10||digits(form.nomineePhone).length<10){alert("Enter valid mobile numbers");return;}
  if(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())){alert("Enter a valid IFSC code");return;}
  if(Object.values(uploads).some(f=>!f)){alert("Please upload policyholder and nominee KYC documents");return;}
  if(Object.values(uploads).some(f=>f&&f.size>5*1024*1024)){alert("Each KYC file must be 5 MB or smaller");return;}
  const typeMap:Record<UploadKey,string>={policyholderPhoto:"Customer Photo",aadhaarDocument:"Aadhaar",panDocument:"PAN",addressProof:"Address Proof",nomineePhoto:"Nominee Photo",nomineeAadhaarDocument:"Nominee Aadhaar",nomineePanDocument:"Nominee PAN"};
  try{
   setUploading(true);
   let uploadRef="";
   for(const [key,selected] of Object.entries(uploads) as [UploadKey,File|null][]){
    if(!selected) continue;
    const body=new FormData();
    body.append("customerName",form.customerName);
    body.append("documentType",typeMap[key]);
    body.append("file",selected);
    const result=await api.post<{uploadRef:string}>(`/documents/proposal-kyc/${planId}`,body,{headers:{"Content-Type":"multipart/form-data"}});
    uploadRef=result.data.uploadRef;
   }
   if(!uploadRef) throw new Error("KYC upload reference was not created");
   const safe={...form,aadhaarNumber:`XXXXXXXX${digits(form.aadhaarNumber).slice(-4)}`,panNumber:form.panNumber.trim().toUpperCase(),accountNumber:`XXXXXX${form.accountNumber.slice(-4)}`,nomineeAadhaar:`XXXXXXXX${digits(form.nomineeAadhaar).slice(-4)}`,nomineePan:`${form.nomineePan.slice(0,2).toUpperCase()}******${form.nomineePan.slice(-2).toUpperCase()}`,kycUploadRef:uploadRef,kycDocuments:Object.fromEntries(Object.entries(uploads).map(([k,v])=>[k,v?.name||""]))};
   sessionStorage.setItem(`proposal:${planId}`,JSON.stringify({...safe,planId,savedAt:new Date().toISOString()}));
   navigate(`/payment/${planId}`);
  }catch(e){alert(errorMessage(e,"Secure KYC upload failed. Please try again."));}finally{setUploading(false);}
 };
 if(loading)return <MainLayout title="Insurance Proposal" subtitle="Preparing your application"><div className="section"><p>Loading plan and profile...</p></div></MainLayout>; if(!plan)return null;
 const premium=Number(plan.yearlyPremium||plan.yearlyAmount||0); const benefits=Array.isArray(plan.benefits)?plan.benefits.join(" • "):plan.benefits||plan.coverage||"Protection benefits as per plan terms.";
 return <MainLayout title="Insurance Proposal" subtitle="Complete KYC, nominee and settlement details before payment">
  <div className="payment-progress"><span className="done">1 Plan</span><span className="active">2 Proposal & KYC</span><span>3 Payment</span><span>4 Policy active</span></div>
  {restored&&<div className="proposal-restored"><strong>Saved proposal restored</strong><span>Sensitive KYC numbers and documents must be entered again for your security.</span></div>}
  <div className="proposal-layout"><div>
   <div className="section"><span className="eyebrow">PERSONAL DETAILS</span><h2>Policyholder details</h2><div className="form-grid">
    <input placeholder="Full Name" value={form.customerName} onChange={e=>update("customerName",e.target.value)}/><input placeholder="Verified Email" value={form.customerEmail} readOnly/>
    <input placeholder="Mobile Number" inputMode="tel" value={form.customerPhone} onChange={e=>update("customerPhone",e.target.value)}/><input type="date" aria-label="Date of Birth" value={form.dateOfBirth} onChange={e=>update("dateOfBirth",e.target.value)}/>
    <input className="proposal-full" placeholder="Residential Address" value={form.address} onChange={e=>update("address",e.target.value)}/></div></div>
   <div className="section"><span className="eyebrow">AADHAAR & PAN KYC</span><h2>Identity verification</h2><p className="kyc-note">Enter KYC details and attach supporting documents. Full sensitive numbers are not stored in browser proposal history.</p><div className="form-grid">
    <input placeholder="Aadhaar Number (12 digits)" inputMode="numeric" maxLength={14} value={form.aadhaarNumber} onChange={e=>update("aadhaarNumber",digits(e.target.value).slice(0,12))}/><input placeholder="PAN Number" maxLength={10} value={form.panNumber} onChange={e=>update("panNumber",e.target.value.toUpperCase())}/></div>
    <div className="kyc-upload-grid"><FileBox field="policyholderPhoto" label="Policyholder Photo" accept=".jpg,.jpeg,.png"/><FileBox field="aadhaarDocument" label="Aadhaar Document"/><FileBox field="panDocument" label="PAN Card"/><FileBox field="addressProof" label="Address Proof"/></div>
   </div>
   <div className="section"><span className="eyebrow">SETTLEMENT ACCOUNT</span><h2>Bank account details</h2><div className="form-grid">
    <input placeholder="Account Holder Name" value={form.accountHolderName} onChange={e=>update("accountHolderName",e.target.value)}/><input placeholder="Bank Name" value={form.bankName} onChange={e=>update("bankName",e.target.value)}/>
    <input placeholder="Account Number" inputMode="numeric" value={form.accountNumber} onChange={e=>update("accountNumber",digits(e.target.value))}/><input placeholder="IFSC Code" maxLength={11} value={form.ifscCode} onChange={e=>update("ifscCode",e.target.value.toUpperCase())}/></div></div>
   <div className="section"><span className="eyebrow">NOMINEE KYC</span><h2>Nominee details</h2><div className="form-grid">
    <input placeholder="Nominee Full Name" value={form.nomineeName} onChange={e=>update("nomineeName",e.target.value)}/><select value={form.nomineeRelation} onChange={e=>update("nomineeRelation",e.target.value)}><option value="">Relationship</option><option>Spouse</option><option>Father</option><option>Mother</option><option>Son</option><option>Daughter</option><option>Other</option></select>
    <input type="date" aria-label="Nominee Date of Birth" value={form.nomineeDateOfBirth} onChange={e=>update("nomineeDateOfBirth",e.target.value)}/><input placeholder="Nominee Mobile" inputMode="tel" value={form.nomineePhone} onChange={e=>update("nomineePhone",e.target.value)}/>
    <input placeholder="Nominee Email ID" type="email" value={form.nomineeEmail} onChange={e=>update("nomineeEmail",e.target.value)}/><input placeholder="Nominee Aadhaar Number" inputMode="numeric" maxLength={12} value={form.nomineeAadhaar} onChange={e=>update("nomineeAadhaar",digits(e.target.value).slice(0,12))}/>
    <input placeholder="Nominee PAN Number" maxLength={10} value={form.nomineePan} onChange={e=>update("nomineePan",e.target.value.toUpperCase())}/><input placeholder="Nominee Address" value={form.nomineeAddress} onChange={e=>update("nomineeAddress",e.target.value)}/></div>
    <div className="kyc-upload-grid"><FileBox field="nomineePhoto" label="Nominee Photo" accept=".jpg,.jpeg,.png"/><FileBox field="nomineeAadhaarDocument" label="Nominee Aadhaar"/><FileBox field="nomineePanDocument" label="Nominee PAN"/></div>
    <label className="proposal-consent"><input type="checkbox" checked={form.proposalConsent} onChange={e=>update("proposalConsent",e.target.checked)}/><span>I confirm the information is correct and consent to KYC/proposal processing and nominee verification.</span></label>
   </div>
  </div><aside className="proposal-summary"><span className="eyebrow">PLAN SUMMARY</span><h2>{plan.planName}</h2><p>{plan.category}</p><div><span>Life / Benefit Cover</span><strong>₹{Number(plan.coverageAmount||0).toLocaleString("en-IN")}</strong></div><div><span>Annual Premium</span><strong>₹{premium.toLocaleString("en-IN")}</strong></div><div><span>Payment Years</span><strong>{plan.paymentYears||1}</strong></div><small>{benefits}</small><button className="btn small-btn" onClick={()=>void continueToPayment()} disabled={uploading}>{uploading?"Uploading KYC securely...":"Review & continue to payment →"}</button><button className="mini-btn" onClick={()=>navigate("/insurance-plans")}>Change plan</button></aside></div>
 </MainLayout>;
}