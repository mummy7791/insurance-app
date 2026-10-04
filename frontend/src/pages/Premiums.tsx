import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import SecureLifeLoader from "../components/SecureLifeLoader";
ChartJS.register(CategoryScale,LinearScale,BarElement,Title,Tooltip,Legend);

type PaymentMode = "UPI" | "Cash" | "Card" | "Net Banking";
type PremiumStatus = "Upcoming" | "Due" | "Grace Period" | "Overdue" | "Lapsed" | "Paid";

type Premium = {
  _id: string;
  customerName: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paymentMode: PaymentMode;
  receiptNumber?: string;
  status: PremiumStatus;
};

type RenewalRow = {
  id:string; status:PremiumStatus; customerName:string; customerPhone:string; address:string;
  policyNumber:string; planName:string; amount:number; dueDate:string; daysDifference:number;
  advisorName:string; advisorCode:string; premiumFrequency:string;
};

const renewalStatuses: PremiumStatus[] = ["Upcoming","Due","Grace Period","Overdue","Lapsed"];

type Analytics = {
 summary:{thisMonthDueAmount:number;collectedAmount:number;pendingAmount:number;collectionPercent:number;graceAmount:number;lapsedAmount:number};
 months:Array<{month:string;due:number;collected:number}>;
 advisorPerformance:Array<{advisorCode:string;advisorName:string;due:number;collected:number;pending:number;collectionPercent:number}>;
 timeline:Array<{premiumId:string;customerName:string;policyNumber:string;dueDate:string;status:string;events:Array<{label:string;date:string;remarks?:string}>}>;
 todayList:Premium[]; next7Days:Premium[];
};

type CashfreeInstance = {
  checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "production" | "sandbox" }) => CashfreeInstance;
  }
}

type PremiumForm = {
  customerName: string;
  policyNumber: string;
  amount: string;
  dueDate: string;
  paymentMode: PaymentMode;
  receiptNumber: string;
};

const initialForm: PremiumForm = {
  customerName: "",
  policyNumber: "",
  amount: "",
  dueDate: "",
  paymentMode: "UPI",
  receiptNumber: "",
};

export default function Premiums() {
  const [premiums, setPremiums] = useState<Premium[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PremiumForm>(initialForm);
  const [payingId, setPayingId] = useState("");
  const [renewalRows,setRenewalRows]=useState<RenewalRow[]>([]);
  const [renewalTab,setRenewalTab]=useState<PremiumStatus>("Upcoming");
  const [followupRow,setFollowupRow]=useState<RenewalRow|null>(null);
  const [followupStatus,setFollowupStatus]=useState("Called");
  const [followupDate,setFollowupDate]=useState("");
  const [followupRemarks,setFollowupRemarks]=useState("");
  const [followupSummary,setFollowupSummary]=useState({today:0,tomorrow:0,missed:0,promiseToPay:0});
  const [analytics,setAnalytics]=useState<Analytics|null>(null);
  const [receiptLogoDataUrl,setReceiptLogoDataUrl]=useState("");
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}"); } catch { return {}; } }, []);
  const isCustomer = user.role === "customer" || !user.role;

  useEffect(() => {
    let cancelled = false;
    fetch("/securelife-logo.jpg").then(r => r.blob()).then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => { if (!cancelled) setReceiptLogoDataUrl(String(reader.result || "")); };
      reader.readAsDataURL(blob);
    }).catch(error => console.warn("Receipt logo load failed:", error));
    return () => { cancelled = true; };
  }, []);

  const loadAnalytics=useCallback(async()=>{if(isCustomer)return;try{const r=await api.get<Analytics>("/premiums/analytics");setAnalytics(r.data);}catch(e){console.error("Premium analytics error:",e);}},[isCustomer]);
  const downloadCollectionList=(title:string,rows:Premium[])=>{const headers=["Customer Name","Policy Number","Premium Amount","Due Date","Status"];const lines=[headers.map(csvCell).join(","),...rows.map(r=>[r.customerName,r.policyNumber,r.amount,r.dueDate,r.status].map(csvCell).join(","))];const blob=new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`SecureLife-${title}-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);};

  const loadFollowupSummary=useCallback(async()=>{if(isCustomer)return;try{const r=await api.get<{today:number;tomorrow:number;missed:number;promiseToPay:number}>("/followups/summary");setFollowupSummary(r.data);}catch(e){console.error("Follow-up summary error:",e);}},[isCustomer]);
  const saveFollowup=async()=>{
    if(!followupRow)return;
    try{
      await api.post("/followups",{customerName:followupRow.customerName,phone:followupRow.customerPhone||"Not available",followType:"Premium Reminder",date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),status:followupStatus,remarks:followupRemarks||"Premium renewal follow-up",policyNumber:followupRow.policyNumber,premiumId:followupRow.id,advisorCode:followupRow.advisorCode,nextFollowupDate:followupDate});
      setFollowupRow(null);setFollowupRemarks("");setFollowupDate("");await loadFollowupSummary();alert("Follow-up saved");
    }catch(e){console.error("Follow-up save error:",e);alert("Follow-up save failed");}
  };

  const loadRenewalReport=useCallback(async()=>{
    if(isCustomer)return;
    try{const res=await api.get<{rows:RenewalRow[]}>("/premiums/renewal-report");setRenewalRows(Array.isArray(res.data.rows)?res.data.rows:[]);}
    catch(error){console.error("Renewal report load error:",error);}
  },[isCustomer]);

  const csvCell=(v:unknown)=>`"${String(v??"").replace(/"/g,'""')}"`;
  const downloadRenewalExcel=(status:PremiumStatus)=>{
    const rows=renewalRows.filter(r=>r.status===status);
    const headers=["Customer Name","Mobile Number","Address","Policy Number","Plan Name","Premium Amount","Due Date","Days Remaining / Overdue","Premium Status","Advisor Name","Advisor Code","Payment Frequency"];
    const lines=[headers.map(csvCell).join(","),...rows.map(r=>[r.customerName,r.customerPhone,r.address,r.policyNumber,r.planName,r.amount,r.dueDate,r.daysDifference>=0?`${r.daysDifference} days remaining`:`${Math.abs(r.daysDifference)} days overdue`,r.status,r.advisorName,r.advisorCode,r.premiumFrequency].map(csvCell).join(","))];
    const blob=new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`SecureLife-${status.replace(/\s+/g,"-")}-Premiums-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };

  const loadPremiums = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Premium[]>("/premiums");

      setTimeout(() => {
        setPremiums(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Premiums load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Premiums load failed");
    }
  }, []);

  useEffect(()=>{void loadRenewalReport();void loadFollowupSummary();void loadAnalytics();},[loadRenewalReport,loadFollowupSummary,loadAnalytics]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("cf_renewal_order_id");
    const premiumId = params.get("premium_id");

    const verifyReturnedPayment = async () => {
      if (!orderId || !premiumId) {
        await loadPremiums();
        return;
      }
      try {
        setPayingId(premiumId);
        await api.post(`/premiums/${premiumId}/verify-payment`, { orderId });
        window.history.replaceState({}, "", "/premiums");
        await loadPremiums();
        alert("Premium paid successfully. Your receipt is ready.");
      } catch (error) {
        console.error("Renewal verification error:", error);
        alert("Payment verification failed. If money was debited, do not pay again. Refresh and check the premium status.");
      } finally {
        setPayingId("");
      }
    };

    void verifyReturnedPayment();
  }, [loadPremiums]);

  const payPremium = async (premium: Premium) => {
    if (!window.Cashfree) {
      alert("Cashfree checkout is loading. Please try again.");
      return;
    }
    try {
      setPayingId(premium._id);
      const res = await api.post<{ paymentSessionId: string }>(`/premiums/${premium._id}/create-payment-order`);
      const cashfree = window.Cashfree({ mode: "production" });
      const result = await cashfree.checkout({
        paymentSessionId: res.data.paymentSessionId,
        redirectTarget: "_self",
      });
      if (result?.error) {
        alert(result.error.message || "Payment could not be started");
        setPayingId("");
      }
    } catch (error) {
      console.error("Renewal payment start error:", error);
      alert("Renewal payment could not be started");
      setPayingId("");
    }
  };

  const addPremium = async () => {
    if (!form.customerName || !form.policyNumber || !form.amount || !form.dueDate) {
      alert("Customer Name, Policy Number, Amount, Due Date required");
      return;
    }

    try {
      const res = await api.post<Premium>("/premiums", {
        customerName: form.customerName,
        policyNumber: form.policyNumber,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        paymentMode: form.paymentMode,
        receiptNumber:
          form.receiptNumber || `REC${Math.floor(Math.random() * 1000000)}`,
        status: "Due",
      });

      setPremiums((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Premium add error:", error);
      alert("Premium add failed");
    }
  };

  const updateStatus = async (id: string, status: PremiumStatus) => {
    try {
      const payload =
        status === "Paid"
          ? {
              status,
              paidDate: new Date().toISOString().split("T")[0],
            }
          : {
              status,
              paidDate: "",
            };

      const res = await api.put<Premium>(`/premiums/${id}`, payload);

      setPremiums((prev) =>
        prev.map((premium) => (premium._id === id ? res.data : premium))
      );
    } catch (error) {
      console.error("Premium status update error:", error);
      alert("Premium status update failed");
    }
  };

  const deletePremium = async (id: string) => {
    const ok = window.confirm("Delete this premium record?");
    if (!ok) return;

    try {
      await api.delete(`/premiums/${id}`);
      setPremiums((prev) => prev.filter((premium) => premium._id !== id));
    } catch (error) {
      console.error("Premium delete error:", error);
      alert("Premium delete failed");
    }
  };

  const downloadReceipt = (premium: Premium) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const receiptNo = premium.receiptNumber || "N/A";
    const amount = Number(premium.amount || 0).toLocaleString("en-IN");

    doc.setFillColor(4,78,57); doc.rect(0,0,210,40,"F");
    doc.setFillColor(8,139,80); doc.rect(0,40,210,2.5,"F");
    doc.setFillColor(255,255,255); doc.roundedRect(12,7,28,26,3,3,"F");
    if(receiptLogoDataUrl){
      try{doc.addImage(receiptLogoDataUrl,"JPEG",14,9,24,22,undefined,"FAST");}
      catch{doc.setTextColor(8,139,80);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("SL",26,23,{align:"center"});}
    }
    doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(19);doc.text("SecureLife Insurance",46,18);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text("DIGITAL POLICY SERVICES",46,25);
    doc.text("Trusted Protection for a Safer Tomorrow",46,30);
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("PREMIUM RECEIPT",195,16,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.text(receiptNo,195,23,{align:"right",maxWidth:60});

    doc.setDrawColor(8,139,80);doc.setLineWidth(.8);doc.rect(7,7,196,283);
    doc.setDrawColor(214,231,220);doc.setLineWidth(.25);doc.rect(10,46,190,241);
    doc.setTextColor(15,35,55);doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text("Premium Payment Receipt",15,58);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,116,139);doc.text("Official Customer Payment Acknowledgement",15,64);
    doc.setFillColor(225,248,235);doc.roundedRect(151,51,44,16,3,3,"F");
    doc.setTextColor(4,115,67);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text("PAID • VERIFIED",173,61,{align:"center"});

    doc.setFillColor(235,248,241);doc.roundedRect(15,75,180,10,2,2,"F");
    doc.setTextColor(4,100,67);doc.setFontSize(8.5);doc.text("PAYMENT DETAILS",20,81.5);
    const details:Array<[string,string]>=[
      ["Policyholder",premium.customerName||"Customer"],
      ["Policy Number",premium.policyNumber||"N/A"],
      ["Premium Amount",`INR ${amount}`],
      ["Payment Mode",premium.paymentMode||"N/A"],
      ["Payment Date",premium.paidDate||"N/A"],
      ["Receipt Number",receiptNo],
    ];
    let y=98;
    details.forEach(([label,value],i)=>{
      if(i%2===0){doc.setFillColor(249,252,250);doc.roundedRect(18,y-6.5,174,10,1.5,1.5,"F");}
      doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(100,116,139);doc.text(label,22,y);
      doc.setFont("helvetica","bold");doc.setTextColor(25,45,55);doc.text(String(value),78,y,{maxWidth:108});
      y+=13;
    });

    doc.setFillColor(232,249,239);doc.roundedRect(15,181,180,35,3,3,"F");
    doc.setTextColor(4,100,67);doc.setFont("helvetica","bold");doc.setFontSize(11.5);doc.text("PAYMENT SUCCESSFULLY VERIFIED",22,195);
    doc.setFont("helvetica","normal");doc.setFontSize(7.8);doc.setTextColor(55,90,75);
    doc.text(doc.splitTextToSize("This receipt confirms that the premium payment shown above has been recorded against this SecureLife policy.",160),22,204);

    doc.setFillColor(248,250,252);doc.roundedRect(15,226,180,27,2,2,"F");
    doc.setTextColor(51,65,85);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("IMPORTANT",20,235);
    doc.setFont("helvetica","normal");doc.setFontSize(7.3);doc.setTextColor(90,100,115);
    doc.text(doc.splitTextToSize("Please retain this receipt with your policy records. Policy benefits remain subject to the applicable policy terms and conditions. This is a system-generated receipt and does not require a physical signature.",165),20,242);

    doc.setDrawColor(214,231,220);doc.line(15,269,195,269);
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(4,100,67);doc.text("SECURELIFE INSURANCE",15,277);
    doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text("Digital Policy Services • Customer Copy",15,283);
    doc.text(receiptNo,195,277,{align:"right"});doc.text("Page 1 of 1",195,283,{align:"right"});
    doc.save(`${receiptNo}-Premium-Receipt.pdf`);
  };

  const totalCollected = premiums
    .filter((premium) => premium.status === "Paid")
    .reduce((sum, premium) => sum + premium.amount, 0);

  const dueAmount = premiums
    .filter((premium) => ["Upcoming","Due","Grace Period","Overdue"].includes(premium.status))
    .reduce((sum, premium) => sum + premium.amount, 0);

  return (
    <MainLayout
      title={isCustomer ? "Premiums & Payments" : "Premium Collection"}
      subtitle={isCustomer ? "View upcoming premiums and your payment history" : "Track upcoming, due, grace-period, paid and lapsed premium payments"}
    >
      {!isCustomer && <div className="admin-page-summary"><div><span className="eyebrow">COLLECTION OPERATIONS</span><h2>Premium collection workspace</h2><p>Track upcoming dues, paid premiums and overdue collections across active policies.</p></div><div className="admin-summary-metrics"><div><span>Records</span><strong>{premiums.length}</strong></div><div><span>Paid</span><strong>{premiums.filter((p) => p.status === "Paid").length}</strong></div><div><span>Overdue</span><strong>{premiums.filter((p) => p.status === "Overdue").length}</strong></div></div></div>}
      <div className={`cards ${!isCustomer ? "admin-kpi-grid" : ""}`}>
        <div className="card">
          <h3>Total Collected</h3>
          <h1>₹{Number(totalCollected || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Due Amount</h3>
          <h1>₹{Number(dueAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Paid Records</h3>
          <h1>{premiums.filter((p) => p.status === "Paid").length}</h1>
        </div>

        <div className="card">
          <h3>Total Records</h3>
          <h1>{premiums.length}</h1>
        </div>
      </div>

{!isCustomer && analytics && <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">COLLECTION ANALYTICS</span><h2>Premium Renewal Dashboard V3</h2><p className="section-copy">Collection performance, upcoming dues and renewal activity.</p></div><button className="mini-btn" onClick={()=>void loadAnalytics()}>Refresh analytics</button></div>
        <div className="cards admin-kpi-grid"><div className="card"><h3>This Month Due</h3><h1>₹{analytics.summary.thisMonthDueAmount.toLocaleString("en-IN")}</h1></div><div className="card"><h3>Collected</h3><h1>₹{analytics.summary.collectedAmount.toLocaleString("en-IN")}</h1></div><div className="card"><h3>Pending</h3><h1>₹{analytics.summary.pendingAmount.toLocaleString("en-IN")}</h1></div><div className="card"><h3>Collection %</h3><h1>{analytics.summary.collectionPercent}%</h1></div><div className="card"><h3>Grace Period</h3><h1>₹{analytics.summary.graceAmount.toLocaleString("en-IN")}</h1></div><div className="card"><h3>Lapsed</h3><h1>₹{analytics.summary.lapsedAmount.toLocaleString("en-IN")}</h1></div></div>
        <div style={{maxWidth:900,margin:"22px auto"}}><Bar data={{labels:analytics.months.map(x=>x.month),datasets:[{label:"Due",data:analytics.months.map(x=>x.due)},{label:"Collected",data:analytics.months.map(x=>x.collected)}]}} options={{responsive:true,plugins:{title:{display:true,text:"6-Month Premium Collection"}}}}/></div>
        <h3>Advisor-wise Renewal Performance</h3><div className="table-wrap"><table className="table"><thead><tr><th>Advisor</th><th>Code</th><th>Due</th><th>Collected</th><th>Pending</th><th>Collection %</th></tr></thead><tbody>{analytics.advisorPerformance.map(a=><tr key={a.advisorCode}><td>{a.advisorName}</td><td>{a.advisorCode}</td><td>₹{a.due.toLocaleString("en-IN")}</td><td>₹{a.collected.toLocaleString("en-IN")}</td><td>₹{a.pending.toLocaleString("en-IN")}</td><td>{a.collectionPercent}%</td></tr>)}</tbody></table></div>
        <div className="cards" style={{marginTop:18}}><div className="card"><h3>Today Collection List</h3><h1>{analytics.todayList.length}</h1><button className="mini-btn" disabled={!analytics.todayList.length} onClick={()=>downloadCollectionList("Today-Collection",analytics.todayList)}>Download Excel</button></div><div className="card"><h3>Next 7 Days Due</h3><h1>{analytics.next7Days.length}</h1><button className="mini-btn" disabled={!analytics.next7Days.length} onClick={()=>downloadCollectionList("Next-7-Days-Due",analytics.next7Days)}>Download Excel</button></div></div>
        <h3 style={{marginTop:22}}>Renewal Timeline</h3><div className="table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Policy</th><th>Due</th><th>Current Status</th><th>Activity Timeline</th></tr></thead><tbody>{analytics.timeline.map(t=><tr key={t.premiumId}><td>{t.customerName}</td><td>{t.policyNumber}</td><td>{t.dueDate}</td><td>{t.status}</td><td>{t.events.map((e,i)=><div key={i}><strong>{e.label}</strong> · {e.date}{e.remarks?` · ${e.remarks}`:""}</div>)}</td></tr>)}</tbody></table></div>
      </div>}

{!isCustomer && (
      <div className="section">
        <span className="eyebrow">NEW COLLECTION</span><h2>Add premium due</h2><p className="section-copy">Create a premium schedule entry for an existing customer policy.</p>
        <div className="form-grid">
          <input placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))} />
          <input placeholder="Policy Number" value={form.policyNumber} onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))} />
          <input placeholder="Amount" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <input type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          <select value={form.paymentMode} onChange={(e) => setForm((prev) => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}>
            <option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Net Banking">Net Banking</option>
          </select>
          <input placeholder="Receipt Number optional" value={form.receiptNumber} onChange={(e) => setForm((prev) => ({ ...prev, receiptNumber: e.target.value }))} />
        </div>
        <button className="btn small-btn" onClick={addPremium}>Add Premium</button>
      </div>
      )}

      {!isCustomer && <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">RENEWAL MANAGEMENT</span><h2>Status-wise premium renewal lists</h2><p className="section-copy">Open a status to view only those customers and download that exact list.</p></div><button className="mini-btn" onClick={()=>void loadRenewalReport()}>Refresh renewals</button></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}>
          {renewalStatuses.map(status=><button key={status} className={renewalTab===status?"btn small-btn":"mini-btn"} onClick={()=>setRenewalTab(status)}>{status} ({renewalRows.filter(r=>r.status===status).length})</button>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
          <strong>{renewalTab} Premiums</strong>
          <button className="mini-btn" disabled={!renewalRows.some(r=>r.status===renewalTab)} onClick={()=>downloadRenewalExcel(renewalTab)}>Download {renewalTab} Excel</button>
        </div>
        <div className="cards admin-kpi-grid" style={{marginBottom:14}}><div className="card"><h3>Today Follow-ups</h3><h1>{followupSummary.today}</h1></div><div className="card"><h3>Tomorrow</h3><h1>{followupSummary.tomorrow}</h1></div><div className="card"><h3>Missed</h3><h1>{followupSummary.missed}</h1></div><div className="card"><h3>Promise to Pay</h3><h1>{followupSummary.promiseToPay}</h1></div></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Mobile</th><th>Address</th><th>Policy No.</th><th>Plan</th><th>Premium</th><th>Due Date</th><th>Days</th><th>Advisor</th><th>Frequency</th><th>Follow-up</th></tr></thead>
        <tbody>{renewalRows.filter(r=>r.status===renewalTab).length===0?<tr><td colSpan={11}>No {renewalTab} premium records found.</td></tr>:renewalRows.filter(r=>r.status===renewalTab).map(r=><tr key={r.id}><td>{r.customerName||"-"}</td><td>{r.customerPhone||"-"}</td><td style={{minWidth:210,whiteSpace:"normal"}}>{r.address||"-"}</td><td>{r.policyNumber}</td><td>{r.planName||"-"}</td><td><strong>₹{Number(r.amount||0).toLocaleString("en-IN")}</strong></td><td>{r.dueDate}</td><td>{r.daysDifference>=0?`${r.daysDifference} remaining`:`${Math.abs(r.daysDifference)} overdue`}</td><td>{r.advisorName||"-"}<br/><small>{r.advisorCode}</small></td><td>{r.premiumFrequency||"-"}</td><td><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.customerPhone&&<a className="mini-btn" href={`tel:${r.customerPhone}`}>Call</a>}{r.customerPhone&&<a className="mini-btn" target="_blank" rel="noreferrer" href={`https://wa.me/91${r.customerPhone.replace(/\D/g,"").slice(-10)}?text=${encodeURIComponent(`SecureLife premium reminder: Policy ${r.policyNumber}, due ${r.dueDate}.`)}`}>WhatsApp</a>}<button className="mini-btn" onClick={()=>setFollowupRow(r)}>Add Follow-up</button></div></td></tr>)}</tbody></table></div>
        {followupRow&&<div className="section" style={{marginTop:14}}><h3>Follow-up: {followupRow.customerName} · {followupRow.policyNumber}</h3><div className="form-grid"><select value={followupStatus} onChange={e=>setFollowupStatus(e.target.value)}><option>Called</option><option>No Answer</option><option>Customer Will Pay</option><option>Payment Link Sent</option><option>Follow-up Later</option><option>Not Interested</option><option>Completed</option><option>Missed</option></select><input type="date" value={followupDate} onChange={e=>setFollowupDate(e.target.value)}/><input placeholder="Remarks" value={followupRemarks} onChange={e=>setFollowupRemarks(e.target.value)}/></div><div style={{display:"flex",gap:8}}><button className="btn small-btn" onClick={()=>void saveFollowup()}>Save Follow-up</button><button className="mini-btn" onClick={()=>setFollowupRow(null)}>Cancel</button></div></div>}
      </div>}

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">PAYMENT HISTORY</span><h2>{isCustomer ? "My Premiums" : "Premium register"}</h2></div>{isCustomer ? <span className="secure-chip">Receipts verified</span> : <span className="secure-chip">{premiums.length} records</span>}</div>

        <button className="mini-btn" onClick={loadPremiums}>
          Refresh
        </button>

        {loading ? (
          <SecureLifeLoader label="Loading premiums..." />
        ) : premiums.length === 0 ? (
          <p>No premium records found.</p>
        ) : (
          <div className={isCustomer ? "premium-table-wrap" : "table-wrap"}><table className={`table ${isCustomer ? "premium-table" : ""}`}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Mode</th>
                <th>Receipt</th>
                <th>Status</th>
                {isCustomer && <th>Payment / Receipt</th>}
                {!isCustomer && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {premiums.map((premium) => (
                <tr key={premium._id}>
                  <td>{premium.customerName}</td>
                  <td>{premium.policyNumber}</td>
                  <td><strong>₹{Number(premium.amount || 0).toLocaleString("en-IN")}</strong></td>
                  <td>{premium.dueDate}</td>
                  <td>{premium.paidDate || "-"}</td>
                  <td>{premium.paymentMode}</td>
                  <td>{premium.receiptNumber || "-"}</td>
                  <td>{isCustomer ? <span className={`status-pill ${premium.status === "Lapsed" || premium.status === "Overdue" ? "overdue" : premium.status === "Due" || premium.status === "Grace Period" ? "due" : "active"}`}>{premium.status}</span> : (
                    <select className="status-select" value={premium.status} onChange={(e) => updateStatus(premium._id, e.target.value as PremiumStatus)}>
                      <option value="Upcoming">Upcoming</option><option value="Due">Due</option><option value="Grace Period">Grace Period</option><option value="Overdue">Overdue</option><option value="Lapsed">Lapsed</option><option value="Paid">Paid</option>
                    </select>
                  )}</td>
                  {isCustomer && <td>{premium.status === "Paid" ? <button className="mini-btn" onClick={() => downloadReceipt(premium)}>Download Receipt</button> : premium.status === "Lapsed" ? <span className="status-pill overdue">Contact servicing</span> : <button className="btn small-btn" disabled={payingId === premium._id} onClick={() => payPremium(premium)}>{payingId === premium._id ? "Opening..." : `Pay ₹${Number(premium.amount || 0).toLocaleString("en-IN")}`}</button>}</td>}
                  {!isCustomer && <td><button className="mini-btn danger-btn" onClick={() => deletePremium(premium._id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}