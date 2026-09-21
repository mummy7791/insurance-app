import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

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
  }, [loadClaims]);

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
      setForm(initialForm);
    } catch (error) {
      console.error("Claim add error:", error);
      alert("Claim add failed");
    }
  };

  const updateStatus = async (id: string, status: ClaimStatus) => {
    try {
      const res = await api.put<Claim>(`/claims/${id}`, {
        status,
      });

      setClaims((prev) =>
        prev.map((claim) => (claim._id === id ? res.data : claim))
      );
    } catch (error) {
      console.error("Claim status update error:", error);
      alert("Claim status update failed");
    }
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
          {isCustomer && <div className="claim-mobile-list">{claims.map((claim) => { const current = claim.status === "Rejected" ? 1 : claimStages.indexOf(claim.status); return <article className="claim-track-card" key={`track-${claim._id}`}><div className="claim-track-head"><div><span className="eyebrow">{claim.claimType}</span><h3>{claim.policyNumber}</h3>{claim.claimNumber && <small>{claim.claimNumber}</small>}</div><strong>₹{Number(claim.claimAmount || 0).toLocaleString("en-IN")}</strong></div><div className="claim-timeline">{claimStages.map((stage, index) => <div className={`${index <= current && claim.status !== "Rejected" ? "complete" : ""} ${stage === claim.status ? "current" : ""}`} key={stage}><i>{index < current ? "✓" : index + 1}</i><span>{stage}</span></div>)}</div>{claim.status === "Rejected" && <div className="claim-rejected">Claim requires attention: {claim.remarks || "Please contact support."}</div>}<p className="claim-note">{claim.remarks || "We will show service updates here."}</p></article>; })}</div>}
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
                    <select className="status-select" value={claim.status} onChange={(e) => updateStatus(claim._id, e.target.value as ClaimStatus)}>
                      <option value="Submitted">Submitted</option><option value="Under Review">Under Review</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Settled">Settled</option>
                    </select>
                  )}</td>
                  <td>{claim.remarks}</td>
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