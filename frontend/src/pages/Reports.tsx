import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportCardData = {
  totalCustomers: number;
  totalPolicies: number;
  totalPremiums: number;
  totalClaims: number;
  totalEmployees: number;
  totalCommissions: number;
  paidPremiumAmount: number;
  duePremiumAmount: number;
  activePolicies: number;
  pendingClaims: number;
  paidCommissionAmount: number;
  pendingCommissionAmount: number;
};

type StatusReport = {
  _id: string;
  count: number;
  total?: number;
};

type RoleReport = {
  _id: string;
  count: number;
  total: number;
};

type MonthReport = {
  _id: string;
  count: number;
  total: number;
};

type BusinessRow = {
  id:string; customerName:string; customerPhone:string; customerEmail:string; address:string;
  policyNumber:string; planName:string; category:string; coverageAmount:number; yearlyPremium:number;
  paymentStatus:string; policyStatus:string; advisorName:string; advisorCode:string;
  purchaseDate:string; nextPremiumDate?:string|null; premiumFrequency:string; paymentYears:number; policyTermYears:number;
};

type ReportsResponse = {
  cards: ReportCardData;
  premiumByStatus: StatusReport[];
  claimsByStatus: StatusReport[];
  policiesByStatus: StatusReport[];
  commissionByRole: RoleReport[];
  premiumByMonth: MonthReport[];
};

const emptyCards: ReportCardData = {
  totalCustomers: 0,
  totalPolicies: 0,
  totalPremiums: 0,
  totalClaims: 0,
  totalEmployees: 0,
  totalCommissions: 0,
  paidPremiumAmount: 0,
  duePremiumAmount: 0,
  activePolicies: 0,
  pendingClaims: 0,
  paidCommissionAmount: 0,
  pendingCommissionAmount: 0,
};

export default function Reports() {
  const [data, setData] = useState<ReportsResponse>({
    cards: emptyCards,
    premiumByStatus: [],
    claimsByStatus: [],
    policiesByStatus: [],
    commissionByRole: [],
    premiumByMonth: [],
  });

  const [loading, setLoading] = useState(false);
  const [business,setBusiness]=useState<BusinessRow[]>([]);
  const [filters,setFilters]=useState({from:"",to:"",plan:"",advisor:"",status:""});
  const money=(n:number)=>"₹"+Number(n||0).toLocaleString("en-IN");
  const date=(v?:string|null)=>v?new Date(v).toLocaleDateString("en-IN"):"-";

  const loadBusiness=useCallback(async()=>{
    try{
      const params=new URLSearchParams();
      Object.entries(filters).forEach(([k,v])=>{if(v)params.set(k,v);});
      const res=await api.get<{rows:BusinessRow[]}>(`/reports/business?${params.toString()}`);
      setBusiness(Array.isArray(res.data.rows)?res.data.rows:[]);
    }catch(error){console.error("Business report load error:",error);alert("Business report load failed");}
  },[filters]);

  const csvCell=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
  const downloadExcel=()=>{
    const headers=["Customer Name","Mobile Number","Email","Address","Policy Number","Plan Name","Category","Coverage Amount","Yearly Premium","Payment Status","Policy Status","Advisor Name","Advisor Code","Purchase Date","Next Premium Due","Frequency","Payment Years","Policy Term"];
    const lines=[headers.map(csvCell).join(","),...business.map(r=>[r.customerName,r.customerPhone,r.customerEmail,r.address,r.policyNumber,r.planName,r.category,r.coverageAmount,r.yearlyPremium,r.paymentStatus,r.policyStatus,r.advisorName,r.advisorCode,date(r.purchaseDate),date(r.nextPremiumDate),r.premiumFrequency,r.paymentYears,r.policyTermYears].map(csvCell).join(","))];
    const blob=new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`SecureLife-business-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };
  const downloadPdf=()=>{
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("SecureLife Insurance - Business Report",14,15);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text(`Generated: ${new Date().toLocaleString("en-IN")} | Records: ${business.length}`,14,21);
    autoTable(doc,{startY:27,styles:{fontSize:6,cellPadding:1.5,overflow:"linebreak"},head:[["Customer","Mobile","Address","Policy No.","Plan","Cover","Premium","Payment","Policy","Advisor","Purchase","Next Due"]],body:business.map(r=>[r.customerName,r.customerPhone,r.address,r.policyNumber||"-",r.planName,money(r.coverageAmount),money(r.yearlyPremium),r.paymentStatus,r.policyStatus,[r.advisorName,r.advisorCode].filter(Boolean).join(" / ")||"-",date(r.purchaseDate),date(r.nextPremiumDate)]),columnStyles:{2:{cellWidth:38},3:{cellWidth:29},4:{cellWidth:27}}});
    doc.save(`SecureLife-business-report-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const loadReports = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<ReportsResponse>("/reports");

      setTimeout(() => {
        setData(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Reports load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Reports load failed");
    }
  }, []);

  useEffect(() => {
    void loadReports();
    void loadBusiness();
  }, [loadReports, loadBusiness]);

  return (
    <MainLayout
      title="Reports & Analytics"
      subtitle="Live MongoDB reports for customers, policies, premiums, claims and commission"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">BUSINESS INTELLIGENCE</span><h2>Insurance performance reports</h2><p>Track policy, premium, claims and commission performance from live operational data.</p></div><button className="mini-btn" onClick={loadReports}>Refresh reports</button></div>

      {loading && <div className="dashboard-loading"><span className="checkout-spinner" />Refreshing business reports...</div>}

      <div className="cards admin-report-grid">
        <div className="card">
          <h3>Total Customers</h3>
          <h1>{data.cards.totalCustomers}</h1>
        </div>

        <div className="card">
          <h3>Total Policies</h3>
          <h1>{data.cards.totalPolicies}</h1>
        </div>

        <div className="card">
          <h3>Total Premium Records</h3>
          <h1>{data.cards.totalPremiums}</h1>
        </div>

        <div className="card">
          <h3>Total Claims</h3>
          <h1>{data.cards.totalClaims}</h1>
        </div>

        <div className="card">
          <h3>Total Employees</h3>
          <h1>{data.cards.totalEmployees}</h1>
        </div>

        <div className="card">
          <h3>Total Commissions</h3>
          <h1>{data.cards.totalCommissions}</h1>
        </div>

        <div className="card">
          <h3>Paid Premium</h3>
          <h1>₹{Number(data.cards.paidPremiumAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Due Premium</h3>
          <h1>₹{Number(data.cards.duePremiumAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Active Policies</h3>
          <h1>{data.cards.activePolicies}</h1>
        </div>

        <div className="card">
          <h3>Pending Claims</h3>
          <h1>{data.cards.pendingClaims}</h1>
        </div>

        <div className="card">
          <h3>Paid Commission</h3>
          <h1>₹{Number(data.cards.paidCommissionAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Pending Commission</h3>
          <h1>₹{Number(data.cards.pendingCommissionAmount || 0).toLocaleString("en-IN")}</h1>
        </div>
      </div>

      <div className="section">
        <div className="admin-page-summary"><div><span className="eyebrow">CUSTOMER BUSINESS</span><h2>Detailed policy business report</h2><p>Filter records and download customer name, mobile number, address and complete policy business details.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="mini-btn" onClick={downloadPdf} disabled={!business.length}>Download PDF</button><button className="mini-btn" onClick={downloadExcel} disabled={!business.length}>Download Excel</button></div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
          <input type="date" value={filters.from} onChange={e=>setFilters(p=>({...p,from:e.target.value}))} title="From date"/>
          <input type="date" value={filters.to} onChange={e=>setFilters(p=>({...p,to:e.target.value}))} title="To date"/>
          <input placeholder="Plan name" value={filters.plan} onChange={e=>setFilters(p=>({...p,plan:e.target.value}))}/>
          <input placeholder="Advisor code" value={filters.advisor} onChange={e=>setFilters(p=>({...p,advisor:e.target.value}))}/>
          <select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}><option value="">All policy status</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Cancelled">Cancelled</option></select>
          <button className="mini-btn" onClick={()=>void loadBusiness()}>Apply Filters</button>
        </div>
        <p><strong>{business.length}</strong> business records</p>
        <div style={{overflowX:"auto"}}>
          <table className="table"><thead><tr><th>Customer</th><th>Mobile</th><th>Address</th><th>Policy No.</th><th>Plan</th><th>Coverage</th><th>Premium</th><th>Payment</th><th>Policy</th><th>Advisor</th><th>Purchase Date</th><th>Next Due</th></tr></thead>
          <tbody>{business.length===0?<tr><td colSpan={12}>No business records found.</td></tr>:business.map(r=><tr key={r.id}><td><strong>{r.customerName||"-"}</strong><br/><small>{r.customerEmail}</small></td><td>{r.customerPhone||"-"}</td><td style={{minWidth:220,whiteSpace:"normal"}}>{r.address||"-"}</td><td>{r.policyNumber||"-"}</td><td>{r.planName}</td><td>{money(r.coverageAmount)}</td><td>{money(r.yearlyPremium)}</td><td>{r.paymentStatus}</td><td>{r.policyStatus}</td><td>{r.advisorName||"-"}<br/><small>{r.advisorCode}</small></td><td>{date(r.purchaseDate)}</td><td>{date(r.nextPremiumDate)}</td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="section">
        <h2>Premium Status Report</h2>

        {data.premiumByStatus.length === 0 ? (
          <p>No premium data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Records</th>
                <th>Total Amount</th>
              </tr>
            </thead>

            <tbody>
              {data.premiumByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Claims Status Report</h2>

        {data.claimsByStatus.length === 0 ? (
          <p>No claims data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Claims</th>
                <th>Total Claim Amount</th>
              </tr>
            </thead>

            <tbody>
              {data.claimsByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Policy Status Report</h2>

        {data.policiesByStatus.length === 0 ? (
          <p>No policy data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Policies</th>
              </tr>
            </thead>

            <tbody>
              {data.policiesByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Commission By Role</h2>

        {data.commissionByRole.length === 0 ? (
          <p>No commission data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Records</th>
                <th>Total Commission</th>
              </tr>
            </thead>

            <tbody>
              {data.commissionByRole.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Premium By Month</h2>

        {data.premiumByMonth.length === 0 ? (
          <p>No monthly premium data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Records</th>
                <th>Total Premium</th>
              </tr>
            </thead>

            <tbody>
              {data.premiumByMonth.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}