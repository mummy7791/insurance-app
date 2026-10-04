import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";
import SecureLifeLoader from "../components/SecureLifeLoader";

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

type PurchasedPlan = { _id:string; policyTermYears?:number; entryAge?:number; coverTillAge?:number; premiumFrequency?:string; benefitType?:string; benefitSchedule?:Array<{policyYear:number;amount:number;type:string}>; maturityAmount?:number; deathBenefit?:number; premiumProgress?:{paidCount:number;remainingCount:number;paidAmount:number;premiums:Array<{_id:string;amount:number;dueDate:string;paidDate?:string;status:string;receiptNumber?:string}>}; createdAt?:string; planName:string; policyNumber?:string; receiptNumber?:string; transactionId?:string; category:string; coverageAmount:number; yearlyPremium:number; paymentYears:number; totalPremiumPayable?:number; nextPremiumDate?:string; paymentStatus:string; policyStatus:string; startDate?:string; endDate?:string; proposal?: { customerName?:string; nomineeName?:string; nomineeRelation?:string; }; };

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
  const [loadError, setLoadError] = useState("");
  const [purchasedPlans, setPurchasedPlans] = useState<PurchasedPlan[]>([]);
  const [form, setForm] = useState<PolicyForm>(initialForm);
  const [journeyPlan,setJourneyPlan]=useState<PurchasedPlan|null>(null);
  const [policyLogoDataUrl,setPolicyLogoDataUrl]=useState("");
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}"); } catch { return {}; } }, []);
  const isCustomer = user.role === "customer" || !user.role;
  const activePurchasedPlans = purchasedPlans.filter((plan) => String(plan.policyStatus).toLowerCase() === "active" && String(plan.paymentStatus).toLowerCase() === "paid");
  const pendingPurchasedPlans = purchasedPlans.filter((plan) => !(String(plan.policyStatus).toLowerCase() === "active" && String(plan.paymentStatus).toLowerCase() === "paid"));
  const purchaseStatusClass = (plan: PurchasedPlan) => {
    const payment = String(plan.paymentStatus || "").toLowerCase();
    if (payment === "failed") return "failed";
    if (payment === "pending") return "pending";
    return "processing";
  };
  const purchasedPolicyNumbers = new Set(purchasedPlans.map((plan) => plan.policyNumber).filter(Boolean));
  const visiblePolicies = isCustomer ? policies.filter((policy) => !policy.policyNumber || !purchasedPolicyNumbers.has(policy.policyNumber)) : policies;

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const policyRequest = api.get<Policy[]>("/policies");
      const purchaseRequest = isCustomer
        ? api.get<PurchasedPlan[]>("/plan-purchases/my-plans")
        : Promise.resolve({ data: [] as PurchasedPlan[] });

      const [policyResult, purchaseResult] = await Promise.allSettled([policyRequest, purchaseRequest]);
      let loaded = false;

      if (policyResult.status === "fulfilled") {
        setPolicies(policyResult.value.data);
        loaded = true;
      } else {
        console.error("Policies load error:", policyResult.reason);
      }

      if (purchaseResult.status === "fulfilled") {
        setPurchasedPlans(purchaseResult.value.data);
        loaded = true;
      } else {
        console.error("Purchased plans load error:", purchaseResult.reason);
      }

      if (!loaded) {
        setLoadError("Policies could not be loaded. Please retry.");
      } else if (policyResult.status === "rejected" || purchaseResult.status === "rejected") {
        setLoadError("Some policy information is still loading. Retry to refresh the missing details.");
      }
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    let cancelled = false;
    fetch("/securelife-logo.jpg").then((response) => response.blob()).then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => { if (!cancelled) setPolicyLogoDataUrl(String(reader.result || "")); };
      reader.readAsDataURL(blob);
    }).catch((error) => console.warn("Policy logo load failed:", error));
    return () => { cancelled = true; };
  }, []);

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
    // Premium SecureLife corporate policy-bond masthead.
    doc.setFillColor(4, 78, 57); doc.rect(0, 0, 210, 35, "F");
    doc.setFillColor(8, 139, 80); doc.rect(0, 35, 210, 2.4, "F");
    doc.setFillColor(255, 255, 255); doc.roundedRect(12, 6.5, 27, 25, 3, 3, "F");
    if (policyLogoDataUrl) {
      try { doc.addImage(policyLogoDataUrl, "JPEG", 14, 8, 23, 21, undefined, "FAST"); }
      catch { doc.setTextColor(8,139,80); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("SL",25.5,22,{align:"center"}); }
    } else {
      doc.setTextColor(8,139,80); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("SL",25.5,22,{align:"center"});
    }
    doc.setTextColor(255,255,255); doc.setFontSize(19); doc.text("SecureLife",42,17);
    doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.text("INSURANCE • DIGITAL POLICY SERVICES",42,24);
    doc.setFontSize(7); doc.text("Trusted Protection for a Safer Tomorrow",42,29);
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.text("POLICY BOND",195,15,{align:"right"});
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.text(policyNo,195,22,{align:"right",maxWidth:62});
    doc.setDrawColor(8,139,80); doc.setLineWidth(.8); doc.rect(7,7,196,283);
    doc.setDrawColor(214,231,220); doc.setLineWidth(.25); doc.rect(10,40,190,247);
    doc.setTextColor(15,35,55); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text(title,15,49);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(100,116,139);
    doc.text("Official digitally generated SecureLife policy document",15,55);
    doc.text("VERIFY • SECURE • AUTHENTIC",195,49,{align:"right"});
  };
  const bondSection=(doc:jsPDF,title:string,y:number)=>{doc.setFillColor(235,248,241);doc.roundedRect(15,y,180,9,1.5,1.5,"F");doc.setTextColor(4,100,67);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text(title.toUpperCase(),19,y+6);return y+15;};
  const bondRows=(doc:jsPDF,rows:Array<[string,string]>,y:number)=>{doc.setFontSize(8.3);rows.forEach(([l,v],i)=>{if(i%2===0){doc.setFillColor(250,252,251);doc.rect(18,y-5.5,174,8,"F");}doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text(l,20,y);doc.setFont("helvetica","bold");doc.setTextColor(25,45,55);doc.text(String(v||"N/A"),78,y,{maxWidth:110});y+=8;});return y;};
  const bondFooter=(doc:jsPDF,policyNo:string)=>{
    doc.setDrawColor(214,231,220);doc.line(15,274,195,274);
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(4,100,67);doc.text("SECURELIFE INSURANCE",15,280);
    doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text("Computer-generated policy bond • No physical signature required",15,285);
    doc.text(policyNo,195,280,{align:"right"});doc.text("Customer Copy",195,285,{align:"right"});
  };
  const addPolicyTermsPage = (doc: jsPDF, plan: PurchasedPlan) => {
    doc.addPage(); addBondHeader(doc,"Policy Terms & Conditions",plan.policyNumber||"N/A"); let y=63;
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
    doc.addPage();addBondHeader(doc,"Premium Schedule",plan.policyNumber||"N/A");let y=63;
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
    // SecureLife premium corporate receipt.
    doc.setFillColor(4,78,57); doc.rect(0,0,210,38,"F");
    doc.setFillColor(8,139,80); doc.rect(0,38,210,2.5,"F");
    doc.setFillColor(255,255,255); doc.roundedRect(12,6.5,27,25,3,3,"F");
    if (policyLogoDataUrl) {
      try { doc.addImage(policyLogoDataUrl,"JPEG",14,8,23,21,undefined,"FAST"); }
      catch { doc.setTextColor(8,139,80);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("SL",25.5,22,{align:"center"}); }
    } else {
      doc.setTextColor(8,139,80);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("SL",25.5,22,{align:"center"});
    }
    doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("SecureLife",44,17);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text("INSURANCE • DIGITAL POLICY SERVICES",44,24);
    doc.setFontSize(7);doc.text("Trusted Protection for a Safer Tomorrow",44,29);
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("PREMIUM RECEIPT",195,15,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.text(plan.receiptNumber,195,22,{align:"right",maxWidth:65});

    doc.setDrawColor(8,139,80);doc.setLineWidth(.8);doc.rect(7,7,196,283);
    doc.setDrawColor(214,231,220);doc.setLineWidth(.25);doc.rect(10,43,190,244);
    doc.setTextColor(15,35,55);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("Premium Payment Receipt",15,54);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(100,116,139);doc.text("Official payment acknowledgement issued by SecureLife Insurance",15,60);
    doc.setTextColor(4,100,67);doc.setFont("helvetica","bold");doc.text("PAID • VERIFIED",195,54,{align:"right"});

    doc.setFillColor(235,248,241);doc.roundedRect(15,68,180,10,2,2,"F");
    doc.setTextColor(4,100,67);doc.setFontSize(8.5);doc.text("PAYMENT & POLICY DETAILS",20,74.5);
    const rows:Array<[string,string]> = [
      ["Receipt Number",plan.receiptNumber||"N/A"],
      ["Policy Number",plan.policyNumber||"Processing"],
      ["Policyholder",plan.proposal?.customerName||user.name||"Customer"],
      ["Insurance Plan",plan.planName],
      ["Premium Paid",`INR ${Number(plan.yearlyPremium||0).toLocaleString("en-IN")}`],
      ["Transaction ID",plan.transactionId||"N/A"],
      ["Payment Status",plan.paymentStatus],
      ["Payment Date",plan.startDate?new Date(plan.startDate).toLocaleDateString("en-IN"):"N/A"],
    ];
    let y=90;
    rows.forEach(([label,value],i)=>{
      if(i%2===0){doc.setFillColor(249,252,250);doc.roundedRect(18,y-6,174,10,1.5,1.5,"F");}
      doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(100,116,139);doc.text(label,22,y);
      doc.setFont("helvetica","bold");doc.setTextColor(25,45,55);doc.text(String(value),78,y,{maxWidth:108});y+=12;
    });

    doc.setFillColor(232,249,239);doc.roundedRect(15,190,180,34,3,3,"F");
    doc.setTextColor(4,100,67);doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text("✓  PAYMENT SUCCESSFULLY VERIFIED",22,203);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(55,90,75);
    doc.text(doc.splitTextToSize("This receipt confirms that the above premium payment has been recorded against the stated SecureLife policy.",160),22,212);

    doc.setFillColor(248,250,252);doc.roundedRect(15,233,180,20,2,2,"F");
    doc.setTextColor(71,85,105);doc.setFontSize(7.3);doc.text("DIGITAL RECEIPT",20,241);
    doc.text("This is a system-generated payment acknowledgement and does not require a physical signature.",20,247,{maxWidth:165});

    doc.setDrawColor(214,231,220);doc.line(15,270,195,270);
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(4,100,67);doc.text("SECURELIFE INSURANCE",15,278);
    doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text("Digital Policy Services • Customer Copy",15,284);
    doc.text(plan.receiptNumber,195,278,{align:"right"});doc.text("Payment Verified",195,284,{align:"right"});
    doc.save(`${plan.receiptNumber || "SecureLife-Receipt"}.pdf`);
  };

  const downloadCertificate = (plan: PurchasedPlan) => {
    if (Number(plan.yearlyPremium || 0) <= 0 || Number(plan.coverageAmount || 0) <= 0) { alert("This policy does not have a valid plan premium/coverage. Please contact SecureLife servicing."); return; }
    if (plan.paymentStatus !== "Paid" || !plan.policyNumber) { alert("Policy bond will be available after payment is verified and the policy number is issued."); return; }
    const doc=new jsPDF();addBondHeader(doc,"Certificate of Insurance / Policy Schedule",plan.policyNumber);let y=63;
    y=bondSection(doc,"Policyholder & Policy Details",y);
    y=bondRows(doc,[["Policyholder",plan.proposal?.customerName||user.name||"Customer"],["Policy Number",plan.policyNumber],["Document Reference",`BOND-${plan.policyNumber.slice(-12)}`],["Issue Date",new Date(plan.startDate||plan.createdAt||Date.now()).toLocaleDateString("en-IN")],["Plan Name",plan.planName],["Product Category",plan.category],["Policy Status",plan.policyStatus],["Payment Status",plan.paymentStatus]],y);
    y=bondSection(doc,"Insurance Benefits",y+2);
    y=bondRows(doc,[["Life / Benefit Cover",`INR ${Number(plan.coverageAmount||0).toLocaleString("en-IN")}`],["Annual Premium",`INR ${Number(plan.yearlyPremium||0).toLocaleString("en-IN")}`],["Premium Payment Term",`${plan.paymentYears||1} year(s)`],["Total Premium Payable",`INR ${Number(plan.totalPremiumPayable||(plan.yearlyPremium*(plan.paymentYears||1))).toLocaleString("en-IN")}`]],y);
    y=bondSection(doc,"Nominee & Validity",y+2);
    y=bondRows(doc,[["Nominee",plan.proposal?.nomineeName||"N/A"],["Relationship",plan.proposal?.nomineeRelation||"N/A"],["Commencement Date",plan.startDate?new Date(plan.startDate).toLocaleDateString("en-IN"):"N/A"],["Policy Valid Until",plan.endDate?new Date(plan.endDate).toLocaleDateString("en-IN"):"N/A"],["Next Premium Due",plan.nextPremiumDate?new Date(plan.nextPremiumDate).toLocaleDateString("en-IN"):"No further premium due"]],y);
    const verifiedY=Math.min(Math.max(y+5,218),246);
    doc.setFillColor(236,253,245);doc.roundedRect(15,verifiedY,180,24,2,2,"F");doc.setTextColor(22,101,52);doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.text("POLICY ISSUED - PAYMENT VERIFIED",20,verifiedY+10);doc.setFont("helvetica","normal");doc.setFontSize(7.2);doc.text("This document is generated from the policy information recorded in your SecureLife account.",20,verifiedY+17,{maxWidth:165});
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

      {loadError && <div className="data-load-error"><span>{loadError}</span><button className="mini-btn" onClick={loadPolicies}>Retry</button></div>}

      {isCustomer && purchasedPlans.length > 0 && (
        <>
          {activePurchasedPlans.length > 0 && <div className="section policy-group-section">
            <div className="section-heading-row"><div><span className="eyebrow">DIGITAL POLICIES</span><h2>My Active Cover</h2><p className="section-copy">Your active, paid policies and policy documents.</p></div><span className="policy-count-chip">${activePurchasedPlans.length} Active</span></div>
            <div className="insurance-plan-grid">
              {activePurchasedPlans.map((plan) => <div className="insurance-plan-card policy-wallet-card" key={plan._id}>
                <span className="plan-category">{plan.category}</span><h3>{plan.planName}</h3>
                <div className="policy-detail-rows">
                  <p><b>Policy No:</b><span>{plan.policyNumber || "Processing"}</span></p>
                  <p><b>Coverage:</b><span>₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</span></p>
                  <p><b>Yearly Premium:</b><span>₹{Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}</span></p>
                  <p><b>Total Premium ({plan.paymentYears || 1} years):</b><span>₹{Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}</span></p>
                  <p><b>Next Premium:</b><span>{plan.nextPremiumDate ? new Date(plan.nextPremiumDate).toLocaleDateString("en-IN") : "No further premium due"}</span></p>
                  <p><b>Validity:</b><span>{plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "N/A"} – {plan.endDate ? new Date(plan.endDate).toLocaleDateString("en-IN") : "N/A"}</span></p>
                </div>
                {plan.proposal?.nomineeName && <div className="policy-proposal-mini"><span>Nominee</span><strong>{plan.proposal.nomineeName}</strong><small>{plan.proposal.nomineeRelation || ""}</small></div>}
                <div className="policy-wallet-status"><span className="status-pill active">● ACTIVE</span><span className="payment-verified">✓ PAID</span></div>
                <div className="policy-document-actions">
                  <button className="policy-download-btn primary" onClick={() => downloadCertificate(plan)}>Download Policy</button>
                  {plan.receiptNumber && <button className="policy-download-btn secondary" onClick={() => downloadReceipt(plan)}>Download Receipt</button>}
                  <button className="policy-download-btn secondary" onClick={()=>setJourneyPlan(plan)}>View Policy Journey</button>
                </div>
              </div>)}
            </div>
          </div>}
          {pendingPurchasedPlans.length > 0 && <div className="section policy-group-section policy-pending-section">
            <div className="section-heading-row"><div><span className="eyebrow">ACTION / HISTORY</span><h2>Processing & Failed Policies</h2><p className="section-copy">Pending or unsuccessful purchases are kept separate from active cover.</p></div><span className="policy-count-chip pending">${pendingPurchasedPlans.length} Records</span></div>
            <div className="insurance-plan-grid">
              {pendingPurchasedPlans.map((plan) => <div className={`insurance-plan-card policy-wallet-card policy-state-${purchaseStatusClass(plan)}`} key={plan._id}>
                <span className="plan-category">{plan.category}</span><h3>{plan.planName}</h3>
                <div className="policy-detail-rows">
                  <p><b>Policy No:</b><span>{plan.policyNumber || "Processing"}</span></p>
                  <p><b>Coverage:</b><span>₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</span></p>
                  <p><b>Yearly Premium:</b><span>₹{Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}</span></p>
                  <p><b>Total Premium ({plan.paymentYears || 1} years):</b><span>₹{Number(plan.totalPremiumPayable || (plan.yearlyPremium * (plan.paymentYears || 1))).toLocaleString("en-IN")}</span></p>
                </div>
                {plan.proposal?.nomineeName && <div className="policy-proposal-mini"><span>Nominee</span><strong>{plan.proposal.nomineeName}</strong><small>{plan.proposal.nomineeRelation || ""}</small></div>}
                <div className="policy-wallet-status"><span className={`status-pill ${purchaseStatusClass(plan)}`}>● {String(plan.policyStatus || "Processing").toUpperCase()}</span><span className={`payment-state ${purchaseStatusClass(plan)}`}>{String(plan.paymentStatus || "Pending").toUpperCase()}</span></div>
                <div className="policy-payment-note">{String(plan.paymentStatus).toLowerCase() === "failed" ? "Payment failed — policy certificate was not issued." : "Payment / policy issuance is still pending."}</div>
                <div className="policy-document-actions"><span className="status-pill due">Certificate after payment</span><button className="policy-download-btn secondary" onClick={()=>setJourneyPlan(plan)}>View Policy Journey</button></div>
              </div>)}
            </div>
          </div>}
        </>
      )}

      {isCustomer&&journeyPlan&&<div className="policy-journey-overlay" onClick={()=>setJourneyPlan(null)}><div className="section policy-journey-modal" onClick={e=>e.stopPropagation()}><div className="section-heading-row"><div><span className="eyebrow">POLICY JOURNEY</span><h2>{journeyPlan.planName}</h2><p className="section-copy">{journeyPlan.policyNumber}</p></div><button className="mini-btn" onClick={()=>setJourneyPlan(null)}>Close</button></div>
      <div className="cards admin-kpi-grid"><div className="card"><h3>Entry Age</h3><h1>{journeyPlan.entryAge||"-"}</h1></div><div className="card"><h3>Cover Till Age</h3><h1>{journeyPlan.coverTillAge||"-"}</h1></div><div className="card"><h3>Policy Term</h3><h1>{journeyPlan.policyTermYears||journeyPlan.paymentYears} yrs</h1></div><div className="card"><h3>Premium Paying Term</h3><h1>{journeyPlan.paymentYears} yrs</h1></div></div>
      <div className="cards"><div className="card"><h3>Premiums Paid</h3><h1>{journeyPlan.premiumProgress?.paidCount||0}/{journeyPlan.paymentYears}</h1><p>{journeyPlan.premiumProgress?.remainingCount||0} remaining</p></div><div className="card"><h3>Total Premium Paid</h3><h1>₹{Number(journeyPlan.premiumProgress?.paidAmount||0).toLocaleString("en-IN")}</h1></div><div className="card"><h3>Next Premium</h3><h1 style={{fontSize:18}}>{journeyPlan.nextPremiumDate?new Date(journeyPlan.nextPremiumDate).toLocaleDateString("en-IN"):"Completed / N.A."}</h1></div><div className="card"><h3>Cover End / Maturity</h3><h1 style={{fontSize:18}}>{journeyPlan.endDate?new Date(journeyPlan.endDate).toLocaleDateString("en-IN"):"-"}</h1></div></div>
      <h3>Journey Timeline</h3><div className="table-wrap"><table className="table"><thead><tr><th>Stage</th><th>Date / Year</th><th>Status / Amount</th></tr></thead><tbody><tr><td>Policy Started</td><td>{journeyPlan.startDate?new Date(journeyPlan.startDate).toLocaleDateString("en-IN"):"-"}</td><td>{journeyPlan.policyStatus}</td></tr>{(journeyPlan.premiumProgress?.premiums||[]).map((p,i)=><tr key={p._id}><td>Premium {i+1}</td><td>{p.dueDate}</td><td>{p.status} · ₹{Number(p.amount||0).toLocaleString("en-IN")}</td></tr>)}<tr><td>Premium Paying Term Complete</td><td>After {journeyPlan.paymentYears} year(s)</td><td>{(journeyPlan.premiumProgress?.remainingCount||0)===0?"Completed":"Upcoming"}</td></tr>{(journeyPlan.benefitSchedule||[]).map((b,i)=><tr key={`benefit-${i}`}><td>{b.type||journeyPlan.benefitType||"Benefit"}</td><td>Policy Year {b.policyYear}</td><td>₹{Number(b.amount||0).toLocaleString("en-IN")}</td></tr>)}<tr><td>{journeyPlan.maturityAmount?"Maturity Benefit":"Life Cover Ends"}</td><td>{journeyPlan.endDate?new Date(journeyPlan.endDate).toLocaleDateString("en-IN"):"-"}</td><td>{journeyPlan.maturityAmount?`₹${Number(journeyPlan.maturityAmount).toLocaleString("en-IN")}`:`Cover ₹${Number(journeyPlan.deathBenefit||journeyPlan.coverageAmount||0).toLocaleString("en-IN")} till policy end`}</td></tr></tbody></table></div>
      <p className="section-copy">Benefits shown here are only the values stored with the purchased policy/quotation. Final benefits remain subject to the issued policy terms.</p></div></div>}

      <div className="section">
        <h2>{isCustomer ? "Other Assigned Policies" : "Policy List"}</h2>

        <button className="mini-btn" onClick={loadPolicies}>
          Refresh
        </button>

        {loading ? (
          <SecureLifeLoader label="Loading policies..." />
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