import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import { jsPDF } from "jspdf";

type ClaimType =
  | "Death Claim"
  | "Maturity Claim"
  | "Surrender"
  | "Loan Against Policy";

type ClaimStatus =
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Settled";

type Claim = {
  _id: string;
  customerName: string;
  policyNumber: string;
  claimType: ClaimType;
  claimAmount: number;
  submittedDate: string;
  status: ClaimStatus;
  remarks: string;
  claimNumber?: string;
  settlementAmount?: number;
  settlementDate?: string;
  settlementReference?: string;
  documentsStatus?: "Not Requested" | "Required" | "Received" | "Verified";
  missingDocuments?: string[];
  adminChecklistRemarks?: string;
};

type ClaimForm = {
  customerName: string;
  policyNumber: string;
  claimType: ClaimType;
  claimAmount: string;
  submittedDate: string;
  remarks: string;
};

const initialForm: ClaimForm = {
  customerName: "",
  policyNumber: "",
  claimType: "Maturity Claim",
  claimAmount: "",
  submittedDate: "",
  remarks: "",
};

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ClaimForm>(initialForm);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<Array<{ policyNumber: string; planName?: string }>>([]);
  let user: { role?: string; name?: string } = {};
  try { user = JSON.parse(localStorage.getItem("insuranceUser") || "{}") as { role?: string; name?: string }; } catch { user = {}; }
  const claimStages: ClaimStatus[] = ["Submitted", "Under Review", "Approved", "Settled"];
  const isCustomer = user.role === "customer" || !user.role;

  const loadClaims = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Claim[]>("/claims");

      setTimeout(() => {
        setClaims(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Claims load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Claims load failed");
    }
  }, []);

  useEffect(() => {
    void loadClaims();

    if (!isCustomer) return;

    api
      .get<Array<{ policyNumber?: string; planName?: string }>>("/plan-purchases/my-plans")
      .then((res) => {
        const policies = res.data
          .filter((purchase) => purchase.policyNumber)
          .map((purchase) => ({
            policyNumber: purchase.policyNumber as string,
            planName: purchase.planName,
          }));

        setCustomerPolicies(policies);

        if (policies.length > 0) {
          setForm((prev) => ({
            ...prev,
            customerName: prev.customerName || user.name || "",
            policyNumber: prev.policyNumber || policies[0].policyNumber,
          }));
        }
      })
      .catch((error) => {
        console.error("Customer policies load error:", error);
      });
  }, [loadClaims, isCustomer, user.name]);

  const addClaim = async () => {
    if (!form.customerName || !form.policyNumber || !form.claimAmount) {
      alert("Customer Name, Policy Number, Claim Amount required");
      return;
    }

    try {
      const res = await api.post<Claim>("/claims", {
        customerName: form.customerName,
        policyNumber: form.policyNumber,
        claimType: form.claimType,
        claimAmount: Number(form.claimAmount),
        submittedDate:
          form.submittedDate || new Date().toISOString().split("T")[0],
        remarks: form.remarks || "No remarks",
      });

      setClaims((prev) => [res.data, ...prev]);
      setForm({
        ...initialForm,
        customerName: isCustomer ? user.name || "" : "",
        policyNumber: isCustomer && customerPolicies.length ? customerPolicies[0].policyNumber : "",
      });
    } catch (error) {
      console.error("Claim add error:", error);
      alert("Claim add failed");
    }
  };

  const updateChecklist = async (claim: Claim) => {
    const documentsStatus = window.prompt("Document status: Not Requested / Required / Received / Verified", claim.documentsStatus || "Required");
    if (!documentsStatus || !["Not Requested","Required","Received","Verified"].includes(documentsStatus)) return;
    const missing = window.prompt("Missing documents (comma separated)", (claim.missingDocuments || []).join(", "));
    const adminChecklistRemarks = window.prompt("Checklist remarks", claim.adminChecklistRemarks || "") || "";
    try {
      const res = await api.put<Claim>(`/claims/${claim._id}`, { documentsStatus, missingDocuments: (missing || "").split(",").map(x=>x.trim()).filter(Boolean), adminChecklistRemarks });
      setClaims(prev => prev.map(x => x._id === claim._id ? res.data : x));
    } catch { alert("Claim checklist update failed"); }
  };

  const updateStatus = async (id: string, status: ClaimStatus) => {
    try {
      let settlement: Record<string, string | number> = {};
      if (status === "Settled") {
        const claim = claims.find((item) => item._id === id);
        const amountText = window.prompt("Settlement Amount", String(claim?.claimAmount || ""));
        if (amountText === null) return;
        const amount = Number(amountText);
        if (!Number.isFinite(amount) || amount <= 0) { alert("Enter a valid settlement amount"); return; }
        const date = window.prompt("Settlement Date (YYYY-MM-DD)", new Date().toISOString().split("T")[0]);
        if (!date) return;
        const reference = window.prompt("Transaction / Reference ID");
        if (!reference?.trim()) { alert("Transaction / Reference ID required"); return; }
        const remarks = window.prompt("Admin Remarks", claim?.remarks === "No remarks" ? "Claim settled successfully" : claim?.remarks || "Claim settled successfully");
        settlement = { settlementAmount: amount, settlementDate: date, settlementReference: reference.trim(), remarks: remarks?.trim() || "Claim settled successfully" };
        setSettlingId(id);
      }
      const res = await api.put<Claim>(`/claims/${id}`, {
        status,
        ...settlement,
      });

      setClaims((prev) =>
        prev.map((claim) => (claim._id === id ? res.data : claim))
      );
    } catch (error) {
      console.error("Claim status update error:", error);
      alert("Claim status update failed");
    } finally {
      setSettlingId(null);
    }
  };

  const downloadSettlementReceipt = async (claim: Claim) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const L = 16;
    const R = W - 16;
    const CW = R - L;
    const claimRef = claim.claimNumber || claim._id;
    const money = (value?: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
    const generatedAt = new Date().toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const receiptNo = `SL-CSR-${String(claimRef).replace(/^CLM-/, "").slice(-18)}`;

    // Premium corporate stationery
    pdf.setDrawColor(166, 10, 38);
    pdf.setLineWidth(0.7);
    pdf.rect(8, 8, W - 16, H - 16);
    pdf.setFillColor(166, 10, 38);
    pdf.rect(8, 8, W - 16, 35, "F");
    pdf.setFillColor(244, 94, 20);
    pdf.rect(8, 41, W - 16, 2, "F");

    // Brand mark
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(L, 15, 20, 20, 3, 3, "F");
    pdf.setTextColor(166, 10, 38);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("SL", L + 10, 27.5, { align: "center" });
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text("SecureLife Insurance", L + 26, 22);
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.text("CLAIMS & SETTLEMENT SERVICES", L + 26, 28);
    pdf.text("Customer Settlement Acknowledgement", L + 26, 33);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("CLAIM SETTLEMENT RECEIPT", R, 21, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(`Receipt No: ${receiptNo}`, R, 28, { align: "right" });
    pdf.text(`Generated: ${generatedAt}`, R, 33, { align: "right" });

    // Document title / status
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text("Settlement Confirmation", L, 57);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text("Official acknowledgement of the claim settlement recorded in the SecureLife system.", L, 64);

    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(167, 243, 208);
    pdf.roundedRect(R - 39, 50, 39, 14, 7, 7, "FD");
    pdf.setTextColor(4, 120, 87);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("SETTLED", R - 19.5, 58.8, { align: "center" });

    const sectionTitle = (title: string, y: number) => {
      pdf.setTextColor(166, 10, 38);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(title.toUpperCase(), L, y);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(L, y + 3, R, y + 3);
    };
    const field = (label: string, value: string, x: number, y: number, width: number) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(label.toUpperCase(), x, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.3);
      pdf.setTextColor(15, 23, 42);
      pdf.text(pdf.splitTextToSize(value || "-", width), x, y + 5.5);
    };

    sectionTitle("Customer & Policy Information", 77);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(L, 84, CW, 39, 2.5, 2.5, "F");
    field("Customer Name", claim.customerName, L + 6, 94, 74);
    field("Policy Number", claim.policyNumber, 108, 94, 78);
    field("Claim Reference", String(claimRef), L + 6, 111, 74);
    field("Claim Type", claim.claimType, 108, 111, 78);

    sectionTitle("Settlement Summary", 137);
    const cards = [
      ["CLAIM AMOUNT", money(claim.claimAmount)],
      ["SETTLEMENT AMOUNT", money(claim.settlementAmount)],
      ["SETTLEMENT DATE", claim.settlementDate || "-"],
    ];
    cards.forEach(([label, value], i) => {
      const x = L + i * 61;
      pdf.setFillColor(i === 1 ? 255 : 249, i === 1 ? 247 : 250, i === 1 ? 237 : 251);
      pdf.setDrawColor(i === 1 ? 253 : 226, i === 1 ? 186 : 232, i === 1 ? 116 : 240);
      pdf.roundedRect(x, 144, 55, 28, 2.5, 2.5, "FD");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.8);
      pdf.text(label, x + 27.5, 153, { align: "center" });
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(11);
      pdf.text(value, x + 27.5, 164, { align: "center" });
    });

    sectionTitle("Transaction & Settlement Record", 187);
    const rows: Array<[string, string]> = [
      ["Transaction / Reference ID", claim.settlementReference || "-"],
      ["Receipt Number", receiptNo],
      ["Claim Status", claim.status],
      ["Remarks", claim.remarks || "Claim settled successfully"],
    ];
    let y = 197;
    rows.forEach(([label, value], index) => {
      const rowH = label === "Remarks" ? 16 : 12;
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(L, y - 6, CW, rowH, "F");
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(label, L + 5, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(pdf.splitTextToSize(value, 105), 78, y);
      y += rowH;
    });

    // Real scannable QR: points to the public verification page.
    const verificationText = [receiptNo, claimRef, claim.policyNumber, claim.settlementReference || "-", claim.settlementAmount || 0].join("|");
    let verificationHash = 2166136261;
    for (let i = 0; i < verificationText.length; i += 1) {
      verificationHash ^= verificationText.charCodeAt(i);
      verificationHash = Math.imul(verificationHash, 16777619);
    }
    const verificationCode = `SLV-${(verificationHash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
    const verificationUrl = `${window.location.origin}/verify-claim?claim=${encodeURIComponent(String(claimRef))}&code=${encodeURIComponent(verificationCode)}`;
    const qrX = 164;
    const qrY = 220;
    const qrBox = 27;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(157, 218, 37, 29, 2, 2, "FD");

    try {
      const qrResponse = await fetch(`https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(verificationUrl)}`);
      if (!qrResponse.ok) throw new Error("QR service unavailable");
      const qrBlob = await qrResponse.blob();
      const qrDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read QR image"));
        reader.readAsDataURL(qrBlob);
      });
      pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrBox, qrBox);
      pdf.link(qrX, qrY, qrBox, qrBox, { url: verificationUrl });
    } catch (error) {
      console.error("Receipt QR generation error:", error);
      pdf.setTextColor(166, 10, 38);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text("VERIFY ONLINE", qrX + qrBox / 2, qrY + 12, { align: "center" });
      pdf.setFontSize(5.5);
      pdf.text("Use verification code", qrX + qrBox / 2, qrY + 17, { align: "center" });
    }

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.text("DOCUMENT VERIFICATION", 134, 224);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.4);
    pdf.text("Verification Code", 134, 231);
    pdf.setFont("helvetica", "bold");
    pdf.text(verificationCode, 134, 236);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.8);
    pdf.text("Scan QR to validate this", 134, 241);
    pdf.text("settlement receipt online.", 134, 244.5);

    // Important note
    pdf.setFillColor(255, 251, 235);
    pdf.setDrawColor(253, 230, 138);
    pdf.roundedRect(L, 247, 112, 24, 2, 2, "FD");
    pdf.setTextColor(146, 64, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("IMPORTANT", L + 5, 255);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.7);
    const note = "Please retain this receipt with your policy records. Quote the policy number, claim reference and transaction reference in any future correspondence.";
    pdf.text(pdf.splitTextToSize(note, 101), L + 5, 261);

    // Signature / validation panel
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(135, 247, 59, 24, 2, 2);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("AUTHORIZED VALIDATION", 164.5, 255, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(6.8);
    pdf.text("System Generated", 164.5, 262, { align: "center" });
    pdf.text("No physical signature required", 164.5, 267, { align: "center" });

    // Footer
    pdf.setFillColor(248, 250, 252);
    pdf.rect(8, 278, W - 16, 11, "F");
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(6.5);
    pdf.text("SecureLife Insurance | Claims & Settlement Services", L, 284);
    pdf.text("Computer-generated settlement acknowledgement", W / 2, 284, { align: "center" });
    pdf.text("Page 1 of 1", R, 284, { align: "right" });

    pdf.save(`${claimRef}-corporate-settlement-receipt.pdf`);
  };

  const deleteClaim = async (id: string) => {
    const ok = window.confirm("Delete this claim?");
    if (!ok) return;

    try {
      await api.delete(`/claims/${id}`);
      setClaims((prev) => prev.filter((claim) => claim._id !== id));
    } catch (error) {
      console.error("Claim delete error:", error);
      alert("Claim delete failed");
    }
  };

  return (
    <MainLayout
      title={isCustomer ? "Claims" : "Claims Management"}
      subtitle={isCustomer ? "Submit a claim and track its progress" : "Track claim requests, approval status and settlement details"}
    >
      {!isCustomer && <div className="admin-page-summary"><div><span className="eyebrow">CLAIMS OPERATIONS</span><h2>Claims control desk</h2><p>Review claim requests, progress decisions and monitor settlements from one operational queue.</p></div><div className="admin-summary-metrics"><div><span>Total</span><strong>{claims.length}</strong></div><div><span>Review</span><strong>{claims.filter((c) => c.status === "Under Review").length}</strong></div><div><span>Settled</span><strong>{claims.filter((c) => c.status === "Settled").length}</strong></div></div></div>}
      <div className={`cards ${!isCustomer ? "admin-kpi-grid" : ""}`}>
        <div className="card">
          <h3>Total Claims</h3>
          <h1>{claims.length}</h1>
        </div>

        <div className="card">
          <h3>Under Review</h3>
          <h1>{claims.filter((claim) => claim.status === "Under Review").length}</h1>
        </div>

        <div className="card">
          <h3>Approved</h3>
          <h1>{claims.filter((claim) => claim.status === "Approved").length}</h1>
        </div>

        <div className="card">
          <h3>Settled</h3>
          <h1>{claims.filter((claim) => claim.status === "Settled").length}</h1>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">CLAIM ASSISTANCE</span><h2>{isCustomer ? "Submit Claim Request" : "Add Claim"}</h2>{isCustomer && <p className="section-copy">Submit your policy details and claim request. You can track every status update from this page.</p>}

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            readOnly={isCustomer}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
            }
          />

          {isCustomer && customerPolicies.length ? (
            <select value={form.policyNumber} onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))}>
              {customerPolicies.map((p) => <option key={p.policyNumber} value={p.policyNumber}>{p.policyNumber}{p.planName ? ` - ${p.planName}` : ""}</option>)}
            </select>
          ) : (
            <input placeholder="Policy Number" value={form.policyNumber} onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))} />
          )}

          <select
            value={form.claimType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                claimType: e.target.value as ClaimType,
              }))
            }
          >
            <option value="Death Claim">Death Claim</option>
            <option value="Maturity Claim">Maturity Claim</option>
            <option value="Surrender">Surrender</option>
            <option value="Loan Against Policy">Loan Against Policy</option>
          </select>

          <input
            placeholder="Claim Amount"
            value={form.claimAmount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, claimAmount: e.target.value }))
            }
          />

          <input
            type="date"
            value={form.submittedDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, submittedDate: e.target.value }))
            }
          />

          <input
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, remarks: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addClaim}>{isCustomer ? "Submit claim" : "Add claim"}</button>
      </div>

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">{isCustomer ? "CLAIM TRACKER" : "CLAIMS QUEUE"}</span><h2>{isCustomer ? "Claim History" : "Claim operations"}</h2></div>{isCustomer ? <span className="secure-chip">Live status</span> : <span className="secure-chip">{claims.length} records</span>}</div>

        <button className="mini-btn" onClick={loadClaims}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : claims.length === 0 ? (
          <p>No claims found.</p>
        ) : (
          <>
          {isCustomer && <div className="claim-mobile-list">{claims.map((claim) => { const current = claim.status === "Rejected" ? 1 : claimStages.indexOf(claim.status); return <article className="claim-track-card" key={`track-${claim._id}`}><div className="claim-track-head"><div><span className="eyebrow">{claim.claimType}</span><h3>{claim.policyNumber}</h3>{claim.claimNumber && <small>{claim.claimNumber}</small>}</div><strong>₹{Number(claim.claimAmount || 0).toLocaleString("en-IN")}</strong></div><div className="claim-timeline">{claimStages.map((stage, index) => <div className={`${index <= current && claim.status !== "Rejected" ? "complete" : ""} ${stage === claim.status ? "current" : ""}`} key={stage}><i>{index < current ? "✓" : index + 1}</i><span>{stage}</span></div>)}</div>{claim.status === "Rejected" && <div className="claim-rejected">Claim requires attention: {claim.remarks || "Please contact support."}</div>}<p className="claim-note">{claim.remarks || "We will show service updates here."}</p>{claim.status === "Settled" && <div className="claim-settlement"><strong>Settlement ₹{Number(claim.settlementAmount || 0).toLocaleString("en-IN")}</strong><span>{claim.settlementDate || "-"}</span><span>Ref: {claim.settlementReference || "-"}</span><button className="mini-btn" onClick={() => downloadSettlementReceipt(claim)}>Download Settlement Receipt</button></div>}</article>; })}</div>}
          <table className={`table ${isCustomer ? "customer-claim-table" : ""}`}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
                {!isCustomer && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {claims.map((claim) => (
                <tr key={claim._id}>
                  <td>{claim.customerName}</td>
                  <td>{claim.policyNumber}</td>
                  <td>{claim.claimType}</td>
                  <td><strong>₹{Number(claim.claimAmount || 0).toLocaleString("en-IN")}</strong></td>
                  <td>{claim.submittedDate}</td>
                  <td>{isCustomer ? <span className="status-pill due">{claim.status}</span> : (
                    <select className="status-select" value={claim.status} disabled={settlingId === claim._id} onChange={(e) => updateStatus(claim._id, e.target.value as ClaimStatus)}>
                      <option value="Submitted">Submitted</option><option value="Under Review">Under Review</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Settled">Settled</option>
                    </select>
                  )}</td>
                  <td>{claim.remarks}{isCustomer && claim.status === "Settled" && <><br/><button className="mini-btn" onClick={() => downloadSettlementReceipt(claim)}>Download Receipt</button></>}</td>
                  {!isCustomer && <td><button className="mini-btn danger-btn" onClick={() => deleteClaim(claim._id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </MainLayout>
  );
}