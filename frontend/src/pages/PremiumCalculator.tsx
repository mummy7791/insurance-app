import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";
import api from "../services/api";
import jsPDF from "jspdf";

type Plan={_id:string;planName:string;productGroup?:string;category:string;coverageAmount?:number;paymentYears?:number;policyTermYears?:number;ageMin?:number;ageMax?:number;premiumFrequencies?:string[]};
type Quote={planId:string;planName:string;productGroup:string;age:number;gender:string;smoker:boolean;coverageAmount:number;paymentYears:number;policyTermYears:number;frequency:string;instalmentPremium:number;annualPremium:number;totalPremium:number;schedule:{policyYear:number;annualPremium:number;frequency:string;instalmentPremium:number}[];disclaimer:string};
const groups=["ULIPS","Traditional Products","Term / Health Products","Pension Products","iSolutions","Other"];
const money=(n:number)=>"₹"+Number(n||0).toLocaleString("en-IN");
const err=(e:unknown)=>typeof e==="object"&&e!==null&&"response" in e?(e as {response?:{data?:{message?:string}}}).response?.data?.message||"Quotation failed":"Quotation failed";

export default function PremiumCalculator(){
 const [plans,setPlans]=useState<Plan[]>([]),[planId,setPlanId]=useState(""),[age,setAge]=useState("30"),[gender,setGender]=useState("Male"),[smoker,setSmoker]=useState(false),[cover,setCover]=useState(""),[frequency,setFrequency]=useState("Yearly"),[quote,setQuote]=useState<Quote|null>(null),[loading,setLoading]=useState(false);
 const selected=plans.find(p=>p._id===planId);
 useEffect(()=>{void api.get<Plan[]>("/insurance-plans").then(r=>{const data=Array.isArray(r.data)?r.data:[];setPlans(data);if(data[0]){setPlanId(data[0]._id);setCover(String(data[0].coverageAmount||""));}}).catch(()=>setPlans([]));},[]);
 const choose=(id:string)=>{setPlanId(id);const p=plans.find(x=>x._id===id);if(p){setCover(String(p.coverageAmount||""));setFrequency(p.premiumFrequencies?.[0]||"Yearly");}setQuote(null);};
 const downloadQuote=()=>{if(!quote)return;const doc=new jsPDF();const moneyPdf=(n:number)=>"Rs. "+Number(n||0).toLocaleString("en-IN");let y=20;
  doc.setFontSize(18);doc.text("SecureLife Insurance - Smart Quote",20,y);y+=10;doc.setFontSize(11);doc.text(`Plan: ${quote.planName}`,20,y);y+=7;doc.text(`Product: ${quote.productGroup}`,20,y);y+=7;doc.text(`Age: ${quote.age} | Gender: ${quote.gender} | Smoker: ${quote.smoker?"Yes":"No"}`,20,y);y+=7;doc.text(`Benefit / Sum Assured: ${moneyPdf(quote.coverageAmount)}`,20,y);y+=7;doc.text(`Policy Term: ${quote.policyTermYears} years | Premium Paying Term: ${quote.paymentYears} years`,20,y);y+=7;doc.text(`Payment Mode: ${quote.frequency}`,20,y);y+=10;
  doc.setFontSize(14);doc.text("You Pay",20,y);doc.text("You Get",115,y);y+=8;doc.setFontSize(12);doc.text(`${moneyPdf(quote.instalmentPremium)} / ${quote.frequency}`,20,y);doc.text(moneyPdf(quote.coverageAmount),115,y);y+=12;
  doc.setFontSize(13);doc.text("Premium Schedule",20,y);y+=8;doc.setFontSize(10);doc.text("Year",20,y);doc.text("Frequency",45,y);doc.text("Instalment",95,y);doc.text("Annual Premium",140,y);y+=6;
  quote.schedule.forEach(row=>{if(y>270){doc.addPage();y=20;}doc.text(String(row.policyYear),20,y);doc.text(row.frequency,45,y);doc.text(moneyPdf(row.instalmentPremium),95,y);doc.text(moneyPdf(row.annualPremium),140,y);y+=6;});
  y+=6;if(y>255){doc.addPage();y=20;}doc.setFontSize(9);doc.text(doc.splitTextToSize(quote.disclaimer,170),20,y);doc.save(`${quote.planName.replace(/[^a-z0-9]+/gi,"-")}-quotation.pdf`);};
 const calculate=async()=>{if(!selected)return;try{setLoading(true);const r=await api.post<Quote>(`/insurance-plans/${selected._id}/quote`,{age:Number(age),gender,smoker,coverageAmount:Number(cover),frequency});setQuote(r.data);sessionStorage.setItem("premiumEstimate",JSON.stringify({category:selected.category,coverageAmount:r.data.coverageAmount,yearlyPremium:r.data.annualPremium,planId:selected._id}));}catch(e){alert(err(e));}finally{setLoading(false);}};
 return <div className="calculator-page"><div className="calculator-shell">
  <header className="calculator-header"><Link className="public-brand" to="/"><span>S</span>SecureLife</Link><Link to="/" className="mini-btn">Back to home</Link></header>
  <div className="calculator-intro"><span className="eyebrow">SMART QUOTES</span><h1>Plan-specific insurance quotation</h1><p>Select a product, enter customer details and get premium by age, cover, payment frequency and plan rules.</p></div>
  <div className="section"><h2>Select Product Category</h2>{groups.map(g=>{const items=plans.filter(p=>(p.productGroup||"Other")===g);if(!items.length)return null;return <details key={g} open={selected?.productGroup===g}><summary style={{cursor:"pointer",fontWeight:700,padding:"12px 0"}}>{g}</summary><div className="cards">{items.map(p=><button key={p._id} className={p._id===planId?"btn small-btn":"mini-btn"} onClick={()=>choose(p._id)}>{p.planName}</button>)}</div></details>;})}</div>
  {selected&&<div className="section"><span className="eyebrow">CUSTOMER INPUT</span><h2>{selected.planName}</h2><div className="form-grid">
   <input type="number" min={selected.ageMin||1} max={selected.ageMax||100} placeholder="Age" value={age} onChange={e=>setAge(e.target.value)}/>
   <select value={gender} onChange={e=>setGender(e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select>
   <input type="number" placeholder="Sum Assured / Benefit Cover" value={cover} onChange={e=>setCover(e.target.value)}/>
   <select value={frequency} onChange={e=>setFrequency(e.target.value)}>{(selected.premiumFrequencies?.length?selected.premiumFrequencies:["Yearly"]).map(x=><option key={x}>{x}</option>)}</select>
   <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={smoker} onChange={e=>setSmoker(e.target.checked)}/> Smoker</label>
  </div><button className="btn small-btn" style={{marginTop:16}} onClick={()=>void calculate()} disabled={loading}>{loading?"Calculating...":"Generate Smart Quote"}</button></div>}
  {quote&&<div className="section"><span className="eyebrow">YOUR QUOTATION</span><h2>{quote.planName}</h2><div className="cards">
   <div className="card"><h3>You Pay</h3><h1>{money(quote.instalmentPremium)}</h1><p>{quote.frequency}</p></div>
   <div className="card"><h3>Annual Premium</h3><h1>{money(quote.annualPremium)}</h1></div>
   <div className="card"><h3>You Get</h3><h1>{money(quote.coverageAmount)}</h1><p>Benefit / Sum Assured</p></div>
   <div className="card"><h3>Pay For</h3><h1>{quote.paymentYears} years</h1></div>
   <div className="card"><h3>Policy Term</h3><h1>{quote.policyTermYears} years</h1></div>
  </div><h3>Year-wise premium schedule</h3><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Policy Year</th><th>Frequency</th><th>Instalment</th><th>Annual</th></tr></thead><tbody>{quote.schedule.map(x=><tr key={x.policyYear}><td>{x.policyYear}</td><td>{x.frequency}</td><td>{money(x.instalmentPremium)}</td><td>{money(x.annualPremium)}</td></tr>)}</tbody></table></div><p className="muted-copy">{quote.disclaimer}</p><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="mini-btn" onClick={downloadQuote}>Download Quotation PDF</button><Link className="btn small-btn" to="/login">Continue to plan selection →</Link></div></div>}
 </div></div>;
}