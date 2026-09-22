import {useEffect,useState} from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
type Q={_id:string;quotationNumber:string;customerName?:string;mobile?:string;planName:string;coverageAmount:number;annualPremium:number;frequency:string;instalmentPremium:number;createdAt:string;validUntil:string};
const money=(n:number)=>"₹"+Number(n||0).toLocaleString("en-IN");
export default function Quotations(){
 const [items,setItems]=useState<Q[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{void api.get<Q[]>("/quotations").then(r=>setItems(Array.isArray(r.data)?r.data:[])).finally(()=>setLoading(false));},[]);
 return <MainLayout title="Quotation History" subtitle="Saved Smart Quote records">
  <div className="section"><span className="eyebrow">SMART QUOTES</span><h2>Quotation history</h2>
  {loading?<p>Loading...</p>:items.length===0?<p>No saved quotations yet.</p>:<div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Quotation</th><th>Customer</th><th>Plan</th><th>Cover</th><th>Premium</th><th>Date</th><th>Valid Until</th></tr></thead><tbody>{items.map(q=><tr key={q._id}><td><strong>{q.quotationNumber}</strong></td><td>{q.customerName||"-"}<br/><small>{q.mobile||""}</small></td><td>{q.planName}</td><td>{money(q.coverageAmount)}</td><td>{money(q.instalmentPremium)} {q.frequency}<br/><small>{money(q.annualPremium)} yearly</small></td><td>{new Date(q.createdAt).toLocaleDateString("en-IN")}</td><td>{new Date(q.validUntil).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>}
  </div></MainLayout>;
}