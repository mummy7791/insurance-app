import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type PolicyPurchase = {
  _id: string; policyName: string; policyNumber: string; premiumAmount: number; paidAmount: number;
  sumAssured: number; paymentMode: string; paymentStatus: string; status: string; transactionId?: string;
  customerName: string; customerEmail: string; customerPhone: string; createdAt?: string;
};

type IssuanceReview = { _id: string; planName: string; policyNumber?: string; receiptNumber?: string; transactionId?: string; paymentStatus: string; policyStatus: string; createdAt?: string; };

type CertificateRecord = { purchaseId: string; sha256: string; originalName: string; byteSize: number; uploadedAt: string; uploadedBy: string; };

type IssuanceAudit = { purchaseId: string; planName: string; appPolicyReference?: string; policyStatus: string; insurerName: string; insurerPolicyNumber: string; evidenceReference: string; confirmedAt?: string | null; confirmedBy?: string | null; certificateSha256?: string; };

export default function PolicyPurchases() {
  const [purchases, setPurchases] = useState<PolicyPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [issuanceReviews, setIssuanceReviews] = useState<IssuanceReview[]>([]);
  const [issuanceAudit, setIssuanceAudit] = useState<IssuanceAudit[]>([]);
  const [certificateRecords, setCertificateRecords] = useState<CertificateRecord[]>([]);
  const [issuanceError, setIssuanceError] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [insurerPolicyNumber, setInsurerPolicyNumber] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [certificateSha256, setCertificateSha256] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certificatePurchaseId, setCertificatePurchaseId] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUploading, setCertificateUploading] = useState(false);
  const [certificateMessage, setCertificateMessage] = useState("");
  const [uploadedThisSession, setUploadedThisSession] = useState<string[]>([]);

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<PolicyPurchase[]>("/policy-purchases");
      setPurchases(Array.isArray(res.data) ? res.data : []);
      try {
        const review = await api.get<IssuanceReview[]>("/plan-purchases/issuance-review");
        setIssuanceReviews(Array.isArray(review.data) ? review.data : []);
        setIssuanceError("");
        try { const audit = await api.get<IssuanceAudit[]>("/plan-purchases/issuance-audit"); setIssuanceAudit(Array.isArray(audit.data) ? audit.data : []); } catch { setIssuanceAudit([]); }
        try { const records = await api.get<CertificateRecord[]>("/plan-purchases/issuance-certificates"); setCertificateRecords(Array.isArray(records.data) ? records.data : []); } catch { setCertificateRecords([]); }
      } catch {
        setIssuanceError("Issuance review queue unavailable. Check admin access and backend deployment.");
      }
    } catch (error) {
      console.error("Policy purchases load error:", error);
      alert("Policy purchases load failed");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadPurchases(), 0); return () => window.clearTimeout(timer); }, [loadPurchases]);

  const confirmIssuance = async () => {
    if (!reviewId || !insurerName.trim() || !insurerPolicyNumber.trim() || !evidenceReference.trim()) {
      setIssuanceError("Select a proposal and complete all insurer verification fields.");
      return;
    }
    if (!window.confirm("Have you independently verified issuance with the insurer? This will activate the policy in SecureLife.")) return;
    try {
      setSubmitting(true);
      setIssuanceError("");
      await api.post(`/plan-purchases/issuance-review/${reviewId}/confirm`, {
        insurerName: insurerName.trim(), insurerPolicyNumber: insurerPolicyNumber.trim(), evidenceReference: evidenceReference.trim(), certificateSha256
      });
      setReviewId(""); setInsurerName(""); setInsurerPolicyNumber(""); setEvidenceReference(""); setCertificateSha256("");
      await loadPurchases();
    } catch {
      setIssuanceError("Confirmation failed. Verify insurer evidence, admin access and proposal status before retrying.");
    } finally { setSubmitting(false); }
  };

  const uploadCertificate = async () => {
    if (!certificatePurchaseId || !certificateFile) { setCertificateMessage("Select a confirmed proposal and PDF."); return; }
    if (certificateFile.size > 10 * 1024 * 1024 || !certificateFile.name.toLowerCase().endsWith(".pdf")) {
      setCertificateMessage("Select a PDF certificate up to 10 MB."); return;
    }
    try {
      setCertificateUploading(true); setCertificateMessage("");
      const data = new FormData();
      data.append("certificate", certificateFile);
      await api.post(`/plan-purchases/issuance-review/${certificatePurchaseId}/certificate`, data);
      const refreshed = await api.get<CertificateRecord[]>("/plan-purchases/issuance-certificates").catch(() => null);
      if (refreshed && Array.isArray(refreshed.data)) setCertificateRecords(refreshed.data);
      setCertificateMessage("Certificate uploaded to private storage.");
      setUploadedThisSession(previous => [...previous, certificatePurchaseId]);
      setCertificateFile(null);
    } catch (error: unknown) {
      const response = error as { response?: { status?: number; data?: { message?: string } } };
      const status = response.response?.status;
      const detail = response.response?.data?.message;
      setCertificateMessage(detail || (status === 413 ? "Certificate exceeds 10 MB." : status === 409 ? "Certificate already uploaded or issuance not confirmed." : "Certificate upload failed. Please retry."));
    }
    finally { setCertificateUploading(false); }
  };

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
        <div className="section-heading-row"><div><span className="eyebrow">INSURER CONFIRMATION</span><h2>Paid proposals awaiting issuance review</h2></div><span>{issuanceReviews.length} pending review</span></div>
        <p>Payment confirmation alone does not activate insurer coverage. Only confirm after independently checking insurer-issued evidence. Confirmation activates the policy record in SecureLife; it does not contact the insurer.</p>
        {issuanceError && <p role="alert">{issuanceError}</p>}
        {issuanceReviews.length > 0 && <div className="card" style={{ marginBottom: 16 }}>
          <h3>Record insurer-issued policy confirmation</h3>
          <label htmlFor="issuance-proposal">Paid proposal</label>
          <select id="issuance-proposal" value={reviewId} onChange={e => setReviewId(e.target.value)}>
            <option value="">Select proposal</option>
            {issuanceReviews.map(item => <option key={item._id} value={item._id}>{item.planName} — {item.policyNumber || item._id}</option>)}
          </select>
          <label htmlFor="issuance-insurer">Issuing insurer</label>
          <input id="issuance-insurer" maxLength={200} value={insurerName} onChange={e => setInsurerName(e.target.value)} placeholder="Insurer legal name" />
          <label htmlFor="issuance-number">Insurer-issued policy number</label>
          <input id="issuance-number" maxLength={200} value={insurerPolicyNumber} onChange={e => setInsurerPolicyNumber(e.target.value)} placeholder="Verified insurer policy number" />
          <label htmlFor="issuance-evidence">Verification evidence reference</label>
          <input id="issuance-evidence" maxLength={200} value={evidenceReference} onChange={e => setEvidenceReference(e.target.value)} placeholder="Insurer portal / confirmation reference" />
          <label htmlFor="issuance-certificate">Certificate PDF fingerprint (optional)</label>
          <input id="issuance-certificate" type="file" accept="application/pdf,.pdf" onChange={async e => {
            const file = e.target.files?.[0];
            setCertificateSha256("");
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { setIssuanceError("Certificate PDF must be 10 MB or smaller."); return; }
            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setIssuanceError("Select a PDF certificate."); return; }
            try {
              const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
              setCertificateSha256(Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join(""));
              setIssuanceError("");
            } catch { setIssuanceError("Unable to fingerprint PDF on this device."); }
          }} />
          <p style={{ fontSize: 12 }}>PDF stays on your device; only its SHA-256 fingerprint is recorded. This does not upload or verify the certificate with the insurer.</p>
          {certificateSha256 && <small>SHA-256: {certificateSha256}</small>}
          <button type="button" className="mini-btn" disabled={submitting || !reviewId} onClick={() => void confirmIssuance()}>{submitting ? "Confirming..." : "Confirm insurer issuance"}</button>
        </div>}
        {issuanceReviews.length === 0 ? <p>No pending issuance reviews loaded.</p> : <div className="admin-record-grid">{issuanceReviews.map((item) => <article className="admin-record-card" key={item._id}><h3>{item.planName || "Insurance plan"}</h3><div className="admin-detail-list"><p><span>Payment</span><strong>{item.paymentStatus}</strong></p><p><span>Policy status</span><strong>{item.policyStatus} — insurer confirmation required</strong></p><p><span>App reference</span><strong>{item.policyNumber || "Pending"}</strong></p><p><span>Receipt</span><strong>{item.receiptNumber || "Pending"}</strong></p><p><span>Transaction</span><strong>{item.transactionId || "Pending"}</strong></p></div></article>)}</div>}
      </div>
      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">PRIVATE CERTIFICATES</span><h2>Upload insurer-issued certificate</h2></div></div>
        <p>Upload only an independently verified insurer-issued PDF. Documents are stored privately; duplicate uploads are blocked.</p>
        <div className="card">
          <p>{certificateRecords.length} certificates recorded (latest 200). Select a confirmed proposal to check its upload status.</p>
          {certificatePurchaseId && (certificateRecords.some(item => item.purchaseId === certificatePurchaseId)
            ? <p role="status">Certificate already stored for this proposal.</p>
            : <p>Certificate not uploaded yet.</p>)}
          {issuanceAudit.length === 0 && (
            <p role="status" style={{ padding: 12, background: "#f0f7f3", borderRadius: 10 }}>
              No insurer-confirmed proposals available. First complete the paid proposal's insurer issuance review above. If a confirmation already exists, check backend access and reload this page.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16, alignItems: "start", marginTop: 16 }}>
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <label htmlFor="certificate-purchase" style={{ fontWeight: 600 }}>Confirmed proposal</label>
              <select id="certificate-purchase" style={{ width: "100%", maxWidth: "100%", minHeight: 44 }} value={certificatePurchaseId} onChange={e => { setCertificatePurchaseId(e.target.value); setCertificateMessage(""); }}>
                <option value="">Select confirmed proposal</option>
                {issuanceAudit.filter((item, index, all) => all.findIndex(row => row.purchaseId === item.purchaseId) === index).map(item =>
                  <option key={item.purchaseId} value={item.purchaseId}>{item.planName} — {item.insurerPolicyNumber}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <label htmlFor="certificate-pdf" style={{ fontWeight: 600 }}>Insurer certificate PDF (max 10 MB)</label>
              <input id="certificate-pdf" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }} type="file" accept=".pdf,application/pdf" onChange={e => setCertificateFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="button" className="mini-btn" disabled={certificateUploading || !certificatePurchaseId || !certificateFile || uploadedThisSession.includes(certificatePurchaseId) || certificateRecords.some(item => item.purchaseId === certificatePurchaseId)} onClick={() => void uploadCertificate()}>
              {certificateUploading ? "Uploading..." : "Upload private certificate"}
            </button>
          </div>
          {certificateMessage && <p role="status">{certificateMessage}</p>}
          {certificateRecords.length > 0 && <div className="admin-detail-list">
            <h3>Recent private certificates</h3>
            {certificateRecords.slice(0, 15).map(item => <p key={item.purchaseId}>
              <b>{item.originalName}</b> — {Math.ceil(item.byteSize / 1024)} KB — {new Date(item.uploadedAt).toLocaleDateString("en-IN")}
              <small style={{ display: "block", overflowWrap: "anywhere" }}>Proposal: {item.purchaseId} | SHA-256: {item.sha256}</small>
            </p>)}
          </div>}
        </div>
      </div>
      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">AUDIT HISTORY</span><h2>Insurer issuance confirmations</h2></div><span>{issuanceAudit.length} confirmations loaded</span></div>
        <p>Admin-recorded insurer confirmations. These records do not independently verify insurer issuance.</p>
        {issuanceAudit.length === 0 ? <p>No confirmation history available.</p> : <div className="admin-record-grid">{issuanceAudit.map((entry, index) => <article className="admin-record-card" key={`${entry.purchaseId}-${index}`}>
          <h3>{entry.planName || "Insurance plan"}</h3>
          <div className="admin-detail-list">
            <p><span>Insurer</span><strong>{entry.insurerName || "N/A"}</strong></p>
            <p><span>Insurer policy number</span><strong>{entry.insurerPolicyNumber || "N/A"}</strong></p>
            <p><span>Evidence reference</span><strong>{entry.evidenceReference || "N/A"}</strong></p>
            <p><span>Certificate fingerprint</span><strong style={{ overflowWrap: "anywhere" }}>{entry.certificateSha256 || "Not recorded"}</strong></p>
            <p><span>Recorded on</span><strong>{entry.confirmedAt ? new Date(entry.confirmedAt).toLocaleString("en-IN") : "N/A"}</strong></p>
            <p><span>Admin ID</span><strong>{entry.confirmedBy || "N/A"}</strong></p>
            <p><span>Current status</span><strong>{entry.policyStatus}</strong></p>
          </div>
        </article>)}</div>}
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