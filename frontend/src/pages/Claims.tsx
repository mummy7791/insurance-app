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
      title="Claims Management"
      subtitle="Track claim requests, approval status and settlement details"
    >
      <div className="cards">
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
        <h2>Add Claim</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
            }
          />

          <input
            placeholder="Policy Number"
            value={form.policyNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, policyNumber: e.target.value }))
            }
          />

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

        <button className="btn small-btn" onClick={addClaim}>
          Add Claim
        </button>
      </div>

      <div className="section">
        <h2>Claim List</h2>

        <button className="mini-btn" onClick={loadClaims}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : claims.length === 0 ? (
          <p>No claims found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {claims.map((claim) => (
                <tr key={claim._id}>
                  <td>{claim.customerName}</td>
                  <td>{claim.policyNumber}</td>
                  <td>{claim.claimType}</td>
                  <td>₹{claim.claimAmount}</td>
                  <td>{claim.submittedDate}</td>
                  <td>
                    <select
                      className="status-select"
                      value={claim.status}
                      onChange={(e) =>
                        updateStatus(claim._id, e.target.value as ClaimStatus)
                      }
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Settled">Settled</option>
                    </select>
                  </td>
                  <td>{claim.remarks}</td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteClaim(claim._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}