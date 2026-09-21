import { useCallback, useEffect, useMemo, useState } from "react";
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

type PurchasedPlan = { _id:string; planName:string; policyNumber?:string; receiptNumber?:string; transactionId?:string; category:string; coverageAmount:number; yearlyPremium:number; paymentYears:number; totalPremiumPayable?:number; nextPremiumDate?:string; paymentStatus:string; policyStatus:string; startDate?:string; endDate?:string; proposal?: { customerName?:string; nomineeName?:string; nomineeRelation?:string; }; };

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
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}"); } catch { return {}; } }, []);
  const isCustomer = user.role === "customer" || !user.role;
  const purchasedPolicyNumbers = new Set(purchasedPlans.map((plan) => plan.policyNumber).filter(Boolean));
  const visiblePolicies = isCustomer ? policies.filter((policy) => !policy.policyNumber || !purchasedPolicyNumbers.has(policy.policyNumber)) : policies;

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
  }, [isCustomer]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const addPdfHeader = (doc: jsPDF, documentTitle: string, reference: string) => {
    doc.setFillColor(127, 29, 29);
    doc.rect(0, 0, 210, 34, "F");
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 34, 210, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SecureLife Insurance", 18, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Digital Policy Services", 18, 26);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(documentTitle, 18, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(reference, 18, 58);
    doc.setDrawColor(226, 232, 240);
    doc.line(18, 63, 192, 63);
  };

  const addPdfDetails = (doc: jsPDF, rows: Array<[string, string]>, startY = 74) => {
    let y = startY;
    rows.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(18, y - 6, 174, 10, 2, 2, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 22, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(String(value || "N/A"), 78, y, { maxWidth: 108 });
      y += 11;
    });
    return y;
  };

  const addPdfFooter = (doc: jsPDF, note: string, page = 1) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(18, 270, 192, 270);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(note, 18, 278, { maxWidth: 174 });
    doc.text(`SecureLife Insurance | Established 1990 | Page ${page}`, 18, 287);
  };

  const addPolicyTermsPage = (doc: jsPDF, plan: PurchasedPlan) => {
    doc.addPage();
    addPdfHeader(doc, "Policy Highlights & Terms", `Policy: ${plan.policyNumber || "N/A"}`);
    let y = 73;

    doc.setFillColor(255, 247, 237);
    doc.roundedRect(18, y - 7, 174, 28, 3, 3, "F");
    doc.setTextColor(154, 52, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("POLICY HIGHLIGHTS", 24, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Claim settlement ratio: 99.8% (company-stated)", 24, y + 8);
    doc.text("SecureLife Insurance - Established 1990", 24, y + 15);
    y += 35;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions", 18, y);
    y += 8;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Premium schedule: INR ${Number(plan.yearlyPremium || 0).toLocaleString("en-IN")} x ${plan.paymentYears || 1} year(s) = INR ${Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}`, 18, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Savings/maturity value is shown only when the selected plan has a defined maturity benefit; insurance cover is not treated as guaranteed savings.", 18, y, { maxWidth: 174 });
    y += 15;

    const terms = [
      "Coverage is subject to the selected plan benefits, limits, exclusions and the information accepted at proposal stage.",
      "The policy becomes active only after successful payment verification and policy issuance in the SecureLife customer portal.",
      "Claims must be submitted with the required supporting documents and are subject to policy terms, eligibility, exclusions and verification.",
      "Premium, coverage, payment term, nominee and validity shown on this certificate form part of the digital policy summary.",
      "Non-disclosure, misrepresentation, fraud or invalid documentation may affect claim assessment or policy benefits as permitted by applicable terms and law.",
      "Renewal, cancellation, refund, grace period and free-look benefits, where applicable, are governed by the issued plan terms and applicable requirements.",
      "This certificate is a digitally generated summary. Detailed plan wording and any applicable endorsements should be read together with this certificate.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    terms.forEach((term, index) => {
      const lines = doc.splitTextToSize(`${index + 1}. ${term}`, 168);
      doc.text(lines, 22, y);
      y += lines.length * 5 + 4;
    });

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(18, 226, 174, 28, 3, 3, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Customer support", 24, 237);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Use the Help & Support and Claims sections in your authenticated SecureLife portal.", 24, 245, { maxWidth: 160 });

    addPdfFooter(doc, "Policy terms should be read with the selected plan details and any applicable endorsements.", 2);
  };

  const downloadReceipt = (plan: PurchasedPlan) => {
    if (plan.paymentStatus !== "Paid" || !plan.receiptNumber) {
      alert("Payment receipt will be available after successful payment.");
      return;
    }
    const doc = new jsPDF();
    addPdfHeader(doc, "Premium Payment Receipt", `Receipt: ${plan.receiptNumber}`);
    addPdfDetails(doc, [
      ["Receipt Number", plan.receiptNumber || "N/A"],
      ["Policy Number", plan.policyNumber || "Processing"],
      ["Policyholder", plan.proposal?.customerName || user.name || "Customer"],
      ["Insurance Plan", plan.planName],
      ["Premium Paid", `INR ${Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}`],
      ["Transaction ID", plan.transactionId || "N/A"],
      ["Payment Status", plan.paymentStatus],
      ["Payment Date", plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"],
    ]);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(18, 174, 174, 22, 3, 3, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PAYMENT VERIFIED", 24, 187);
    addPdfFooter(doc, "This computer-generated receipt confirms the payment recorded against the policy shown above.");
    doc.save(`${plan.receiptNumber || "SecureLife-Receipt"}.pdf`);
  };

  const downloadCertificate = (plan: PurchasedPlan) => {
    if (plan.paymentStatus !== "Paid" || !plan.policyNumber) {
      alert("Policy certificate will be available after payment is verified and the policy number is issued.");
      return;
    }
    const doc = new jsPDF();
    addPdfHeader(doc, "Policy Certificate", `Policy: ${plan.policyNumber}`);
    const y = addPdfDetails(doc, [
      ["Policy Number", plan.policyNumber],
      ["Policyholder", plan.proposal?.customerName || user.name || "Customer"],
      ["Insurance Plan", plan.planName],
      ["Category", plan.category],
      ["Life / Benefit Cover", `INR ${Number(plan.coverageAmount || 0).toLocaleString("en-IN")}`],
      ["Annual Premium", `INR ${Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}`],
      ["Payment Term", `${plan.paymentYears || 1} year(s)`],
      ["Total Premium Payable", `INR ${Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}`],
      ["Next Premium Date", plan.nextPremiumDate ? new Date(plan.nextPremiumDate).toLocaleDateString("en-IN") : "No further premium due"],
      ["Policy Status", plan.policyStatus],
      ["Payment Status", plan.paymentStatus],
      ["Nominee", `${plan.proposal?.nomineeName || "N/A"}${plan.proposal?.nomineeRelation ? ` (${plan.proposal.nomineeRelation})` : ""}`],
      ["Start Date", plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"],
      ["Valid Until", plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"],
    ]);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(18, y + 2, 174, 24, 3, 3, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("POLICY ISSUED & PAYMENT VERIFIED", 24, y + 16);
    addPdfFooter(doc, "This digitally generated certificate summarizes the policy and verified payment information available in your SecureLife account.", 1);
    addPolicyTermsPage(doc, plan);
    doc.save(`${plan.policyNumber}-Policy-Certificate.pdf`);
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

      {isCustomer && purchasedPlans.length > 0 && <div className="section"><div className="section-heading-row"><div><span className="eyebrow">DIGITAL POLICIES</span><h2>My Active Cover</h2></div></div><div className="insurance-plan-grid">{purchasedPlans.map((plan) => <div className="insurance-plan-card policy-wallet-card" key={plan._id}><span className="plan-category">{plan.category}</span><h3>{plan.planName}</h3><p><b>Policy No:</b> {plan.policyNumber || "Processing"}</p><p><b>Coverage:</b> ₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</p><p><b>Yearly Premium:</b> ₹{Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}</p><p><b>Total Premium ({plan.paymentYears || 1} years):</b> ₹{Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}</p><p><b>Next Premium:</b> {plan.nextPremiumDate ? new Date(plan.nextPremiumDate).toLocaleDateString("en-IN") : "No further premium due"}</p><p><b>Validity:</b> {plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"} – {plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"}</p>{plan.proposal?.nomineeName && <div className="policy-proposal-mini"><span>Nominee</span><strong>{plan.proposal.nomineeName}</strong><small>{plan.proposal.nomineeRelation || ""}</small></div>}<div className="policy-wallet-status"><span className="status-pill active">● {plan.policyStatus}</span><span className="payment-verified">✓ {plan.paymentStatus}</span></div><div className="policy-document-actions">{plan.paymentStatus === "Paid" && plan.policyNumber ? <button className="btn small-btn" onClick={() => downloadCertificate(plan)}>Download policy certificate</button> : <span className="status-pill due">Certificate after payment</span>}{plan.paymentStatus === "Paid" && plan.receiptNumber && <button className="mini-btn" onClick={() => downloadReceipt(plan)}>Download receipt</button>}</div></div>)}</div></div>}

      <div className="section">
        <h2>{isCustomer ? "Other Assigned Policies" : "Policy List"}</h2>

        <button className="mini-btn" onClick={loadPolicies}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : visiblePolicies.length === 0 ? (
          <p>{isCustomer && purchasedPlans.length > 0 ? "All your current policies are shown in Digital Policies above." : "No policies found."}</p>
        ) : (
          <div className="lead-grid">
            {visiblePolicies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{policy.policyName}</h3>
                <div className="admin-detail-list"><p><span>Customer</span><strong>{policy.customerName || "N/A"}</strong></p>{!isCustomer && <p><span>Phone</span><strong>{policy.customerPhone || "N/A"}</strong></p>}<p><span>Policy No</span><strong>{policy.policyNumber}</strong></p><p><span>Premium</span><strong>₹{Number(policy.premiumAmount || 0).toLocaleString("en-IN")}</strong></p><p><span>Sum Assured</span><strong>₹{Number(policy.sumAssured || 0).toLocaleString("en-IN")}</strong></p><p><span>Mode</span><strong>{policy.paymentMode}</strong></p></div>

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