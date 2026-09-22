import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type Status = "Pending" | "Paid";
type Advisor = { _id:string; name:string; email:string; advisorCode?:string; role:string };
type Item = { _id:string; advisorId?:string; advisorCode?:string; employeeName:string; customerName:string; policyNumber:string; premiumAmount:number; commissionRate:number; commissionAmount:number; month:string; status:Status; remarks?:string };
type Form = { advisorId:string; customerName:string; policyNumber:string; premiumAmount:string; commissionRate:string; month:string; remarks:string };
const initial:Form={advisorId:"",customerName:"",policyNumber:"",premiumAmount:"",commissionRate:"",month:"",remarks:""};

export default function Commission(){
  const [items,setItems]=useState<Item[]>([]); const [advisors,setAdvisors]=useState<Advisor[]>([]); const [form,setForm]=useState<Form>(initial);
  const [loading,setLoading]=useState(false); const [search,setSearch]=useState(""); const [month,setMonth]=useState("");
  const user=useMemo(()=>{try{return JSON.parse(localStorage.getItem("insuranceUser")||"{}") as {role?:string}}catch{return {}}},[]);
  const isAdvisor=user.role==="advisor";

  const load=useCallback(async()=>{try{setLoading(true);const res=await api.get<Item[]>("/commissions");setItems(res.data)}catch(e){console.error(e);alert("Commission load failed")}finally{setLoading(false)}},[]);
  const loadAdvisors=useCallback(async()=>{if(isAdvisor)return;try{const res=await api.get<Advisor[]>("/user-management");setAdvisors(res.data.filter(a=>a.role==="advisor"))}catch(e){console.error(e)}},[isAdvisor]);
  useEffect(()=>{void load();void loadAdvisors()},[load,loadAdvisors]);

  const add=async()=>{const advisor=advisors.find(a=>a._id===form.advisorId);if(!advisor||!form.customerName||!form.policyNumber||!form.premiumAmount||!form.commissionRate||!form.month)return alert("Advisor, customer, policy, premium, rate and month required");
    const premiumAmount=Number(form.premiumAmount), commissionRate=Number(form.commissionRate);
    try{const res=await api.post<Item>("/commissions",{advisorId:advisor._id,advisorCode:advisor.advisorCode||"",employeeName:advisor.name,employeeRole:"Agent",customerName:form.customerName,policyNumber:form.policyNumber,premiumAmount,commissionRate,commissionAmount:Math.round(premiumAmount*commissionRate/100),month:form.month,status:"Pending",remarks:form.remarks});setItems(p=>[res.data,...p]);setForm(initial)}catch(e){console.error(e);alert("Commission add failed")}};
  const status=async(id:string,s:Status)=>{try{const res=await api.put<Item>(`/commissions/${id}`,{status:s});setItems(p=>p.map(x=>x._id===id?res.data:x))}catch{alert("Status update failed")}};

  const filtered=useMemo(()=>items.filter(x=>`${x.employeeName} ${x.advisorCode||""} ${x.customerName} ${x.policyNumber}`.toLowerCase().includes(search.toLowerCase())&&(!month||x.month===month)),[items,search,month]);
  const business=filtered.reduce((s,x)=>s+x.premiumAmount,0), total=filtered.reduce((s,x)=>s+x.commissionAmount,0), paid=filtered.filter(x=>x.status==="Paid").reduce((s,x)=>s+x.commissionAmount,0), pending=total-paid;

  return <MainLayout title={isAdvisor?"Advisor Earnings":"Advisor Commission"} subtitle={isAdvisor?"Track your business, commission earnings and settlement status":"Track advisor business and commission settlement"}>
    <div className="cards admin-kpi-grid">
      <div className="card"><h3>Total Business</h3><h1>₹{business.toLocaleString("en-IN")}</h1></div>
      <div className="card"><h3>Total Commission</h3><h1>₹{total.toLocaleString("en-IN")}</h1></div>
      <div className="card"><h3>Paid</h3><h1>₹{paid.toLocaleString("en-IN")}</h1></div>
      <div className="card"><h3>Pending</h3><h1>₹{pending.toLocaleString("en-IN")}</h1></div>
    </div>

    {isAdvisor&&<div className="section">
      <span className="eyebrow">EARNINGS OVERVIEW</span>
      <h2>How your commission can build</h2>
      <p className="section-copy">See how first-year and renewal commission can build over time. This is an illustration only; actual commission depends on the product sold, business booked and the applicable commission structure.</p>

      <div className="cards admin-kpi-grid">
        <div className="card"><h3>First Year Commission</h3><h1>30%</h1><p>Illustrative rate</p></div>
        <div className="card"><h3>Renewal Commission</h3><h1>3%</h1><p>Illustrative annual rate for 9 years</p></div>
        <div className="card"><h3>Illustrated Total</h3><h1>57%</h1><p>30% + 3% × 9 years</p></div>
        <div className="card"><h3>Earning Basis</h3><h1>Business</h1><p>Depends on product and eligible premium</p></div>
      </div>

      <div className="premium-table-wrap">
        <table className="table">
          <thead><tr><th>Business Example</th><th>Premium / Business</th><th>First Year 30%</th><th>Renewal 3% × 9</th><th>Illustrated Total</th></tr></thead>
          <tbody>
            <tr><td>Monthly business</td><td>₹1,00,000</td><td>₹30,000</td><td>₹27,000</td><td><strong>₹57,000</strong></td></tr>
            <tr><td>Yearly business</td><td>₹12,00,000</td><td>₹3,60,000</td><td>₹3,24,000</td><td><strong>₹6,84,000</strong></td></tr>
            <tr><td>10-year active business</td><td>₹1,20,00,000</td><td>₹36,00,000</td><td>₹32,40,000</td><td><strong>₹68,40,000</strong></td></tr>
          </tbody>
        </table>
      </div>
      <p className="section-copy"><strong>Important:</strong> These figures are sample illustrations, not a guaranteed payout. Actual earnings vary by product, premium, eligibility, persistency and the commission rules configured for your business.</p>
    </div>}

    {!isAdvisor&&<div className="section"><span className="eyebrow">NEW COMMISSION</span><h2>Assign advisor commission</h2><p className="section-copy">Select the advisor, enter policy business and commission rate. Amount is calculated automatically.</p>
      <div className="form-grid">
        <select value={form.advisorId} onChange={e=>setForm(p=>({...p,advisorId:e.target.value}))}><option value="">Select Advisor</option>{advisors.map(a=><option key={a._id} value={a._id}>{a.name} — {a.advisorCode||a.email}</option>)}</select>
        <input placeholder="Customer Name" value={form.customerName} onChange={e=>setForm(p=>({...p,customerName:e.target.value}))}/>
        <input placeholder="Policy Number" value={form.policyNumber} onChange={e=>setForm(p=>({...p,policyNumber:e.target.value}))}/>
        <input type="number" placeholder="Premium / Business Amount" value={form.premiumAmount} onChange={e=>setForm(p=>({...p,premiumAmount:e.target.value}))}/>
        <input type="number" placeholder="Commission Rate %" value={form.commissionRate} onChange={e=>setForm(p=>({...p,commissionRate:e.target.value}))}/>
        <input type="month" value={form.month} onChange={e=>setForm(p=>({...p,month:e.target.value}))}/>
        <input placeholder="Remarks" value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))}/>
      </div>
      <button className="btn small-btn" onClick={()=>void add()}>Add Commission</button>
    </div>}

    <div className="section admin-table-section">
      <div className="section-heading-row"><div><span className="eyebrow">SETTLEMENT REGISTER</span><h2>{isAdvisor?"My earnings & settlement history":"Advisor commission list"}</h2></div><button className="mini-btn" onClick={()=>void load()}>Refresh</button></div>
      <div className="form-grid"><input placeholder={isAdvisor ? "Search customer or policy" : "Search advisor, code, customer or policy"} value={search} onChange={e=>setSearch(e.target.value)}/><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><button className="mini-btn" onClick={()=>setMonth("")}>Clear Month</button></div>
      {loading?<p>Loading...</p>:filtered.length===0?<p>No commission records found.</p>:<div className="premium-table-wrap"><table className="table"><thead><tr><th>Advisor</th><th>Code</th><th>Customer</th><th>Policy</th><th>Business</th><th>Rate</th><th>Commission</th><th>Month</th><th>Status</th></tr></thead>
      <tbody>{filtered.map(x=><tr key={x._id}><td><strong>{x.employeeName}</strong></td><td>{x.advisorCode||"—"}</td><td>{x.customerName}</td><td>{x.policyNumber}</td><td>₹{x.premiumAmount.toLocaleString("en-IN")}</td><td>{x.commissionRate}%</td><td><strong>₹{x.commissionAmount.toLocaleString("en-IN")}</strong></td><td>{x.month}</td><td>{isAdvisor?<span className="badge">{x.status}</span>:<select className="status-select" value={x.status} onChange={e=>void status(x._id,e.target.value as Status)}><option>Pending</option><option>Paid</option></select>}</td></tr>)}</tbody></table></div>}
    </div>
  </MainLayout>
}
