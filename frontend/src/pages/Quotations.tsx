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
 const [search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("All");
 useEffect(()=>{void api.get<Q[]>("/quotations").then(r=>setItems(Array.isArray(r.data)?r.data:[])).finally(()=>setLoading(false));},[]);
 const now=new Date();
 const getStatus=(q:Q)=>new Date(q.validUntil)<now&&q.status!=="Converted"?"Expired":q.status||"Generated";
 const visible=items.filter(q=>{const s=getStatus(q);const matchesStatus=statusFilter==="All"||s===statusFilter;const needle=search.trim().toLowerCase();const matchesSearch=!needle||`${q.planName} ${q.quotationNumber} ${q.customerName||""}`.toLowerCase().includes(needle);return matchesStatus&&matchesSearch;});
 return <MainLayout title="Quotation History" subtitle="Saved Smart Quote records">
  <div className="section customer-portal-section">
   <div className="section-heading-row"><div><span className="eyebrow">SMART QUOTES</span><h2>Quotation history</h2><p className="section-copy">Review your saved quotations, validity and premium before continuing to purchase.</p></div><span className="plan-result-count">{visible.length} quotes</span></div>
   <div className="quotation-tools"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plan, quote number or customer..." aria-label="Search quotations"/><div>{["All","Generated","Converted","Expired"].map(s=><button key={s} className={statusFilter===s?"active":""} onClick={()=>setStatusFilter(s)}>{s}</button>)}</div></div>
   {loading?<SecureLifeLoader label="Loading quotations..." />:items.length===0?<div className="portal-empty-state"><strong>No saved quotations yet.</strong><span>Create a premium estimate to start a new quote.</span><button className="mini-btn" onClick={()=>navigate("/premium-calculator")}>Estimate Premium →</button></div>:
   <div className="quotation-card-grid">{visible.map(q=>{const expired=new Date(q.validUntil)<new Date()&&q.status!=="Converted";const status=getStatus(q);return <article className="quotation-card" key={q._id}>
    <div className="quotation-card-head"><div><span className="plan-category">SMART QUOTE</span><h3>{q.planName}</h3></div><span className={"quote-status "+status.toLowerCase()}>{status}</span></div>
    <div className="quotation-number">{q.quotationNumber}</div>
    <div className="quotation-metrics"><div><small>Cover</small><strong>{money(q.coverageAmount)}</strong></div><div><small>{q.frequency} premium</small><strong>{money(q.instalmentPremium)}</strong></div><div><small>Annual premium</small><strong>{money(q.annualPremium)}</strong></div></div>
    <div className="quotation-details"><p><span>Customer</span><strong>{q.customerName||"-"}</strong></p><p><span>Created</span><strong>{date(q.createdAt)}</strong></p><p><span>Valid until</span><strong>{date(q.validUntil)}</strong></p></div>
    {q.planId&&q.status!=="Converted"&&!expired?<button className="quotation-buy-btn" onClick={()=>navigate(`/online-policy-purchase?plan=${q.planId}&quote=${q._id}`)}>Proceed to Buy →</button>:<div className="quotation-unavailable">{status==="Converted"?"Policy purchase completed":"Quotation expired"}</div>}
   </article>})}{visible.length===0&&<div className="portal-empty-state"><strong>No matching quotations.</strong><span>Try another search or status filter.</span><button className="mini-btn" onClick={()=>{setSearch("");setStatusFilter("All");}}>Show all quotations</button></div>}</div>}
  </div>
 </MainLayout>;
}