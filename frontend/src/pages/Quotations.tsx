import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import SecureLifeLoader from "../components/SecureLifeLoader";

type Q={_id:string;quotationNumber:string;status?:string;planId?:string;customerName?:string;mobile?:string;planName:string;coverageAmount:number;annualPremium:number;frequency:string;instalmentPremium:number;createdAt:string;validUntil:string};
const money=(n:number)=>"₹"+Number(n||0).toLocaleString("en-IN");
const date=(v:string)=>new Date(v).toLocaleDateString("en-IN");

export default function Quotations(){
 const navigate=useNavigate();
 const [items,setItems]=useState<Q[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{void api.get<Q[]>("/quotations").then(r=>setItems(Array.isArray(r.data)?r.data:[])).finally(()=>setLoading(false));},[]);
 return <MainLayout title="Quotation History" subtitle="Saved Smart Quote records">
  <div className="section customer-portal-section">
   <div className="section-heading-row"><div><span className="eyebrow">SMART QUOTES</span><h2>Quotation history</h2><p className="section-copy">Review your saved quotations, validity and premium before continuing to purchase.</p></div></div>
   {loading?<SecureLifeLoader label="Loading quotations..." />:items.length===0?<div className="portal-empty-state"><strong>No saved quotations yet.</strong><span>Create a premium estimate to start a new quote.</span><button className="mini-btn" onClick={()=>navigate("/premium-calculator")}>Estimate Premium →</button></div>:
   <div className="quotation-card-grid">{items.map(q=>{const expired=new Date(q.validUntil)<new Date()&&q.status!=="Converted";const status=expired?"Expired":q.status||"Generated";return <article className="quotation-card" key={q._id}>
    <div className="quotation-card-head"><div><span className="plan-category">SMART QUOTE</span><h3>{q.planName}</h3></div><span className={"quote-status "+status.toLowerCase()}>{status}</span></div>
    <div className="quotation-number">{q.quotationNumber}</div>
    <div className="quotation-metrics"><div><small>Cover</small><strong>{money(q.coverageAmount)}</strong></div><div><small>{q.frequency} premium</small><strong>{money(q.instalmentPremium)}</strong></div><div><small>Annual premium</small><strong>{money(q.annualPremium)}</strong></div></div>
    <div className="quotation-details"><p><span>Customer</span><strong>{q.customerName||"-"}</strong></p><p><span>Created</span><strong>{date(q.createdAt)}</strong></p><p><span>Valid until</span><strong>{date(q.validUntil)}</strong></p></div>
    {q.planId&&q.status!=="Converted"&&!expired?<button className="quotation-buy-btn" onClick={()=>navigate(`/online-policy-purchase?plan=${q.planId}&quote=${q._id}`)}>Proceed to Buy →</button>:<div className="quotation-unavailable">{status==="Converted"?"Policy purchase completed":"Quotation expired"}</div>}
   </article>})}</div>}
  </div>
 </MainLayout>;
}