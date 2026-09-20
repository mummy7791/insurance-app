import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type PolicyPurchase = {
  _id: string; policyName: string; policyNumber: string; premiumAmount: number; paidAmount: number;
  sumAssured: number; paymentMode: string; paymentStatus: string; status: string; transactionId?: string;
  customerName: string; customerEmail: string; customerPhone: string; createdAt?: string;
};

export default function PolicyPurchases() {
  const [purchases, setPurchases] = useState<PolicyPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<PolicyPurchase[]>("/policy-purchases");
      setPurchases(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Policy purchases load error:", error);
      alert("Policy purchases load failed");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadPurchases(), 0); return () => window.clearTimeout(timer); }, [loadPurchases]);

  const filtered = useMemo(() => purchases.filter((item) =>
    `${item.customerName} ${item.customerEmail} ${item.customerPhone} ${item.policyName} ${item.policyNumber} ${item.transactionId || ""} ${item.status} ${item.paymentStatus}`.toLowerCase().includes(search.toLowerCase())
  ), [purchases, search]);

  const totalPaid = purchases.reduce((sum, item) => sum + Number(item.paidAmount || item.premiumAmount || 0), 0);
  const activeCount = purchases.filter((item) => String(item.status).toLowerCase() === "active").length;
  const paidCount = purchases.filter((item) => String(item.paymentStatus).toLowerCase() === "paid").length;

  return (
    <MainLayout title="Policy Purchases" subtitle="Monitor customer purchases, payment references and active cover">
      <div className="admin-page-summary"><div><span className="eyebrow">POLICY OPERATIONS</span><h2>Purchase & payment register</h2><p>Review issued policies and payment activity without exposing proposal KYC data.</p></div><div className="admin-summary-metrics"><div><span>Purchases</span><strong>{purchases.length}</strong></div><div><span>Active</span><strong>{activeCount}</strong></div><div><span>Paid</span><strong>{paidCount}</strong></div></div></div>
      <div className="cards admin-kpi-grid">
        <div className="card"><h3>Total Purchases</h3><h1>{purchases.length}</h1></div>
        <div className="card"><h3>Premium Collected</h3><h1>₹{totalPaid.toLocaleString("en-IN")}</h1></div>
        <div className="card"><h3>Active Policies</h3><h1>{activeCount}</h1></div>
        <div className="card"><h3>Paid Transactions</h3><h1>{paidCount}</h1></div>
      </div>
      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">TRANSACTION REGISTER</span><h2>Customer purchased policies</h2></div><button className="mini-btn" onClick={() => void loadPurchases()}>Refresh</button></div>
        <div className="admin-search-bar"><input placeholder="Search customer, policy, transaction or status" value={search} onChange={(e) => setSearch(e.target.value)} /><span>{filtered.length} records</span></div>
        {loading ? <div className="dashboard-loading"><span className="checkout-spinner" />Loading purchases...</div> : filtered.length === 0 ? <div className="admin-empty-state"><strong>No purchases found</strong><span>New customer policy purchases will appear here.</span></div> : (
          <div className="admin-record-grid">{filtered.map((item) => <article className="admin-record-card" key={item._id}>
            <div className="admin-record-head"><div><span className="eyebrow">{item.paymentStatus || "Payment"}</span><h3>{item.policyName || "Insurance Policy"}</h3><small>{item.policyNumber || "Policy number pending"}</small></div><span className={`status-pill ${String(item.status).toLowerCase() === "active" ? "active" : "due"}`}>{item.status || "Pending"}</span></div>
            <div className="admin-money-row"><div><span>Premium paid</span><strong>₹{Number(item.paidAmount || item.premiumAmount || 0).toLocaleString("en-IN")}</strong></div><div><span>Sum assured</span><strong>₹{Number(item.sumAssured || 0).toLocaleString("en-IN")}</strong></div></div>
            <div className="admin-detail-list"><p><span>Customer</span><strong>{item.customerName || "N/A"}</strong></p><p><span>Email</span><strong>{item.customerEmail || "N/A"}</strong></p><p><span>Phone</span><strong>{item.customerPhone || "N/A"}</strong></p><p><span>Payment mode</span><strong>{item.paymentMode || "N/A"}</strong></p><p><span>Transaction</span><strong className="mono-value">{item.transactionId || "N/A"}</strong></p><p><span>Purchase date</span><strong>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "N/A"}</strong></p></div>
          </article>)}</div>
        )}
      </div>
    </MainLayout>
  );
}