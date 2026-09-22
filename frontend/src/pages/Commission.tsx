import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type Status="Eligible"|"Requested"|"Paid"|"Rejected";
type Item={_id:string;advisorCode?:string;employeeName:string;customerName:string;policyNumber:string;premiumAmount:number;commissionRate:number;commissionAmount:number;month:string;status:Status;remarks?:string;planName?:string;policyStatus?:string;purchaseDate?:string;nextPremiumDate?:string;paidDate?:string};
type Plan={_id:string;planName:string;category:string;yearlyPremium:number;advisorCommissionRate?:number;status:string};

const money=(n:number)=>"₹"+Number(n||0).toLocaleString("en-IN");
const date=(v?:string)=>v?new Date(v).toLocaleDateString("en-IN"):"—";

export default function Commission(){
 const [items,setItems]=useState<Item[]>([]),[plans,setPlans]=useState<Plan[]>([]);
 const [loading,setLoading]=useState(false),[search,setSearch]=useState(""),[month,setMonth]=useState("");
 const [rates,setRates]=useState<Record<string,string>>({});
 const user=useMemo(()=>{try{return JSON.parse(localStorage.getItem("insuranceUser")||"{}") as {role?:string}}catch{return {}}},[]);
 const isAdvisor=user.role==="advisor",isAdmin=user.role==="admin";

 const load=useCallback(async()=>{try{setLoading(true);const r=await api.get<Item[]>("/commissions");setItems(Array.isArray(r.data)?r.data:[])}catch(e){console.error(e);alert("Commission load failed")}finally{setLoading(false)}},[]);
 const loadPlans=useCallback(async()=>{if(!isAdmin)return;try{const r=await api.get<Plan[]>("/commissions/plans");setPlans(r.data);setRates(Object.fromEntries(r.data.map(p=>[p._id,String(p.advisorCommissionRate||0)])))}catch(e){console.error(e)}},[isAdmin]);
 useEffect(()=>{void load();void loadPlans()},[load,loadPlans]);

 const saveRate=async(p:Plan)=>{const rate=Number(rates[p._id]);if(!Number.isFinite(rate)||rate<0||rate>100)return alert("Enter commission rate between 0 and 100");try{await api.put(`/commissions/plans/${p._id}`,{advisorCommissionRate:rate});alert(`${p.planName} commission saved: ${rate}%`);void loadPlans()}catch{alert("Commission rate update failed")}};
 const requestPayout=async(x:Item)=>{const remarks=window.prompt("Optional note for admin","Please review and process this commission payout.")||"";try{const r=await api.post<Item>(`/commissions/${x._id}/request`,{remarks});setItems(p=>p.map(i=>i._id===x._id?r.data:i));}catch{alert("Payout request failed")}};
 const review=async(x:Item,status:"Paid"|"Rejected")=>{const remarks=window.prompt(status==="Paid"?"Enter payout reference / remarks":"Enter rejection reason");if(!remarks)return;const paidDate=status==="Paid"?(window.prompt("Paid date (YYYY-MM-DD)",new Date().toISOString().slice(0,10))||""):undefined;try{const r=await api.put<Item>(`/commissions/${x._id}/review`,{status,remarks,paidDate});setItems(p=>p.map(i=>i._id===x._id?r.data:i));}catch{alert("Payout review failed")}};

 const filtered=useMemo(()=>items.filter(x=>`${x.employeeName} ${x.advisorCode||""} ${x.customerName} ${x.policyNumber} ${x.planName||""}`.toLowerCase().includes(search.toLowerCase())&&(!month||x.month===month)),[items,search,month]);
 const business=filtered.reduce((s,x)=>s+x.premiumAmount,0),total=filtered.reduce((s,x)=>s+x.commissionAmount,0),paid=filtered.filter(x=>x.status==="Paid").reduce((s,x)=>s+x.commissionAmount,0),pending=total-paid;

 return <MainLayout title={isAdvisor?"Advisor Business & Earnings":"Advisor Commission Control"} subtitle={isAdvisor?"Policies linked to your advisor code, earnings and payout status":"Set plan-wise rates and approve advisor payout requests"}>
  <div className="cards admin-kpi-grid"><div className="card"><h3>Total Business</h3><h1>{money(business)}</h1></div><div className="card"><h3>Policies</h3><h1>{filtered.length}</h1></div><div className="card"><h3>Total Commission</h3><h1>{money(total)}</h1></div><div className="card"><h3>Paid / Pending</h3><h1>{money(paid)} / {money(pending)}</h1></div></div>

  {isAdmin&&<div className="section"><span className="eyebrow">PLAN-WISE COMMISSION</span><h2>Configure advisor commission</h2><p className="section-copy">Set one commission percentage for each plan. When a customer buys with a valid advisor code, that plan rate is locked to the policy business.</p>
   <div className="premium-table-wrap"><table className="table"><thead><tr><th>Plan</th><th>Category</th><th>Annual Premium</th><th>Commission %</th><th>Action</th></tr></thead><tbody>{plans.map(p=><tr key={p._id}><td><strong>{p.planName}</strong></td><td>{p.category}</td><td>{money(p.yearlyPremium)}</td><td><input type="number" min="0" max="100" step="0.01" value={rates[p._id]??"0"} onChange={e=>setRates(v=>({...v,[p._id]:e.target.value}))}/></td><td><button className="mini-btn" onClick={()=>void saveRate(p)}>Save Rate</button></td></tr>)}</tbody></table></div>
  </div>}

  {isAdvisor&&<div className="section"><span className="eyebrow">MY ADVISOR-CODE BUSINESS</span><h2>Active policy business</h2><p className="section-copy">Only successfully paid policies purchased with your advisor code appear here. Submit eligible commission to admin for payout review.</p></div>}

  <div className="section admin-table-section"><div className="section-heading-row"><div><span className="eyebrow">SETTLEMENT REGISTER</span><h2>{isAdvisor?"My earnings & settlement history":"Advisor payout requests & history"}</h2></div><button className="mini-btn" onClick={()=>void load()}>Refresh</button></div>
   <div className="form-grid"><input placeholder="Search advisor, customer, plan or policy" value={search} onChange={e=>setSearch(e.target.value)}/><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><button className="mini-btn" onClick={()=>setMonth("")}>Clear Month</button></div>
   {loading?<p>Loading...</p>:filtered.length===0?<div className="admin-empty-state"><strong>No advisor business found</strong><span>Paid policies linked through an advisor code will appear here.</span></div>:<div className="premium-table-wrap"><table className="table"><thead><tr><th>Advisor</th><th>Customer / Plan</th><th>Policy</th><th>Business</th><th>Rate / Commission</th><th>Purchase / Next Due</th><th>Status</th><th>Action / Remarks</th></tr></thead><tbody>{filtered.map(x=><tr key={x._id}>
    <td><strong>{x.employeeName}</strong><br/><small>{x.advisorCode||"—"}</small></td><td>{x.customerName}<br/><small>{x.planName||"Plan"}</small></td><td>{x.policyNumber}<br/><small>{x.policyStatus||"Active"}</small></td><td>{money(x.premiumAmount)}</td><td>{x.commissionRate}%<br/><strong>{money(x.commissionAmount)}</strong></td><td>{date(x.purchaseDate)}<br/><small>Due: {date(x.nextPremiumDate)}</small></td><td><span className="badge">{x.status}</span>{x.paidDate&&<><br/><small>Paid: {date(x.paidDate)}</small></>}</td><td>{isAdvisor&&["Eligible","Rejected"].includes(x.status)&&<button className="mini-btn" onClick={()=>void requestPayout(x)}>Request Payout</button>}{isAdmin&&x.status==="Requested"&&<><button className="mini-btn" onClick={()=>void review(x,"Paid")}>Approve & Paid</button> <button className="mini-btn" onClick={()=>void review(x,"Rejected")}>Reject</button></>}<br/><small>{x.remarks||"—"}</small></td>
   </tr>)}</tbody></table></div>}
  </div>
 </MainLayout>;
}
