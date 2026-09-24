import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
type Commission={_id:string;policyNumber:string;planName?:string;premiumAmount:number;commissionAmount:number;status:"Eligible"|"Requested"|"Paid"|"Rejected";nextPremiumDate?:string;customerName:string};
type Bank={status?:"Submitted"|"Approved"|"Rejected";adminRemarks?:string};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:2}).format(v||0);
export default function AdvisorDashboard(){
 const [items,setItems]=useState<Commission[]>([]);const [bank,setBank]=useState<Bank|null>(null);const [loading,setLoading]=useState(true);
 const user=useMemo(()=>{try{return JSON.parse(localStorage.getItem("insuranceUser")||"{}")}catch{return {}}},[]);
 useEffect(()=>{let active=true;(async()=>{const [c,b]=await Promise.allSettled([api.get<Commission[]>("/commissions"),api.get<Bank>("/advisor-bank/me")]);if(!active)return;if(c.status==="fulfilled")setItems(Array.isArray(c.value.data)?c.value.data:[]);if(b.status==="fulfilled")setBank(b.value.data||null);setLoading(false)})();return()=>{active=false}},[]);
 const business=items.reduce((s,x)=>s+Number(x.premiumAmount||0),0),earned=items.reduce((s,x)=>s+Number(x.commissionAmount||0),0),paid=items.filter(x=>x.status==="Paid").reduce((s,x)=>s+Number(x.commissionAmount||0),0),pending=items.filter(x=>x.status!=="Paid"&&x.status!=="Rejected").reduce((s,x)=>s+Number(x.commissionAmount||0),0);
 const upcoming=[...items].filter(x=>x.nextPremiumDate).sort((a,b)=>String(a.nextPremiumDate).localeCompare(String(b.nextPremiumDate))).slice(0,5);
 return <MainLayout title={`Welcome, ${user.name||"Advisor"}`} subtitle="Advisor business, earnings and payout readiness">
  <div className="admin-command-hero"><div><span className="eyebrow">SECURELIFE ADVISOR PORTAL</span><h2>Your business workspace</h2><p>Track advisor-code business, policy activity, commissions and payout verification from one place.</p></div><div className="admin-command-actions"><Link className="btn small-btn" to="/insurance-plans">View plans</Link><Link className="mini-btn" to="/commission">Commission</Link></div></div>
  {loading?<div className="section"><p>Loading advisor business...</p></div>:<>
   <div className="admin-kpi-grid"><div className="card"><h3>Advisor Code</h3><h1>{user.advisorCode||"—"}</h1></div><div className="card"><h3>Active Policies</h3><h1>{items.length}</h1></div><div className="card"><h3>Total Premium Business</h3><h1>{money(business)}</h1></div><div className="card"><h3>Earned Commission</h3><h1>{money(earned)}</h1></div><div className="card"><h3>Paid Commission</h3><h1>{money(paid)}</h1></div><div className="card"><h3>Pending Commission</h3><h1>{money(pending)}</h1></div></div>
   <div className="customer-health-grid">
    <Link to="/profile" className="customer-health-card"><div><span className="eyebrow">PAYOUT ACCOUNT</span><h3>{bank?.status||"Not submitted"}</h3><p>{bank?.status==="Rejected"?(bank.adminRemarks||"Update your bank details"):"Bank verification for commission settlement"}</p></div><span className="health-arrow">→</span></Link>
    <Link to="/commission" className="customer-health-card"><div><span className="eyebrow">EARNINGS</span><h3>{money(pending)}</h3><p>Commission awaiting settlement</p></div><span className="health-arrow">→</span></Link>
    <Link to="/insurance-plans" className="customer-health-card"><div><span className="eyebrow">PRODUCTS</span><h3>Insurance plans</h3><p>Review current plans and advisor commission rates</p></div><span className="health-arrow">→</span></Link>
   </div>
   <section className="section"><div className="section-heading-row"><div><span className="eyebrow">BUSINESS BOOK</span><h2>Recent advisor-code policies</h2></div><Link to="/commission">Settlement history</Link></div>{items.length===0?<p>No policy business is linked to your advisor code yet.</p>:items.slice(0,6).map(x=><div className="premium-row" key={x._id}><span><strong>{x.policyNumber}</strong><br/><small>{x.planName||x.customerName}</small></span><strong>{money(x.premiumAmount)}</strong><span>{money(x.commissionAmount)} commission</span><span className="status-pill active">{x.status}</span></div>)}</section>
   <section className="section"><div className="section-heading-row"><div><span className="eyebrow">RENEWAL VISIBILITY</span><h2>Upcoming premium dates</h2></div></div>{upcoming.length===0?<p>No upcoming premium dates available.</p>:upcoming.map(x=><div className="premium-row" key={x._id}><span>{x.policyNumber}</span><strong>{x.planName||"Policy"}</strong><span>Next due {x.nextPremiumDate?new Date(x.nextPremiumDate).toLocaleDateString("en-IN"):"—"}</span><span className="status-pill due">Upcoming</span></div>)}</section>
  </>}
 </MainLayout>
}