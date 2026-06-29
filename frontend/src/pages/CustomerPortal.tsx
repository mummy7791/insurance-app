import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Customer = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Policy = {
  _id: string;
  policyName?: string;
  policyNumber?: string;
  status?: string;
  premiumAmount?: number;
  expiryDate?: string;
};

type Premium = {
  _id: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
};

type Claim = {
  _id: string;
  claimAmount?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
};

type PortalData = {
  customer: Customer;
  policies: Policy[];
  premiums: Premium[];
  claims: Claim[];
};

const initialData: PortalData = {
  customer: {
    _id: "",
  },
  policies: [],
  premiums: [],
  claims: [],
};

export default function CustomerPortal() {
  const [data, setData] = useState<PortalData>(initialData);
  const [loading, setLoading] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [reason, setReason] = useState("");

  const loadPortal = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get<PortalData>("/customer-portal/my-data");
      setData(res.data || initialData);
    } catch (error) {
      console.error("Customer portal load error:", error);
      alert("Customer portal data load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPortal();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPortal]);

  const raiseClaim = async () => {
    if (!policyId || !claimAmount || !reason) {
      alert("Policy, claim amount and reason required");
      return;
    }

    try {
      const res = await api.post<Claim>("/customer-portal/raise-claim", {
        policyId,
        claimAmount: Number(claimAmount),
        reason,
      });

      setData((prev) => ({
        ...prev,
        claims: [res.data, ...prev.claims],
      }));

      setPolicyId("");
      setClaimAmount("");
      setReason("");

      alert("Claim submitted successfully");
    } catch (error) {
      console.error("Raise claim error:", error);
      alert("Claim submit failed");
    }
  };

  return (
    <MainLayout
      title="Customer Portal"
      subtitle="View your policies, premiums and claims"
    >
      {loading && <p>Loading customer portal...</p>}

      <div className="cards">
        <div className="card">
          <h3>Customer</h3>
          <h1>{data.customer.name || "N/A"}</h1>
          <p>{data.customer.email || "N/A"}</p>
        </div>

        <div className="card">
          <h3>Policies</h3>
          <h1>{data.policies.length}</h1>
        </div>

        <div className="card">
          <h3>Premiums</h3>
          <h1>{data.premiums.length}</h1>
        </div>

        <div className="card">
          <h3>Claims</h3>
          <h1>{data.claims.length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>My Policies</h2>

        {data.policies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Number</th>
                <th>Status</th>
                <th>Premium</th>
                <th>Expiry</th>
              </tr>
            </thead>

            <tbody>
              {data.policies.map((policy) => (
                <tr key={policy._id}>
                  <td>{policy.policyName || "N/A"}</td>
                  <td>{policy.policyNumber || "N/A"}</td>
                  <td>
                    <span className="badge">{policy.status || "N/A"}</span>
                  </td>
                  <td>₹{policy.premiumAmount || 0}</td>
                  <td>
                    {policy.expiryDate
                      ? new Date(policy.expiryDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>My Premiums</h2>

        {data.premiums.length === 0 ? (
          <p>No premiums found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {data.premiums.map((premium) => (
                <tr key={premium._id}>
                  <td>₹{premium.amount || 0}</td>
                  <td>
                    <span className="badge">{premium.status || "N/A"}</span>
                  </td>
                  <td>
                    {premium.dueDate
                      ? new Date(premium.dueDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    {premium.createdAt
                      ? new Date(premium.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Raise Claim</h2>

        <div className="form-grid">
          <select value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
            <option value="">Select Policy</option>
            {data.policies.map((policy) => (
              <option key={policy._id} value={policy._id}>
                {policy.policyName || policy.policyNumber || "Policy"}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Claim Amount"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
          />

          <input
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button className="btn small-btn" onClick={raiseClaim}>
            Submit Claim
          </button>
        </div>
      </div>

      <div className="section">
        <h2>My Claims</h2>

        {data.claims.length === 0 ? (
          <p>No claims found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {data.claims.map((claim) => (
                <tr key={claim._id}>
                  <td>₹{claim.claimAmount || 0}</td>
                  <td>{claim.reason || "N/A"}</td>
                  <td>
                    <span className="badge">{claim.status || "N/A"}</span>
                  </td>
                  <td>
                    {claim.createdAt
                      ? new Date(claim.createdAt).toLocaleDateString()
                      : "N/A"}
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