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
  kycStatus?: "Pending" | "Verified" | "Action Required";
  kycVerifiedAt?: string;
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
    doc.text(`SecureLife Insurance | Digital Policy Services | Page ${page}`, 18, 287);
  };

  const addBondHeader = (doc: jsPDF, title: string, policyNo: string) => {
    doc.setDrawColor(136, 19, 55); doc.setLineWidth(1.4); doc.rect(7, 7, 196, 283);
    doc.setDrawColor(245, 130, 32); doc.setLineWidth(.35); doc.rect(10, 10, 190, 277);
    doc.setTextColor(136, 19, 55); doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.text("SecureLife Insurance", 105, 18, {align:"center"});
    doc.setFontSize(7.5); doc.setTextColor(71,85,105); doc.text("DIGITAL POLICY DOCUMENT",105,24,{align:"center"});
    doc.setDrawColor(136,19,55); doc.line(15,29,195,29);
    doc.setFontSize(14); doc.setTextColor(30,41,59); doc.text(title,15,39);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(100,116,139); doc.text(`Policy No: ${policyNo}`,195,39,{align:"right"});
  };
  const bondSection=(doc:jsPDF,title:string,y:number)=>{doc.setFillColor(248,250,252);doc.rect(15,y,180,9,"F");doc.setTextColor(136,19,55);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(title.toUpperCase(),19,y+6);return y+15;};
  const bondRows=(doc:jsPDF,rows:Array<[string,string]>,y:number)=>{doc.setFontSize(8.5);rows.forEach(([l,v],i)=>{doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text(l,19,y);doc.setFont("helvetica","bold");doc.setTextColor(30,41,59);doc.text(String(v||"N/A"),78,y,{maxWidth:112});y+=8;if(i%2===1){doc.setDrawColor(241,245,249);doc.line(19,y-4,191,y-4);}});return y;};
  const bondFooter=(doc:jsPDF,policyNo:string)=>{doc.setDrawColor(226,232,240);doc.line(15,276,195,276);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(100,116,139);doc.text("SecureLife Insurance | Digitally generated policy document",15,282);doc.text(policyNo,195,282,{align:"right"});};

  const addPolicyTermsPage = (doc: jsPDF, plan: PurchasedPlan) => {
    doc.addPage(); addBondHeader(doc,"Policy Terms & Conditions",plan.policyNumber||"N/A"); let y=49;
    y=bondSection(doc,"Important Policy Information",y);
    const terms=[
      "Coverage and benefits are governed by the issued policy schedule, accepted proposal details, exclusions and applicable endorsements.",
      "The policy remains active subject to successful premium payments in accordance with the premium payment schedule shown in this document.",
      "Claims are subject to eligibility, policy conditions, exclusions, required supporting documents and verification.",
      "Nominee details, policy term, premium payment term, coverage and validity should be checked by the policyholder after issue.",
      "Renewal, grace period, cancellation, refund and free-look provisions, where applicable, are governed by the selected plan terms.",
      "Non-disclosure, misrepresentation, fraud or invalid documentation may affect benefits or claim assessment as permitted by applicable terms and law.",
      "This digitally generated policy document should be read together with any plan-specific wording and endorsements available through SecureLife."
    ];
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(30,41,59);
    terms.forEach((t,i)=>{const lines=doc.splitTextToSize(`${i+1}. ${t}`,168);doc.text(lines,20,y);y+=lines.length*4.4+4;});
    y=bondSection(doc,"Premium Summary",y+3);
    y=bondRows(doc,[["Annual Premium",`INR ${Number(plan.yearlyPremium||0).toLocaleString("en-IN")}`],["Premium Payment Term",`${plan.paymentYears||1} year(s)`],["Total Premium Payable",`INR ${Number(plan.totalPremiumPayable||(plan.yearlyPremium*(plan.paymentYears||1))).toLocaleString("en-IN")}`],["Next Premium Due",plan.nextPremiumDate?new Date(plan.nextPremiumDate).toLocaleDateString("en-IN"):"No further premium due"]],y);
    doc.setFillColor(255,247,237);doc.roundedRect(15,226,180,32,2,2,"F");doc.setTextColor(154,52,18);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text("POLICYHOLDER NOTE",20,237);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text(doc.splitTextToSize("Please review the policy schedule, nominee details, premium dates and coverage. Use the authenticated SecureLife portal for servicing, claims and current policy status.",166),20,245);
    bondFooter(doc,plan.policyNumber||"N/A");
  };

  const addPolicySchedulePage = (doc:jsPDF,plan:PurchasedPlan) => {
    doc.addPage();addBondHeader(doc,"Policy Schedule",plan.policyNumber||"N/A");let y=49;
    y=bondSection(doc,"Policy & Premium Schedule",y);
    const years=Math.max(1,Number(plan.paymentYears||1));doc.setFillColor(248,250,252);doc.rect(19,y,172,8,"F");doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(51,65,85);doc.text("POLICY YEAR",22,y+5);doc.text("PREMIUM",72,y+5);doc.text("PAYMENT STATUS",122,y+5);y+=13;
    for(let i=1;i<=years;i++){doc.setFont("helvetica","normal");doc.setTextColor(30,41,59);doc.text(String(i),22,y);doc.text(`INR ${Number(plan.yearlyPremium||0).toLocaleString("en-IN")}`,72,y);doc.text(i===1&&plan.paymentStatus==="Paid"?"Paid":"Scheduled",122,y);y+=8;if(y>265)break;}
    bondFooter(doc,plan.policyNumber||"N/A");
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
    if (plan.paymentStatus !== "Paid" || !plan.policyNumber) { alert("Policy bond will be available after payment is verified and the policy number is issued."); return; }
    const doc=new jsPDF();addBondHeader(doc,"Policy Bond / Policy Schedule",plan.policyNumber);let y=49;
    y=bondSection(doc,"Policyholder & Policy Details",y);
    y=bondRows(doc,[["Policyholder",plan.proposal?.customerName||user.name||"Customer"],["Policy Number",plan.policyNumber],["Plan Name",plan.planName],["Product Category",plan.category],["Policy Status",plan.policyStatus],["Payment Status",plan.paymentStatus]],y);
    y=bondSection(doc,"Insurance Benefits",y+2);
    y=bondRows(doc,[["Life / Benefit Cover",`INR ${Number(plan.coverageAmount||0).toLocaleString("en-IN")}`],["Annual Premium",`INR ${Number(plan.yearlyPremium||0).toLocaleString("en-IN")}`],["Premium Payment Term",`${plan.paymentYears||1} year(s)`],["Total Premium Payable",`INR ${Number(plan.totalPremiumPayable||(plan.yearlyPremium*(plan.paymentYears||1))).toLocaleString("en-IN")}`]],y);
    y=bondSection(doc,"Nominee & Validity",y+2);
    y=bondRows(doc,[["Nominee",plan.proposal?.nomineeName||"N/A"],["Relationship",plan.proposal?.nomineeRelation||"N/A"],["Commencement Date",plan.startDate?new Date(plan.startDate).toLocaleDateString("en-IN"):"N/A"],["Policy Valid Until",plan.endDate?new Date(plan.endDate).toLocaleDateString("en-IN"):"N/A"],["Next Premium Due",plan.nextPremiumDate?new Date(plan.nextPremiumDate).toLocaleDateString("en-IN"):"No further premium due"]],y);
    doc.setFillColor(236,253,245);doc.roundedRect(15,230,180,25,2,2,"F");doc.setTextColor(22,101,52);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("POLICY ISSUED - PAYMENT VERIFIED",20,241);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text("This document is generated from the policy information recorded in your SecureLife account.",20,249,{maxWidth:165});
    bondFooter(doc,plan.policyNumber);addPolicySchedulePage(doc,plan);addPolicyTermsPage(doc,plan);
    doc.save(`${plan.policyNumber}-SecureLife-Policy-Bond.pdf`);
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

      {isCustomer && purchasedPlans.length > 0 && <div className="section"><div className="section-heading-row"><div><span className="eyebrow">DIGITAL POLICIES</span><h2>My Active Cover</h2></div></div><div className="insurance-plan-grid">{purchasedPlans.map((plan) => <div className="insurance-plan-card policy-wallet-card" key={plan._id}><span className="plan-category">{plan.category}</span><h3>{plan.planName}</h3><p><b>Policy No:</b> {plan.policyNumber || "Processing"}</p><p><b>Coverage:</b> ₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</p><p><b>Yearly Premium:</b> ₹{Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}</p><p><b>Total Premium ({plan.paymentYears || 1} years):</b> ₹{Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}</p><p><b>Next Premium:</b> {plan.nextPremiumDate ? new Date(plan.nextPremiumDate).toLocaleDateString("en-IN") : "No further premium due"}</p><p><b>Validity:</b> {plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"} – {plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"}</p>{plan.proposal?.nomineeName && <div className="policy-proposal-mini"><span>Nominee</span><strong>{plan.proposal.nomineeName}</strong><small>{plan.proposal.nomineeRelation || ""}</small></div>}<div className="policy-wallet-status"><span className="status-pill active">● {plan.policyStatus}</span><span className="payment-verified">✓ {plan.paymentStatus}</span></div><div className="policy-document-actions">{plan.paymentStatus === "Paid" && plan.policyNumber ? <button className="policy-download-btn primary" onClick={() => downloadCertificate(plan)}>Download Policy</button> : <span className="status-pill due">Certificate after payment</span>}{plan.paymentStatus === "Paid" && plan.receiptNumber && <button className="policy-download-btn secondary" onClick={() => downloadReceipt(plan)}>Download Receipt</button>}</div></div>)}</div></div>}

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

                <span className="badge">{policy.status}</span><span className={`status-pill ${policy.kycStatus === "Verified" ? "active" : policy.kycStatus === "Action Required" ? "overdue" : "due"}`}>KYC: {policy.kycStatus || "Pending"}</span>

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