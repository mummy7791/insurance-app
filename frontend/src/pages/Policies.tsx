import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";

type Policy = {
  _id: string;
  customerName?: string;
  customerPhone?: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  sumAssured: number;
  paymentMode: "monthly" | "quarterly" | "half_yearly" | "yearly";
  status: "pending" | "active" | "rejected" | "closed" | "expired";
};

type PurchasedPlan = { _id:string; planName:string; policyNumber?:string; receiptNumber?:string; transactionId?:string; category:string; coverageAmount:number; yearlyPremium:number; paymentYears:number; paymentStatus:string; policyStatus:string; startDate?:string; endDate?:string; proposal?: { customerName?:string; customerEmail?:string; customerPhone?:string; address?:string; dateOfBirth?:string; panNumber?:string; nomineeName?:string; nomineeRelation?:string; nomineeDateOfBirth?:string; consentedAt?:string; }; };

type PolicyForm = {
  customerName: string;
  customerPhone: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: string;
  sumAssured: string;
  paymentMode: "monthly" | "quarterly" | "half_yearly" | "yearly";
};

const initialForm: PolicyForm = {
  customerName: "",
  customerPhone: "",
  policyName: "",
  policyNumber: "",
  premiumAmount: "",
  sumAssured: "",
  paymentMode: "monthly",
};

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasedPlans, setPurchasedPlans] = useState<PurchasedPlan[]>([]);
  const [form, setForm] = useState<PolicyForm>(initialForm);
  const user = JSON.parse(localStorage.getItem("insuranceUser") || "{}");
  const isCustomer = user.role === "customer" || !user.role;

  const loadPolicies = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const [res, purchaseRes] = await Promise.all([api.get<Policy[]>("/policies"), isCustomer ? api.get<PurchasedPlan[]>("/plan-purchases/my-plans") : Promise.resolve({ data: [] as PurchasedPlan[] })]);

      setTimeout(() => {
        setPolicies(res.data);
        setPurchasedPlans(purchaseRes.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Policies load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Policies load failed");
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const downloadCertificate = (plan: PurchasedPlan) => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("SecureLife Insurance", 20, 24);
    doc.setFontSize(13); doc.text("Policy Certificate & Payment Receipt", 20, 36);
    doc.setFontSize(11);
    const rows = [`Policy Number: ${plan.policyNumber || "Pending"}`, `Policyholder: ${plan.proposal?.customerName || user.name || "Customer"}`, `Plan: ${plan.planName}`, `Category: ${plan.category}`, `Coverage: INR ${Number(plan.coverageAmount || 0).toLocaleString("en-IN")}`, `Yearly Premium: INR ${Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}`, `Policy Status: ${plan.policyStatus}`, `Payment Status: ${plan.paymentStatus}`, `Receipt Number: ${plan.receiptNumber || "N/A"}`, `Transaction ID: ${plan.transactionId || "N/A"}`, `Nominee: ${plan.proposal?.nomineeName || "N/A"}${plan.proposal?.nomineeRelation ? ` (${plan.proposal.nomineeRelation})` : ""}`, `Start Date: ${plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"}`, `Valid Until: ${plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"}`];
    rows.forEach((row, i) => doc.text(row, 20, 54 + i * 9));
    doc.setFontSize(9); doc.text("This digitally generated document records the policy, nominee and verified payment details available in your SecureLife account.", 20, 180, { maxWidth: 170 });
    doc.save(`${plan.policyNumber || "SecureLife-Policy"}.pdf`);
  };

  const addPolicy = async () => {
    if (!form.policyName || !form.policyNumber || !form.premiumAmount) {
      alert("Policy Name, Policy Number, Premium required");
      return;
    }

    try {
      const res = await api.post<Policy>("/policies", {
        customerName: form.customerName || "N/A",
        customerPhone: form.customerPhone,
        policyName: form.policyName,
        policyNumber: form.policyNumber,
        premiumAmount: Number(form.premiumAmount),
        sumAssured: Number(form.sumAssured || 0),
        paymentMode: form.paymentMode,
      });

      setPolicies((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Add policy error:", error);
      alert("Policy add failed");
    }
  };

  const updateStatus = async (id: string, status: Policy["status"]) => {
    try {
      const res = await api.put<Policy>(`/policies/${id}`, {
        status,
      });

      setPolicies((prev) =>
        prev.map((policy) => (policy._id === id ? res.data : policy))
      );
    } catch (error) {
      console.error("Policy status update error:", error);
      alert("Status update failed");
    }
  };

  const deletePolicy = async (id: string) => {
    const ok = window.confirm("Delete this policy?");
    if (!ok) return;

    try {
      await api.delete(`/policies/${id}`);

      setPolicies((prev) => prev.filter((policy) => policy._id !== id));
    } catch (error) {
      console.error("Policy delete error:", error);
      alert("Policy delete failed");
    }
  };

  return (
    <MainLayout
      title="Policies"
      subtitle={isCustomer ? "View your policy coverage, premium and current status" : "Create and manage insurance policies"}
    >
{!isCustomer && (
      <div className="section">
        <h2>Add New Policy</h2>
        <div className="form-grid">
          <input placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))} />
          <input placeholder="Customer Phone" value={form.customerPhone} onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))} />
          <input placeholder="Policy Name" value={form.policyName} onChange={(e) => setForm((prev) => ({ ...prev, policyName: e.target.value }))} />
          <input placeholder="Policy Number" value={form.policyNumber} onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))} />
          <input placeholder="Premium Amount" value={form.premiumAmount} onChange={(e) => setForm((prev) => ({ ...prev, premiumAmount: e.target.value }))} />
          <input placeholder="Sum Assured" value={form.sumAssured} onChange={(e) => setForm((prev) => ({ ...prev, sumAssured: e.target.value }))} />
          <select value={form.paymentMode} onChange={(e) => setForm((prev) => ({ ...prev, paymentMode: e.target.value as PolicyForm["paymentMode"] }))}>
            <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half_yearly">Half Yearly</option><option value="yearly">Yearly</option>
          </select>
        </div>
        <button className="btn small-btn" onClick={addPolicy}>Add Policy</button>
      </div>
      )}

      {isCustomer && purchasedPlans.length > 0 && <div className="section"><div className="section-heading-row"><div><span className="eyebrow">DIGITAL POLICIES</span><h2>My Active Cover</h2></div></div><div className="insurance-plan-grid">{purchasedPlans.map((plan) => <div className="insurance-plan-card policy-wallet-card" key={plan._id}><span className="plan-category">{plan.category}</span><h3>{plan.planName}</h3><p><b>Policy No:</b> {plan.policyNumber || "Processing"}</p><p><b>Coverage:</b> ₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</p><p><b>Yearly Premium:</b> ₹{Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}</p><p><b>Validity:</b> {plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"} – {plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"}</p>{plan.proposal?.nomineeName && <div className="policy-proposal-mini"><span>Nominee</span><strong>{plan.proposal.nomineeName}</strong><small>{plan.proposal.nomineeRelation || ""}</small></div>}<div className="policy-wallet-status"><span className="status-pill active">● {plan.policyStatus}</span><span className="payment-verified">✓ {plan.paymentStatus}</span></div><div className="policy-document-actions"><button className="btn small-btn" onClick={() => downloadCertificate(plan)}>Download policy certificate</button>{plan.receiptNumber && <button className="mini-btn" onClick={() => downloadCertificate(plan)}>Download receipt</button>}</div></div>)}</div></div>}

      <div className="section">
        <h2>{isCustomer ? "Other Assigned Policies" : "Policy List"}</h2>

        <button className="mini-btn" onClick={loadPolicies}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : policies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <div className="lead-grid">
            {policies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{policy.policyName}</h3>
                <p>👤 Customer: {policy.customerName || "N/A"}</p>
                <p>📞 Phone: {policy.customerPhone || "N/A"}</p>
                <p>📄 Policy No: {policy.policyNumber}</p>
                <p>💰 Premium: ₹{policy.premiumAmount}</p>
                <p>🛡️ Sum Assured: ₹{policy.sumAssured}</p>
                <p>📆 Mode: {policy.paymentMode}</p>

                <span className="badge">{policy.status}</span>

{isCustomer ? (
                  <span className="status-pill active">{policy.status}</span>
                ) : (
                  <>
                    <select className="status-select" value={policy.status} onChange={(e) => updateStatus(policy._id, e.target.value as Policy["status"])}>
                      <option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="closed">Closed</option><option value="rejected">Rejected</option>
                    </select>
                    <button className="mini-btn danger-btn" onClick={() => deletePolicy(policy._id)}>Delete</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}