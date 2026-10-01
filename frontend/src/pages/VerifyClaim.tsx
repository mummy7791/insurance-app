import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

type Verification = {
  verified: boolean;
  receiptNo?: string;
  verificationCode?: string;
  customerName?: string;
  policyNumber?: string;
  claimNumber?: string;
  claimType?: string;
  claimAmount?: number;
  settlementAmount?: number;
  settlementDate?: string;
  settlementReference?: string;
  status?: string;
  message?: string;
};

export default function VerifyClaim() {
  const [params] = useSearchParams();
  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const claim = params.get("claim") || "";
  const code = params.get("code") || "";

  useEffect(() => {
    if (!claim || !code) { setData({ verified: false, message: "Missing receipt verification details." }); setLoading(false); return; }
    api.get<Verification>(`/claims/verify/${encodeURIComponent(claim)}?code=${encodeURIComponent(code)}`)
      .then((res) => setData(res.data))
      .catch((error) => setData(error.response?.data || { verified: false, message: "Receipt could not be verified." }))
      .finally(() => setLoading(false));
  }, [claim, code]);

  const money = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return <main className="claim-verify-page">
    <section className="claim-verify-card">
      <header className="claim-verify-header">
        <div style={{fontSize:24,fontWeight:800}}>SecureLife Insurance</div>
        <div style={{fontSize:12,marginTop:5,opacity:.85}}>CLAIMS & SETTLEMENT SERVICES · RECEIPT VERIFICATION</div>
      </header>
      <div className="claim-verify-body">
        {loading ? <h2>Verifying receipt…</h2> : data?.verified ? <>
          <div style={{display:"inline-block",padding:"9px 16px",borderRadius:999,background:"#ecfdf5",color:"#047857",fontWeight:800}}>✓ VERIFIED SETTLEMENT RECEIPT</div>
          <h1 style={{margin:"20px 0 8px",color:"#111827"}}>Document verified</h1>
          <p style={{color:"#64748b"}}>This settlement record matches the receipt stored in the SecureLife system.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:28}}>
            {[
              ["Receipt No",data.receiptNo],["Verification Code",data.verificationCode],
              ["Customer",data.customerName],["Policy No",data.policyNumber],
              ["Claim No",data.claimNumber],["Claim Type",data.claimType],
              ["Claim Amount",money(data.claimAmount)],["Settlement Amount",money(data.settlementAmount)],
              ["Settlement Date",data.settlementDate],["Transaction / Ref",data.settlementReference],
            ].map(([label,value])=><div key={String(label)} style={{background:"#f8fafc",borderRadius:12,padding:15}}><small style={{color:"#64748b",fontWeight:700}}>{label}</small><div style={{marginTop:6,fontWeight:750,color:"#0f172a",wordBreak:"break-word"}}>{value || "-"}</div></div>)}
          </div>
          <p style={{marginTop:28,fontSize:12,color:"#64748b"}}>System verification only. Keep the original settlement receipt with your policy records.</p>
        </> : <>
          <div style={{display:"inline-block",padding:"9px 16px",borderRadius:999,background:"#fff1f2",color:"#be123c",fontWeight:800}}>NOT VERIFIED</div>
          <h1 style={{color:"#111827"}}>Receipt verification failed</h1>
          <p style={{color:"#64748b"}}>{data?.message || "The receipt details do not match a settled claim record."}</p>
        </>}
      <div className="claim-verify-actions"><Link to="/" className="mini-btn">SecureLife Home</Link><Link to="/login" className="btn small-btn">Customer Login</Link></div></div>
    </section>
  </main>;
}
